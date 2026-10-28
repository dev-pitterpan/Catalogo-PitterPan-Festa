import {
  activeSnapshot,
  type SqlClient,
} from "../database/catalog-repository.ts";
import type { AdminContext, AdminSummary, ImportRun } from "./repository.ts";
const settingsDefaults = { low: 5, high: 100 };
const summaryEmpty = {
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
export async function readSettings(db: SqlClient) {
  const { rows } = await db.query<{ low_stock: number; high_stock: number }>(
    "SELECT low_stock,high_stock FROM pitterpan_admin_settings WHERE singleton=true",
  );
  return rows[0]
    ? { low: rows[0].low_stock, high: rows[0].high_stock }
    : settingsDefaults;
}

export async function readAnalytics(db: SqlClient): Promise<AdminContext> {
  const active = await activeSnapshot(db);
  const settings = await readSettings(db);
  const [totals, categoryResult, history] = await Promise.all([
    db.query<Record<string, string>>(
      `SELECT count(DISTINCT product_id)::text AS products,count(*)::text AS variants,count(DISTINCT category)::text AS categories,count(DISTINCT NULLIF(vendor,''))::text AS brands,
     count(*) FILTER(WHERE compare_at_price>price)::text AS offers,
     count(*) FILTER(WHERE inventory_quantity>0 AND inventory_quantity<=$2)::text AS low,
     count(*) FILTER(WHERE inventory_quantity>=$3)::text AS high,
     count(*) FILTER(WHERE inventory_quantity<=0)::text AS out,
     count(*) FILTER(WHERE inventory_quantity IS NULL)::text AS unknown,
     COALESCE(sum(GREATEST(inventory_quantity,0)),0)::text AS units
     FROM catalog_items WHERE import_id=$1`,
      [active, settings.low, settings.high],
    ),
    db.query<{ name: string; count: string }>(
      "SELECT category AS name,count(*)::text AS count FROM catalog_items WHERE import_id=$1 GROUP BY category ORDER BY count(*) DESC,category LIMIT 6",
      [active],
    ),
    db.query<ImportRun>(
      "SELECT id,status,started_at::text,completed_at::text,report FROM catalog_imports ORDER BY started_at DESC LIMIT 20",
    ),
  ]);
  const previousResult = await db.query<{ id: string }>(
    "SELECT id FROM catalog_imports WHERE status='retired' AND id<>$1 ORDER BY completed_at DESC NULLS LAST,started_at DESC LIMIT 1",
    [active],
  );
  const previous = previousResult.rows[0]?.id || null;
  let changes: AdminContext["changes"] = null;
  if (previous) {
    const { rows } = await db.query<{
      added: string;
      removed: string;
      changed: string;
    }>(
      `WITH a AS(SELECT * FROM catalog_items WHERE import_id=$1),b AS(SELECT * FROM catalog_items WHERE import_id=$2)
     SELECT count(*) FILTER(WHERE b.variant_id IS NULL)::text AS added,count(*) FILTER(WHERE a.variant_id IS NULL)::text AS removed,
     count(*) FILTER(WHERE a.variant_id IS NOT NULL AND b.variant_id IS NOT NULL AND ROW(a.name,a.price,a.inventory_quantity,a.image_url,a.category) IS DISTINCT FROM ROW(b.name,b.price,b.inventory_quantity,b.image_url,b.category))::text AS changed FROM a FULL JOIN b USING(variant_id)`,
      [active, previous],
    );
    changes = {
      added: Number(rows[0].added),
      removed: Number(rows[0].removed),
      changed: Number(rows[0].changed),
    };
  }
  return {
    source: "postgres",
    notice: null,
    active,
    previous,
    settings,
    summary: Object.fromEntries(
      Object.keys(summaryEmpty).map((k) => [k, Number(totals.rows[0][k])]),
    ) as AdminSummary,
    categories: categoryResult.rows.map((c) => ({
      ...c,
      count: Number(c.count),
    })),
    runs: history.rows,
    changes,
  };
}
