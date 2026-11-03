import type { SqlClient } from "../database/catalog-repository.ts";
/** Older snapshots stay readable before the additive sync migration. */
export const officialOutstandingSql =
  "NULLIF(to_jsonb(o)->>'outstanding','')::numeric";
export function outstandingBalanceSql(alias: "o" | "p") {
  return `COALESCE(NULLIF(to_jsonb(${alias})->>'outstanding','')::numeric,GREATEST(${alias}.total-${alias}.received,0))`;
}
export const outstandingSql = outstandingBalanceSql("o");
export const currentTotalSql =
  "NULLIF(to_jsonb(o)->>'current_total','')::numeric";
export async function ensureFinancialFields(db: SqlClient) {
  await db.query(`ALTER TABLE pitterpan_sales_orders
    ADD COLUMN IF NOT EXISTS outstanding numeric(18,2),
    ADD COLUMN IF NOT EXISTS current_total numeric(18,2),
    ADD COLUMN IF NOT EXISTS shipping_charge numeric(18,2),
    ADD COLUMN IF NOT EXISTS shipping_charge_checked boolean NOT NULL DEFAULT false`);
}
