import { departmentHandles } from "../../lib/catalog/departments.ts";
import type { Product } from "../../types/catalog";
import {
  PAGE_SIZE,
  searchQuery,
  type CatalogQuery,
} from "../../lib/catalog/query.ts";
export interface SqlClient {
  query<R extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    values?: unknown[],
  ): Promise<{ rows: R[] }>;
}
export type ItemRow = {
  id: string;
  sku?: string | null;
  variant_id: string;
  product_id: string;
  name: string;
  description: string;
  category: string;
  vendor: string;
  image_url: string | null;
  site_url: string;
  collections: string[];
  tags: string[];
  images: { url: string; altText?: string | null }[];
  search_text: string;
  updated_at: string;
  inventory_quantity: number | null;
  price: string;
  compare_at_price: string | null;
  currency: string;
};
export function toProduct(row: ItemRow): Product {
  return {
    id: `shopify-${row.variant_id}`,
    sku: row.sku ?? row.id,
    shopifyProductId: row.product_id,
    collections: row.collections,
    inventoryQuantity: row.inventory_quantity,
    price: row.price,
    compareAtPrice: row.compare_at_price || undefined,
    currency: row.currency,
    vendor: row.vendor,
    name: row.name,
    description: row.description,
    category: row.category,
    image: row.image_url
      ? `/api/product-image/${row.variant_id}/?v=${encodeURIComponent(row.updated_at)}`
      : "/assets/images/brand/product-placeholder.svg",
    siteUrl: row.site_url,
    shopifyVariantId: row.variant_id,
  };
}
export async function activeSnapshot(db: SqlClient) {
  const { rows } = await db.query<{ active_import: string | null }>(
    "SELECT active_import FROM catalog_state WHERE singleton=true",
  );
  if (!rows[0]?.active_import)
    throw new Error("O banco ainda não tem uma importação publicada.");
  return rows[0].active_import;
}
export async function findPage(
  db: SqlClient,
  slug: string,
  query: CatalogQuery,
) {
  const snapshot = await activeSnapshot(db);
  const values = [
    snapshot,
    slug === "todos" ? null : [...new Set([slug, ...departmentHandles(slug)])],
    searchQuery(query.q),
    query.category,
    query.vendor,
  ];
  const where = `import_id=$1 AND ($2::text[] IS NULL OR collections && $2::text[])
    AND ($3='' OR to_tsvector('simple',search_text) @@ to_tsquery('simple',$3))
    AND ($4='' OR category=$4) AND ($5='' OR vendor=$5)`;
  const count = await db.query<{ total: string }>(
    `SELECT count(*)::text AS total FROM catalog_items WHERE ${where}`,
    values,
  );
  const total = Number(count.rows[0].total);
  const page = Math.min(query.page, Math.max(1, Math.ceil(total / PAGE_SIZE)));
  const result = await db.query<ItemRow>(
    `SELECT * FROM catalog_items WHERE ${where} ORDER BY ${query.sort === "price-asc" ? "price ASC,id" : query.sort === "price-desc" ? "price DESC,id" : "name,id"} LIMIT $6 OFFSET $7`,
    [...values, PAGE_SIZE, (page - 1) * PAGE_SIZE],
  );
  const facets = await db.query<{ category: string; total: string }>(
    `SELECT category,count(*)::text AS total FROM catalog_items WHERE import_id=$1 AND ($2::text[] IS NULL OR collections && $2::text[]) AND category<>'' GROUP BY category ORDER BY count(*) DESC,category LIMIT 200`,
    [
      snapshot,
      slug === "todos"
        ? null
        : [...new Set([slug, ...departmentHandles(slug)])],
    ],
  );
  const brands = await db.query<{ vendor: string }>(
    "SELECT DISTINCT vendor FROM catalog_items WHERE import_id=$1 AND ($2::text[] IS NULL OR collections && $2::text[]) AND vendor<>'' ORDER BY vendor LIMIT 1000",
    [
      snapshot,
      slug === "todos"
        ? null
        : [...new Set([slug, ...departmentHandles(slug)])],
    ],
  );
  return {
    products: result.rows.map(toProduct),
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total,
      pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      vendors: brands.rows.map((row) => row.vendor),
      categories: facets.rows.map(({ category, total }) => ({
        name: category,
        count: Number(total),
      })),
    },
  };
}
export async function findByIds(db: SqlClient, ids: string[]) {
  const snapshot = await activeSnapshot(db);
  const { rows } = await db.query<ItemRow>(
    "SELECT * FROM catalog_items WHERE import_id=$1 AND (id=ANY($2::text[]) OR ('shopify-'||variant_id)=ANY($2::text[]) OR sku=ANY($2::text[]))",
    [snapshot, ids],
  );
  return ids.flatMap((id) => {
    const canonical = /^shopify-[1-9]\d*$/.test(id);
    const matches = rows.filter((row) =>
      canonical
        ? `shopify-${row.variant_id}` === id
        : row.id === id || row.sku === id,
    );
    // SKU compartilhado nunca é escolhido arbitrariamente para um carrinho legado.
    return matches.length === 1 ? [{ ...toProduct(matches[0]), id }] : [];
  });
}
export async function stageItems(db: SqlClient, run: string, items: ItemRow[]) {
  if (!items.length) return;
  await db.query(
    `INSERT INTO catalog_items(import_id,id,variant_id,product_id,name,description,category,vendor,image_url,site_url,collections,tags,images,search_text,updated_at,inventory_quantity,price,compare_at_price,currency,sku)
    SELECT $1,x.* FROM jsonb_to_recordset($2::jsonb) AS x(id text,variant_id text,product_id text,name text,description text,category text,vendor text,image_url text,site_url text,collections text[],tags text[],images jsonb,search_text text,updated_at text,inventory_quantity integer,price numeric,compare_at_price numeric,currency text,sku text)`,
    [run, JSON.stringify(items)],
  );
}
/** Ponteiro trocado sob lock: visitantes veem a versão anterior ou a nova, nunca metade. */
export async function publishSnapshot(
  db: SqlClient,
  run: string,
  allowShrink = false,
) {
  await db.query("BEGIN");
  try {
    const state = await db.query<{ active_import: string | null }>(
      "SELECT active_import FROM catalog_state WHERE singleton=true FOR UPDATE",
    );
    const info = await db.query<{
      status: string;
      total: string;
      store_domain: string;
    }>(
      "SELECT status,store_domain,(SELECT count(*)::text FROM catalog_items WHERE import_id=$1) AS total FROM catalog_imports WHERE id=$1 FOR UPDATE",
      [run],
    );
    if (info.rows[0]?.status !== "ready")
      throw new Error("Só uma importação validada (ready) pode ser publicada.");
    const total = Number(info.rows[0].total);
    if (!total) throw new Error("Importação vazia: publicação bloqueada.");
    const old = state.rows[0]?.active_import;
    if (old) {
      const result = await db.query<{ total: string }>(
        "SELECT count(*)::text AS total FROM catalog_items WHERE import_id=$1",
        [old],
      );
      if (!allowShrink && total < Number(result.rows[0].total) * 0.8)
        throw new Error(
          "Queda superior a 20%: revise o relatório antes de usar --allow-shrink.",
        );
      const oldShop = await db.query<{ store_domain: string }>(
        "SELECT store_domain FROM catalog_imports WHERE id=$1",
        [old],
      );
      if (oldShop.rows[0].store_domain !== info.rows[0].store_domain)
        throw new Error("A loja difere da versão ativa. Publicação bloqueada.");
      const lost = await db.query<{ collection: string }>(
        `WITH counts AS (
        SELECT import_id,unnest(collections) AS collection,count(*) AS total FROM catalog_items WHERE import_id=ANY($1::uuid[]) GROUP BY import_id,unnest(collections)
      ) SELECT a.collection FROM counts a LEFT JOIN counts b ON b.import_id=$3 AND b.collection=a.collection WHERE a.import_id=$2 AND COALESCE(b.total,0)<a.total*0.8`,
        [[old, run], old, run],
      );
      if (!allowShrink && lost.rows.length)
        throw new Error(
          "Queda superior a 20% em uma coleção: revise o mapeamento antes de usar --allow-shrink.",
        );
      await db.query(
        "UPDATE catalog_imports SET status='retired' WHERE id=$1",
        [old],
      );
    }
    await db.query(
      "UPDATE catalog_imports SET status='active',completed_at=now() WHERE id=$1",
      [run],
    );
    await db.query(
      "UPDATE catalog_state SET active_import=$1 WHERE singleton=true",
      [run],
    );
    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}

/** Só expõe o manifesto pertencente à mesma versão publicada dos produtos. */
export async function activeCollections(db: SqlClient) {
  const snapshot = await activeSnapshot(db);
  const { rows } = await db.query<{
    id: string;
    handle: string;
    title: string;
  }>(
    "SELECT id,handle,title FROM catalog_collections WHERE import_id=$1 ORDER BY title,handle",
    [snapshot],
  );
  return rows;
}
