import { z } from "zod";
import { ShopifyGraphQLError } from "../shopify/client.ts";
import type { SqlClient } from "../database/catalog-repository.ts";
export const orderCustomerSchema = z.object({
  id: z
    .string()
    .regex(/^gid:\/\/shopify\/Customer\/[0-9]+$/)
    .nullable(),
  name: z.string().trim().max(500).nullable(),
  checkedAt: z.string(),
});
export type OrderCustomer = z.infer<typeof orderCustomerSchema>;
type Client = { query<T>(q: string, v?: Record<string, unknown>): Promise<T> };
const customer = z
  .object({
    id: z.string().regex(/^gid:\/\/shopify\/Customer\/[0-9]+$/),
    displayName: z.string().max(500).nullable().optional(),
  })
  .nullable();
export async function readOrderCustomer(
  client: Client,
  id: string,
  updatedAt: string,
): Promise<OrderCustomer | null> {
  for (const names of [true, false]) {
    try {
      const raw = await client.query<unknown>(
        `query($id:ID!){order(id:$id){updatedAt customer{id ${names ? "displayName" : ""}}}}`,
        { id },
      );
      const order = z
        .object({
          order: z.object({ updatedAt: z.string(), customer }).nullable(),
        })
        .parse(raw).order;
      if (!order || order.updatedAt !== updatedAt) return null;
      return {
        id: order.customer?.id || null,
        name: order.customer?.displayName?.trim() || null,
        checkedAt: new Date().toISOString(),
      };
    } catch {
      /* A name restriction must not interrupt financial synchronization. */
    }
  }
  return null;
}
export async function ensureOrderCustomers(db: SqlClient) {
  await db.query(
    "ALTER TABLE pitterpan_sales_orders ADD COLUMN IF NOT EXISTS customer jsonb",
  );
}
export const customerColumns = `COALESCE(to_jsonb(o)->'customer'->>'id','') AS customer_id,COALESCE(to_jsonb(o)->'customer'->>'name','') AS customer_name,
 peers.paid_orders::text AS customer_paid_orders,peers.pending_orders::text AS customer_pending_orders,peers.pending_value::text AS customer_pending_value`;
export const customerJoin = `LEFT JOIN LATERAL (SELECT count(*) FILTER(WHERE p.financial_status='PAID' AND p.cancelled_at IS NULL) AS paid_orders, count(*) FILTER(WHERE p.financial_status IN ('PENDING','AUTHORIZED','PARTIALLY_PAID') AND p.cancelled_at IS NULL) AS pending_orders, COALESCE(sum(GREATEST(p.total-p.received,0)) FILTER(WHERE p.financial_status IN ('PENDING','AUTHORIZED','PARTIALLY_PAID') AND p.cancelled_at IS NULL),0) AS pending_value
 FROM pitterpan_sales_orders p WHERE p.store=o.store AND p.test=false AND p.currency=o.currency AND to_jsonb(o)->'customer'->>'id' IS NOT NULL AND to_jsonb(p)->'customer'->>'id'=to_jsonb(o)->'customer'->>'id') peers ON true`;
export async function readCustomerFields(
  db: SqlClient,
  store: string,
  ids: string[],
) {
  return (
    await db.query<Record<string, string>>(
      `SELECT o.id,${customerColumns} FROM pitterpan_sales_orders o ${customerJoin} WHERE o.store=$1 AND o.id=ANY($2::text[]) AND o.test=false`,
      [store, ids],
    )
  ).rows;
}
export async function refreshOrderCustomers(
  db: SqlClient,
  client: Client,
  store: string,
  ids: string[],
) {
  const { rows } = await db.query<{ id: string; updated_at: string }>(
    "SELECT id,updated_at::text FROM pitterpan_sales_orders WHERE store=$1 AND id=ANY($2::text[]) AND test=false",
    [store, ids],
  );
  const matches = new Map(rows.map((row) => [row.id, row.updated_at]));
  let loaded = 0;
  const diagnostics: Record<string, string> = Object.fromEntries(
    ids.map((id) => [id, "not_imported"]),
  );
  rows.forEach((row) => {
    diagnostics[row.id] = "order_unavailable";
  });
  let queryFailure = "",
    nameFailure = "";

  for (const names of [true, false]) {
    try {
      const raw = await client.query<unknown>(
        `query($ids:[ID!]!){nodes(ids:$ids){... on Order{id updatedAt customer{id ${names ? "displayName" : ""}}}}}`,
        { ids: rows.map((row) => row.id) },
      );
      const nodes = z
        .object({
          nodes: z.array(
            z
              .object({ id: z.string(), updatedAt: z.string(), customer })
              .nullable(),
          ),
        })
        .parse(raw).nodes;
      for (const node of nodes) {
        if (!node || !matches.has(node.id)) continue;
        if (Date.parse(node.updatedAt) !== Date.parse(matches.get(node.id)!)) {
          diagnostics[node.id] = "stale_order";
          continue;
        }
        diagnostics[node.id] = !names
          ? nameFailure === "access_denied"
            ? "name_access_denied"
            : "name_query_failed"
          : !node.customer
            ? "no_customer"
            : node.customer.displayName?.trim()
              ? "identified"
              : "name_unavailable";
        const value = {
          id: node.customer?.id || null,
          name: node.customer?.displayName?.trim() || null,
          checkedAt: new Date().toISOString(),
        };
        await db.query(
          "UPDATE pitterpan_sales_orders SET customer=CASE WHEN $3::jsonb->>'id' IS NOT DISTINCT FROM customer->>'id' THEN jsonb_build_object('id',$3::jsonb->>'id','name',COALESCE($3::jsonb->>'name',customer->>'name'),'checkedAt',$3::jsonb->>'checkedAt') ELSE $3::jsonb END WHERE store=$1 AND id=$2 AND updated_at=$4::timestamptz",
          [store, node.id, JSON.stringify(value), matches.get(node.id)],
        );
        loaded++;
      }
      queryFailure = "";
      break;
    } catch (error) {
      // Only controlled categories leave the server; never upstream messages.
      queryFailure =
        error instanceof ShopifyGraphQLError && error.accessDenied
          ? "access_denied"
          : error instanceof z.ZodError
            ? "invalid_response"
            : "query_failed";
      if (names) nameFailure = queryFailure;
    }
  }
  if (queryFailure)
    rows.forEach((row) => {
      diagnostics[row.id] = queryFailure;
    });
  return {
    diagnostics,
    loaded,
    unavailable: rows.length - loaded,
    orders: (await readCustomerFields(db, store, ids)).map(
      (row): Record<string, string> => ({
        ...row,
        customer_diagnostic: diagnostics[row.id],
      }),
    ),
  };
}
