import { readAnalytics } from "./analytics";
import { requireSession } from "../auth/session";
import { cache } from "react";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { database } from "../database/client";
import {
  departmentHandles,
  storefrontNavigation,
} from "../../lib/catalog/departments";
import { getManifest, getConfig } from "../catalogs";
import { moneyToMinor } from "../../lib/money";
import type { Product } from "../../types/catalog";
export type AdminProduct = Product & { inventoryQuantity: number | null };
export type AdminSummary = {
  products: number;
  variants: number;
  categories: number;
  brands: number;
  offers: number;
  low: number;
  high: number;
  out: number;
  unknown: number;
  units: number;
};
export type ImportRun = {
  id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  report: {
    products?: number;
    variants?: number;
    missingImages?: number;
    unassigned?: number;
  };
};
export type AdminContext = {
  source: "postgres" | "json" | "pending";
  notice: string | null;
  active: string | null;
  previous: string | null;
  settings: { low: number; high: number };
  summary: AdminSummary | null;
  categories: { name: string; count: number }[];
  runs: ImportRun[];
  changes: { added: number; removed: number; changed: number } | null;
};
export const settingsDefaults = { low: 5, high: 100 };
const summaryEmpty: AdminSummary = {
  products: 0,
  variants: 0,
  categories: 0,
  brands: 0,
  offers: 0,
  low: 0,
  high: 0,
  out: 0,
  unknown: 0,
  units: 0,
};
export const localProducts = cache(async () => {
  const manifest = JSON.parse(
    await readFile(
      join(process.cwd(), "public/data/catalogs/manifest.json"),
      "utf8",
    ),
  );
  const catalogs = await Promise.all(
    manifest.catalogs.map(async ({ slug }: { slug: string }) =>
      JSON.parse(
        await readFile(
          join(process.cwd(), `public/data/catalogs/${slug}.json`),
          "utf8",
        ),
      ),
    ),
  );
  return catalogs.flatMap((c) =>
    c.products.map((p: Product) => ({
      ...p,
      inventoryQuantity: p.inventoryQuantity ?? null,
    })),
  ) as AdminProduct[];
});
export function summarize(
  products: AdminProduct[],
  settings = settingsDefaults,
): AdminSummary {
  return {
    ...summaryEmpty,
    products: new Set(products.map((p) => p.shopifyProductId || p.id)).size,
    variants: products.length,
    categories: new Set(products.map((p) => p.category).filter(Boolean)).size,
    brands: new Set(products.map((p) => p.vendor).filter(Boolean)).size,
    offers: products.filter(
      (p) =>
        p.price !== undefined &&
        p.compareAtPrice &&
        moneyToMinor(p.compareAtPrice) > moneyToMinor(p.price),
    ).length,
    low: products.filter(
      (p) =>
        p.inventoryQuantity !== null &&
        p.inventoryQuantity > 0 &&
        p.inventoryQuantity <= settings.low,
    ).length,
    high: products.filter(
      (p) =>
        p.inventoryQuantity !== null && p.inventoryQuantity >= settings.high,
    ).length,
    out: products.filter(
      (p) => p.inventoryQuantity !== null && p.inventoryQuantity <= 0,
    ).length,
    unknown: products.filter((p) => p.inventoryQuantity === null).length,
    units: products.reduce(
      (n, p) => n + Math.max(0, p.inventoryQuantity || 0),
      0,
    ),
  };
}
/** Cada indicador usa a mesma versão publicada; não consulta 13 mil itens na Shopify. */
export const adminContext = cache(async (): Promise<AdminContext> => {
  await requireSession();
  if (process.env.DATABASE_URL) {
    try {
      return await readAnalytics(database());
    } catch {
      return {
        source: "pending",
        notice:
          "O painel aguarda uma importação publicada e a preparação do banco. Nenhum indicador é estimado.",
        active: null,
        previous: null,
        settings: settingsDefaults,
        summary: null,
        categories: [],
        runs: [],
        changes: null,
      };
    }
  }
  if ((process.env.CATALOG_DATA_SOURCE || "json") === "json") {
    const products = await localProducts();
    const counts = new Map<string, number>();
    for (const p of products)
      counts.set(
        p.category || "Sem categoria",
        (counts.get(p.category || "Sem categoria") || 0) + 1,
      );
    return {
      source: "json",
      notice:
        "Dados dos arquivos locais. Estoque e histórico só aparecem quando informados pela integração.",
      active: null,
      previous: null,
      settings: settingsDefaults,
      summary: summarize(products),
      categories: [...counts]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6),
      runs: [],
      changes: null,
    };
  }
  return {
    source: "pending",
    notice:
      "Conecte o banco e publique a primeira importação para acompanhar a loja completa. Os catálogos públicos continuam na fonte atual.",
    active: null,
    previous: null,
    settings: settingsDefaults,
    summary: null,
    categories: [],
    runs: [],
    changes: null,
  };
});
export const adminQuerySchema = z.object({
  q: z.string().trim().max(120).default(""),
  category: z.string().max(200).default(""),
  vendor: z.string().max(200).default(""),
  stock: z.enum(["all", "low", "high", "out", "unknown"]).default("all"),
  offers: z.enum(["0", "1"]).default("0"),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
export type AdminQuery = z.infer<typeof adminQuerySchema>;
const selectProduct =
  '\'shopify-\'||variant_id AS id,COALESCE(sku,id) AS sku,name,description,category,vendor,price::text,compare_at_price::text AS "compareAtPrice",currency,image_url AS image,inventory_quantity AS "inventoryQuantity",variant_id AS "shopifyVariantId",site_url AS "siteUrl"';
export async function adminProducts(input: AdminQuery) {
  const context = await adminContext();
  if (context.source === "pending")
    return { products: [] as AdminProduct[], total: 0, pages: 1, page: 1 };
  if (context.source === "json") {
    const products = (await localProducts()).filter(
      (p) =>
        [p.name, p.sku || p.id, p.vendor]
          .join(" ")
          .toLowerCase()
          .includes(input.q.toLowerCase()) &&
        (!input.category || p.category === input.category) &&
        (!input.vendor || p.vendor === input.vendor) &&
        (input.offers !== "1" ||
          (p.price !== undefined &&
            p.compareAtPrice &&
            moneyToMinor(p.compareAtPrice) > moneyToMinor(p.price))) &&
        (input.stock === "all" ||
          (input.stock === "unknown"
            ? p.inventoryQuantity === null
            : input.stock === "low"
              ? p.inventoryQuantity !== null &&
                p.inventoryQuantity > 0 &&
                p.inventoryQuantity <= context.settings.low
              : input.stock === "high"
                ? p.inventoryQuantity !== null &&
                  p.inventoryQuantity >= context.settings.high
                : p.inventoryQuantity !== null && p.inventoryQuantity <= 0)),
    );
    const pages = Math.max(1, Math.ceil(products.length / 20));
    const page = Math.min(input.page, pages);
    return {
      products: products.slice((page - 1) * 20, page * 20),
      total: products.length,
      pages,
      page,
    };
  }
  const values = [
    context.active,
    `%${input.q.replace(/[\\%_]/g, "\\$&")}%`,
    input.category,
    input.vendor,
    input.offers,
    input.stock,
    context.settings.low,
    context.settings.high,
  ];
  const where = `import_id=$1 AND (name ILIKE $2 OR COALESCE(sku,id) ILIKE $2 OR vendor ILIKE $2) AND ($3='' OR category=$3) AND ($4='' OR vendor=$4) AND ($5='0' OR compare_at_price>price)
 AND ($6='all' OR ($6='unknown' AND inventory_quantity IS NULL) OR ($6='out' AND inventory_quantity<=0) OR ($6='low' AND inventory_quantity>0 AND inventory_quantity<=$7) OR ($6='high' AND inventory_quantity>=$8))`;
  const count = await database().query<{ total: string }>(
    `SELECT count(*)::text AS total FROM catalog_items WHERE ${where}`,
    values,
  );
  const total = Number(count.rows[0].total),
    pages = Math.max(1, Math.ceil(total / 20)),
    page = Math.min(input.page, pages);
  const { rows } = await database().query<AdminProduct>(
    `SELECT ${selectProduct} FROM catalog_items WHERE ${where} ORDER BY name,variant_id LIMIT 20 OFFSET $9`,
    [...values, (page - 1) * 20],
  );
  return {
    products: rows.map((p) => ({
      ...p,
      image: p.image || "/assets/images/brand/product-placeholder.svg",
    })),
    total,
    pages,
    page,
  };
}
export async function adminChanges(page: number) {
  const context = await adminContext();
  if (!context.active || !context.previous)
    return { items: [], total: 0, pages: 1, page: 1 };
  const sql = `WITH a AS(SELECT * FROM catalog_items WHERE import_id=$1),b AS(SELECT * FROM catalog_items WHERE import_id=$2)
 SELECT COALESCE(a.variant_id,b.variant_id) AS id,COALESCE(a.name,b.name) AS name,COALESCE(a.sku,b.sku,a.id,b.id) AS sku,
 CASE WHEN b.variant_id IS NULL THEN 'added' WHEN a.variant_id IS NULL THEN 'removed' ELSE 'changed' END AS kind,
 a.price::text AS price,b.price::text AS old_price,a.inventory_quantity AS stock,b.inventory_quantity AS old_stock
 FROM a FULL JOIN b USING(variant_id) WHERE a.variant_id IS NULL OR b.variant_id IS NULL OR ROW(a.name,a.price,a.inventory_quantity,a.image_url,a.category) IS DISTINCT FROM ROW(b.name,b.price,b.inventory_quantity,b.image_url,b.category)`;
  const total = Object.values(context.changes!).reduce((a, b) => a + b, 0),
    pages = Math.max(1, Math.ceil(total / 20));
  page = Math.min(page, pages);
  const { rows } = await database().query<{
    id: string;
    name: string;
    sku: string;
    kind: string;
    price: string | null;
    old_price: string | null;
    stock: number | null;
    old_stock: number | null;
  }>(`${sql} ORDER BY kind,name,id LIMIT 20 OFFSET $3`, [
    context.active,
    context.previous,
    (page - 1) * 20,
  ]);
  return { items: rows, total, pages, page };
}
export async function adminCatalogs() {
  await requireSession();
  const context = await adminContext();
  const manifest = await getManifest();
  const summaries =
    context.source === "json" ? manifest : storefrontNavigation(manifest);
  const config = await getConfig();
  let counts = new Map<string, number>();
  if (context.active) {
    const links = summaries.map((c) => ({
      slug: c.slug,
      handles: [...new Set([c.slug, ...departmentHandles(c.slug)])],
    }));
    const { rows } = await database().query<{ slug: string; total: string }>(
      `SELECT c.slug,count(i.variant_id)::text AS total FROM jsonb_to_recordset($2::jsonb) AS c(slug text,handles text[]) LEFT JOIN catalog_items i ON i.import_id=$1 AND(c.slug='todos' OR i.collections&&c.handles) GROUP BY c.slug`,
      [context.active, JSON.stringify(links)],
    );
    counts = new Map(rows.map((r) => [r.slug, Number(r.total)]));
  }
  return {
    items: summaries.map((c) => ({ ...c, count: counts.get(c.slug) ?? null })),
    base: config.catalog.publicBaseUrl.replace(
      "pitterpanfestascatalogo.vercel.app",
      "catalogopitterpanfesta.vercel.app",
    ),
  };
}
