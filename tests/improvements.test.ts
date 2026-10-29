import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { normalizeVariant } from "../src/server/shopify/normalize.ts";
import {
  activeCollections,
  findByIds,
  findPage,
  stageItems,
  publishSnapshot,
} from "../src/server/database/catalog-repository.ts";
import { categoryPage } from "../src/server/database/category-repository.ts";
import { catalogQuerySchema } from "../src/lib/catalog/query.ts";
import { productSearchScore } from "../src/lib/search.ts";
import { cardImage } from "../src/lib/catalog/image.ts";
import { publicCatalogUrl } from "../src/lib/routes.ts";
import { loadSelection } from "../src/lib/quote.ts";
import { ShopifyClient } from "../src/server/shopify/client.ts";

const parent = {
  id: "gid://shopify/Product/1",
  title: "Máscara",
  description: "Descrição",
  productType: "Máscaras",
  vendor: "Marca",
  tags: [],
  status: "ACTIVE",
  onlineStoreUrl: "https://www.pitterpan.com.br/products/mascara",
  updatedAt: "2026-10-28",
};
const variant = (id: number, sku: string | null) => ({
  id: `gid://shopify/ProductVariant/${id}`,
  sku,
  title: "Default Title",
  price: "35.00",
  image: null,
});

test("PostgreSQL preserva SKU compartilhado/vazio, união de coleções e carrinho de variante", async () => {
  const db = new PGlite();
  try {
    const schema = await readFile(
      new URL("../src/server/database/schema.sql", import.meta.url),
      "utf8",
    );
    await db.exec(schema);
    const run = "33333333-3333-4333-8333-333333333333";
    await db.query(
      "INSERT INTO catalog_imports(id,status,store_domain) VALUES($1,'loading','test.myshopify.com')",
      [run],
    );
    const items = [
      normalizeVariant(parent, variant(1, "8936"), ["natal"], [])!,
      normalizeVariant(parent, variant(2, "8936"), ["confeitarias-natal"], [])!,
      normalizeVariant(
        parent,
        variant(3, null),
        ["natal", "confeitarias-natal"],
        [],
      )!,
    ];
    await stageItems(db, run, items);
    await db.query(
      "INSERT INTO catalog_collections(import_id,id,handle,title) VALUES($1,'gid://shopify/Collection/1','natal','Natal')",
      [run],
    );
    // Rodar a migração novamente não altera dados em preparação nem versões existentes.
    await db.exec(schema);
    await db.query("UPDATE catalog_imports SET status='ready' WHERE id=$1", [
      run,
    ]);
    await publishSnapshot(db, run);
    const page = await findPage(db, "natal", catalogQuerySchema.parse({}));
    assert.equal(page.pagination.total, 3);
    assert.equal(new Set(page.products.map((p) => p.id)).size, 3);
    assert.equal(page.products.filter((p) => p.sku === "8936").length, 2);
    assert.equal(
      (await findByIds(db, ["8936"])).length,
      0,
      "SKU ambíguo não escolhe uma variante",
    );
    assert.equal((await findByIds(db, ["shopify-2"]))[0].shopifyVariantId, "2");
    assert.equal(
      (await categoryPage(db, "natal", "", "", 1)).categories[0].count,
      3,
    );
    assert.equal((await activeCollections(db))[0].handle, "natal");
    // Uma nova versão ainda não publicada não muda o manifesto ativo.
    const next = "44444444-4444-4444-8444-444444444444";
    await db.query(
      "INSERT INTO catalog_imports(id,status,store_domain) VALUES($1,'loading','test.myshopify.com')",
      [next],
    );
    await db.query(
      "INSERT INTO catalog_collections(import_id,id,handle,title) VALUES($1,'gid://shopify/Collection/2','carnaval','Carnaval')",
      [next],
    );
    assert.equal((await activeCollections(db)).length, 1);
    assert.equal((await activeCollections(db))[0].handle, "natal");
  } finally {
    await db.close();
  }
});

test("busca por SKU ignora números de descrição e não confunde códigos próximos", () => {
  const p = {
    id: "shopify-8936",
    sku: "29918",
    name: "Maquiagem",
    description: "Referência 8936",
    image: "",
  };
  assert.equal(productSearchScore(p, "8936"), 0);
  assert.equal(productSearchScore({ ...p, sku: "8936" }, "8936"), 1000);
  assert.equal(productSearchScore({ ...p, sku: "89360" }, "8936"), 100);
  assert.equal(productSearchScore({ ...p, sku: "8935" }, "8936"), 0);
  assert.equal(productSearchScore({ ...p, sku: "0008936" }, "0008936"), 1000);
});

test("imagem de card e compartilhamento preservam parâmetros e corrigem domínio legado", () => {
  const image = new URL(
    cardImage("https://cdn.shopify.com/s/files/a.jpg?v=123"),
  );
  assert.equal(image.searchParams.get("width"), "640");
  assert.equal(image.searchParams.get("v"), "123");
  assert.equal(cardImage("/assets/test.webp"), "/assets/test.webp");
  assert.equal(
    cardImage("https://cdn.shopify.com.evil.test/a.jpg"),
    "https://cdn.shopify.com.evil.test/a.jpg",
  );
  assert.equal(
    publicCatalogUrl("natal", "https://pitterpanfestascatalogo.vercel.app/"),
    "https://catalogopitterpanfesta.vercel.app/natal/",
  );
  assert.equal(
    publicCatalogUrl("natal", "https://catalogopitterpanfesta.vercel.app/", {
      hostname: "localhost",
      origin: "http://localhost:3001",
    }),
    "http://localhost:3001/natal/",
  );
});

test("restauração do carrinho descarta dados inválidos e une a mesma variante sem confundir SKUs", () => {
  const selected = loadSelection({
    getItem: () =>
      JSON.stringify([
        { id: "antigo", name: "Máscara", shopifyVariantId: "1", quantity: 998 },
        {
          id: "shopify-1",
          name: "Máscara",
          shopifyVariantId: "1",
          quantity: 4,
        },
        {
          id: "shopify-2",
          name: "Máscara",
          shopifyVariantId: "2",
          sku: "8936",
          quantity: 2,
        },
        { id: "quebrado", name: { wrong: true } },
      ]),
  });
  assert.equal(selected.length, 2);
  assert.equal(selected[0].quantity, 999);
  assert.equal(selected[1].quantity, 2);
  assert.equal(selected[0].image, "");
});

test("Shopify limita tempo de falha em vez de aguardar múltiplos timeouts longos", async (context) => {
  // O teste compara Retry-After com o orçamento; não depende da velocidade do runner.
  context.mock.method(Date, "now", () => 1_793_200_000_000);
  const originalFetch = globalThis.fetch;
  const originalDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const originalToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  try {
    process.env.SHOPIFY_STORE_DOMAIN = "test.myshopify.com";
    process.env.SHOPIFY_ADMIN_ACCESS_TOKEN = "test-only";
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return new Response("", {
        status: 429,
        headers: { "retry-after": "30" },
      });
    };
    await assert.rejects(
      () =>
        new ShopifyClient().query(
          "{shop{currencyCode}}",
          {},
          { timeoutMs: 20 },
        ),
      /ocupada/,
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalDomain === undefined) delete process.env.SHOPIFY_STORE_DOMAIN;
    else process.env.SHOPIFY_STORE_DOMAIN = originalDomain;
    if (originalToken === undefined)
      delete process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
    else process.env.SHOPIFY_ADMIN_ACCESS_TOKEN = originalToken;
  }
});

test("compartilhamento no domínio de gestão mantém o endereço público do catálogo", () => {
  assert.equal(
    publicCatalogUrl(
      "halloween",
      "https://catalogopitterpanfesta.vercel.app/",
      {
        hostname: "gestaopitterpan.vercel.app",
        origin: "https://gestaopitterpan.vercel.app",
      },
    ),
    "https://catalogopitterpanfesta.vercel.app/halloween/",
  );
});
