import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { createInterface } from "node:readline";
import { z } from "zod";
import { database } from "../database/client.ts";
import { ShopifyClient, BULK_PRODUCTS_QUERY } from "../shopify/client.ts";
import { normalizeVariant } from "../shopify/normalize.ts";
import { stageItems, publishSnapshot } from "../database/catalog-repository.ts";
import { progress } from "./jobs.ts";
const mappingSchema = z.object({
  mappings: z.array(
    z.object({
      catalogSlug: z.string().regex(/^[a-z0-9-]+$/),
      collectionId: z.string().regex(/^gid:\/\/shopify\/Collection\/[1-9]\d*$/),
    }),
  ),
});
export async function beginCatalog(id: string) {
  const db = database(),
    shop = new ShopifyClient();
  const mapping = mappingSchema.parse(
    JSON.parse(
      await readFile(
        join(process.cwd(), "config/shopify-collections.json"),
        "utf8",
      ),
    ),
  ).mappings;
  const { shop: info } = await shop.query<{ shop: { currencyCode: string } }>(
    "{shop{currencyCode}}",
  );
  if (info.currencyCode !== "BRL") throw new Error("Moeda não suportada.");
  await db.query(
    "INSERT INTO catalog_imports(id,status,store_domain,mapping) VALUES($1,'loading',$2,$3) ON CONFLICT DO NOTHING",
    [id, shop.domain, JSON.stringify(mapping)],
  );
  const old = await db.query<{ operation_id: string | null }>(
    "SELECT operation_id FROM catalog_imports WHERE id=$1",
    [id],
  );
  if (old.rows[0].operation_id) return;
  const data = await shop.query<{
    bulkOperationRunQuery: {
      bulkOperation: { id: string } | null;
      userErrors: unknown[];
    };
  }>(
    `mutation($query:String!){bulkOperationRunQuery(query:$query){bulkOperation{id}userErrors{field message}}}`,
    { query: BULK_PRODUCTS_QUERY },
  );
  if (
    data.bulkOperationRunQuery.userErrors.length ||
    !data.bulkOperationRunQuery.bulkOperation
  )
    throw new Error("Exportação indisponível.");
  await db.query("UPDATE catalog_imports SET operation_id=$2 WHERE id=$1", [
    id,
    data.bulkOperationRunQuery.bulkOperation.id,
  ]);
  await progress(id, "export");
}
export async function catalogReady(id: string) {
  const db = database(),
    shop = new ShopifyClient();
  const row = await db.query<{ operation_id: string }>(
    "SELECT operation_id FROM catalog_imports WHERE id=$1",
    [id],
  );
  const { node } = await shop.query<{
    node: { status: string; objectCount: string } | null;
  }>(`query($id:ID!){node(id:$id){... on BulkOperation{status objectCount}}}`, {
    id: row.rows[0]?.operation_id,
  });
  if (!node || ["FAILED", "CANCELED", "EXPIRED"].includes(node.status))
    throw new Error("Exportação interrompida.");
  await progress(id, "export", { records: Number(node.objectCount) || 0 });
  return node.status === "COMPLETED";
}
export async function downloadCatalog(id: string) {
  const db = database(),
    shop = new ShopifyClient();
  const row = await db.query<{ operation_id: string }>(
    "SELECT operation_id FROM catalog_imports WHERE id=$1",
    [id],
  );
  const { node } = await shop.query<{
    node: { status: string; url: string | null } | null;
  }>(`query($id:ID!){node(id:$id){... on BulkOperation{status url}}}`, {
    id: row.rows[0]?.operation_id,
  });
  if (
    node?.status !== "COMPLETED" ||
    !node.url ||
    new URL(node.url).protocol !== "https:"
  )
    throw new Error("Exportação não concluída.");
  await progress(id, "download");
  const response = await fetch(node.url, {
    signal: AbortSignal.timeout(180000),
  });
  if (!response.ok || !response.body) throw new Error("Download indisponível.");
  await db.query("DELETE FROM catalog_raw WHERE import_id=$1", [id]);
  const lines = createInterface({
    input: Readable.fromWeb(
      response.body as Parameters<typeof Readable.fromWeb>[0],
    ),
    crlfDelay: Infinity,
  });
  let batch: { line: number; data: unknown }[] = [],
    line = 0;
  const flush = async () => {
    if (!batch.length) return;
    await db.query(
      "INSERT INTO catalog_raw(import_id,line,data) SELECT $1,x.line,x.data FROM jsonb_to_recordset($2::jsonb) AS x(line bigint,data jsonb)",
      [id, JSON.stringify(batch)],
    );
    batch = [];
  };
  for await (const text of lines) {
    if (!text.trim()) continue;
    if (text.length > 5_000_000 || ++line > 2_000_000)
      throw new Error("Exportação excede limite.");
    batch.push({ line, data: JSON.parse(text) });
    if (batch.length === 500) await flush();
  }
  await flush();
  if (!line) throw new Error("Exportação vazia.");
  const legacy = await db.query(
    "SELECT 1 FROM catalog_raw WHERE import_id=$1 AND data->>'id' LIKE 'gid://shopify/Collection/%' AND COALESCE(data->>'handle','')='' LIMIT 1",
    [id],
  );
  if (legacy.rows.length) throw new Error("Coleção incompleta.");
  await db.query("DELETE FROM catalog_collections WHERE import_id=$1", [id]);
  await db.query(
    `INSERT INTO catalog_collections(import_id,id,handle,title) SELECT $1,data->>'id',data->>'handle',data->>'title' FROM catalog_raw WHERE import_id=$1 AND data->>'id' LIKE 'gid://shopify/Collection/%' AND COALESCE(data->>'handle','')<>'' GROUP BY data->>'id',data->>'handle',data->>'title'`,
    [id],
  );
  await progress(id, "products", { records: line });
}
export async function normalizeCatalogPage(id: string, cursor: number) {
  const db = database();
  const mappings = (
    await db.query<{
      mapping: { catalogSlug: string; collectionId: string }[];
    }>("SELECT mapping FROM catalog_imports WHERE id=$1", [id])
  ).rows[0].mapping;
  const collections = (
    await db.query<{ id: string; handle: string }>(
      "SELECT id,handle FROM catalog_collections WHERE import_id=$1",
      [id],
    )
  ).rows;
  const handles = new Map(collections.map((c) => [c.id, c.handle]));
  const { rows } = await db.query(
    `SELECT v.line,v.data AS variant,p.data AS product,
 COALESCE((SELECT jsonb_agg(c.data->>'id') FROM catalog_raw c WHERE c.import_id=v.import_id AND c.data->>'__parentId'=v.data->>'__parentId' AND c.data->>'id' LIKE 'gid://shopify/Collection/%'),'[]') AS collection_ids,
 COALESCE((SELECT jsonb_agg(m.data->'image') FROM catalog_raw m WHERE m.import_id=v.import_id AND m.data->>'__parentId'=v.data->>'__parentId' AND m.data->'image' IS NOT NULL AND m.data->'image'<>'null'::jsonb AND m.data->>'id' LIKE 'gid://shopify/MediaImage/%'),'[]') AS images
 FROM catalog_raw v LEFT JOIN catalog_raw p ON p.import_id=v.import_id AND p.data->>'id'=v.data->>'__parentId' AND NOT(p.data ? '__parentId') WHERE v.import_id=$1 AND v.line>$2 AND v.data->>'id' LIKE 'gid://shopify/ProductVariant/%' ORDER BY v.line LIMIT 250`,
    [id, cursor],
  );
  if (!rows.length) return { done: true, cursor };
  const items = rows
    .map((row) => {
      if (!row.product) throw new Error("Produto pai ausente.");
      const ids = row.collection_ids as string[];
      return normalizeVariant(
        row.product,
        row.variant,
        [
          ...new Set([
            ...ids.flatMap((c) => (handles.has(c) ? [handles.get(c)!] : [])),
            ...mappings
              .filter((m) => ids.includes(m.collectionId))
              .map((m) => m.catalogSlug),
          ]),
        ],
        row.images,
      );
    })
    .filter((x) => x !== null);
  const connection = await db.connect();
  try {
    await connection.query("BEGIN");
    await connection.query(
      "DELETE FROM catalog_items WHERE import_id=$1 AND variant_id=ANY($2::text[])",
      [id, items.map((i) => i.variant_id)],
    );
    await stageItems(connection, id, items);
    await connection.query("COMMIT");
  } catch (e) {
    await connection.query("ROLLBACK");
    throw e;
  } finally {
    connection.release();
  }
  const count = await db.query<{ n: string }>(
    "SELECT count(*)::text AS n FROM catalog_items WHERE import_id=$1",
    [id],
  );
  await progress(id, "products", { variants: Number(count.rows[0].n) });
  return { done: false, cursor: Number(rows.at(-1)!.line) };
}
export async function completeCatalog(id: string) {
  const db = database();
  const state = await db.query<{
    status: string;
    base_import: string | null;
    import_status: string;
  }>(
    "SELECT j.status,j.base_import,i.status AS import_status FROM pitterpan_sync_jobs j JOIN catalog_imports i ON i.id=j.id WHERE j.id=$1",
    [id],
  );
  if (state.rows[0]?.status !== "running")
    throw new Error("Execução encerrada.");
  if (state.rows[0].import_status === "active") return;
  const totals = await db.query(
    `SELECT count(DISTINCT product_id)::int AS products,count(*)::int AS variants,count(*) FILTER(WHERE image_url IS NULL)::int AS "missingImages",count(*) FILTER(WHERE cardinality(collections)=0)::int AS unassigned FROM catalog_items WHERE import_id=$1`,
    [id],
  );
  if (!totals.rows[0]?.variants) throw new Error("Nenhuma variante válida.");
  const counts = await db.query<{ slug: string; n: string }>(
    "SELECT unnest(collections) AS slug,count(*)::text AS n FROM catalog_items WHERE import_id=$1 GROUP BY unnest(collections)",
    [id],
  );
  await db.query(
    "UPDATE catalog_imports SET status='ready',completed_at=now(),report=$2 WHERE id=$1 AND status='loading'",
    [
      id,
      JSON.stringify({
        ...totals.rows[0],
        collections: Object.fromEntries(
          counts.rows.map((r) => [r.slug, Number(r.n)]),
        ),
      }),
    ],
  );
  await progress(id, "publish");
  const connection = await db.connect();
  try {
    await publishSnapshot(connection, id, false, state.rows[0].base_import);
  } finally {
    connection.release();
  }
}
