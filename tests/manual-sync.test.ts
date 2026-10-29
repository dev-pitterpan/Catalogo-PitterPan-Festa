import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";
import {
  stageItems,
  publishSnapshot,
  type ItemRow,
} from "../src/server/database/catalog-repository.ts";
import {
  ensureJobs,
  reserveJob,
  syncStatus,
  progress,
  failJob,
} from "../src/server/sync/jobs.ts";
import {
  beginCatalog,
  catalogReady,
  downloadCatalog,
  normalizeCatalogPage,
  completeCatalog,
} from "../src/server/sync/catalog.ts";
const id = "11111111-1111-4111-8111-111111111111",
  id2 = "22222222-2222-4222-8222-222222222222";
test("sincronização mantém exclusividade, retoma lotes e publica somente a versão completa", async () => {
  const db = new PGlite(),
    originalFetch = globalThis.fetch,
    environment = { ...process.env };
  const globalPool = globalThis as typeof globalThis & { catalogPool?: Pool };
  const previousPool = globalPool.catalogPool;
  try {
    await db.exec(
      await readFile(
        new URL("../src/server/database/schema.sql", import.meta.url),
        "utf8",
      ),
    );
    const adapter = {
      query: db.query.bind(db),
      connect: async () => ({ ...adapter, release() {} }),
    };
    globalPool.catalogPool = adapter as unknown as Pool;
    process.env.DATABASE_URL = "fixture";
    process.env.SHOPIFY_STORE_DOMAIN = "test.myshopify.com";
    process.env.SHOPIFY_ADMIN_ACCESS_TOKEN = "fixture";
    await ensureJobs(adapter);
    assert.equal(await reserveJob(adapter, "admin@example.test", id), id);
    assert.equal(await reserveJob(adapter, "another@example.test", id2), null);
    const parent = {
      id: "gid://shopify/Product/1",
      title: "Produto teste",
      description: "Descrição",
      productType: "Festa",
      vendor: "Pitter",
      tags: [],
      status: "ACTIVE",
      onlineStoreUrl: "https://example.test/products/test",
      updatedAt: "2026-10-29T12:00:00Z",
    };
    const variant = (n: number) => ({
      id: `gid://shopify/ProductVariant/${n}`,
      __parentId: parent.id,
      price: "10.00",
      compareAtPrice: null,
      sku: `SKU-${n}`,
      title: `Variante ${n}`,
      inventoryQuantity: n,
    });
    const jsonl = [parent, variant(1), variant(2)]
      .map((x) => JSON.stringify(x))
      .join("\n");
    let complete = false;
    globalThis.fetch = async (input, options) => {
      if (String(input) === "https://storage.example.test/export")
        return new Response(jsonl);
      const query = JSON.parse(String(options?.body)).query as string;
      const data = query.includes("currencyCode")
        ? { shop: { currencyCode: "BRL" } }
        : query.includes("bulkOperationRunQuery")
          ? {
              bulkOperationRunQuery: {
                bulkOperation: { id: "gid://shopify/BulkOperation/1" },
                userErrors: [],
              },
            }
          : {
              node: {
                status: complete ? "COMPLETED" : "RUNNING",
                objectCount: "3",
                url: complete ? "https://storage.example.test/export" : null,
              },
            };
      return Response.json({ data });
    };
    await beginCatalog(id);
    assert.equal(await catalogReady(id), false);
    await assert.rejects(downloadCatalog(id));
    assert.equal((await syncStatus(adapter)).lastUpdated, null);
    complete = true;
    assert.equal(await catalogReady(id), true);
    await downloadCatalog(id);
    const page = await normalizeCatalogPage(id, 0);
    assert.equal(page.done, false);
    await normalizeCatalogPage(id, 0); // retry after an acknowledged batch write must not duplicate variants
    assert.equal(
      (
        await db.query<{ n: number }>(
          "SELECT count(*)::int AS n FROM catalog_items WHERE import_id=$1",
          [id],
        )
      ).rows[0].n,
      2,
    );
    assert.equal((await normalizeCatalogPage(id, page.cursor)).done, true);
    assert.equal(
      (
        await db.query<{ active_import: string | null }>(
          "SELECT active_import FROM catalog_state",
        )
      ).rows[0].active_import,
      null,
    );
    await completeCatalog(id);
    await completeCatalog(id); // retry publication after the pointer already changed
    assert.equal(
      (
        await db.query<{ active_import: string | null }>(
          "SELECT active_import FROM catalog_state",
        )
      ).rows[0].active_import,
      id,
    );
    await failJob(id, "Interrompido");
    await assert.rejects(progress(id, "products"));
    assert.equal(await reserveJob(adapter, "admin@example.test", id2), id2);
    await db.query(
      "INSERT INTO catalog_imports(id,status,store_domain) VALUES($1,'loading','test.myshopify.com')",
      [id2],
    );
    await progress(id2, "products");
    await assert.rejects(completeCatalog(id2));
    assert.equal(
      (
        await db.query<{ active_import: string | null }>(
          "SELECT active_import FROM catalog_state",
        )
      ).rows[0].active_import,
      id,
    );
    const third = "33333333-3333-4333-8333-333333333333";
    const items = (
      await db.query<ItemRow>(
        "SELECT * FROM catalog_items WHERE import_id=$1",
        [id],
      )
    ).rows;
    await stageItems(adapter, id2, items);
    await db.query(
      "INSERT INTO catalog_imports(id,status,store_domain) VALUES($1,'ready','test.myshopify.com')",
      [third],
    );
    await stageItems(adapter, third, items);
    await publishSnapshot(adapter, third);
    await assert.rejects(completeCatalog(id2), /versão ativa mudou/);
    assert.equal(
      (
        await db.query<{ active_import: string | null }>(
          "SELECT active_import FROM catalog_state",
        )
      ).rows[0].active_import,
      third,
    );
  } finally {
    globalThis.fetch = originalFetch;
    globalPool.catalogPool = previousPool;
    for (const key of Object.keys(process.env))
      if (!(key in environment)) delete process.env[key];
    Object.assign(process.env, environment);
    await db.close();
  }
});
