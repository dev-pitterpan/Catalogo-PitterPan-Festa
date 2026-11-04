import { z } from "zod";
import { dateRangeSchema, shiftDate } from "../../lib/admin/date-range.ts";
import type { SqlClient } from "../database/catalog-repository.ts";
import { orderSchema } from "./model.ts";
const fields = {
  total: "totalPriceSet",
  received: "totalReceivedSet",
  refunded: "totalRefundedSet",
  net: "netPaymentSet",
  outstanding: "totalOutstandingSet",
  current_total: "currentTotalPriceSet",
} as const;
const financialOrder = z.object(orderSchema.shape).pick({
  id: true,
  name: true,
  processedAt: true,
  updatedAt: true,
  cancelledAt: true,
  test: true,
  displayFinancialStatus: true,
  displayFulfillmentStatus: true,
  totalPriceSet: true,
  totalReceivedSet: true,
  totalRefundedSet: true,
  netPaymentSet: true,
  totalOutstandingSet: true,
  currentTotalPriceSet: true,
});
const pageSchema = z.object({
  orders: z.object({
    nodes: z.array(financialOrder),
    pageInfo: z.object({
      hasNextPage: z.boolean(),
      endCursor: z.string().nullable(),
    }),
  }),
});
/** Exact signed decimal cents; never sum money with binary floating point. */
export function financialCents(value: string) {
  if (!/^-?\d{1,16}(\.\d{1,2})?$/.test(value))
    throw new Error("Valor monetário inválido.");
  const negative = value.startsWith("-"),
    [whole, fraction = ""] = value.replace(/^-/u, "").split(".");
  return (
    (negative ? -1n : 1n) *
    (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0")))
  );
}
type Client = {
  query<T>(query: string, variables?: Record<string, unknown>): Promise<T>;
};
/** Read-only reconciliation. Missing, stale and mismatched records are reported, never repaired here. */
export async function auditSalesSnapshot(
  db: SqlClient,
  client: Client,
  store: string,
  start: string,
  end: string,
) {
  dateRangeSchema.parse({ start, end });
  if (!start || !end) throw new Error("Informe o período da auditoria.");
  const filter = `test:false processed_at:>=${start}T00:00:00-03:00 processed_at:<${shiftDate(end, 1)}T00:00:00-03:00`;
  const query = `query SalesFinancialAudit($after:String,$filter:String!){orders(first:50,after:$after,query:$filter,sortKey:PROCESSED_AT){nodes{id name processedAt updatedAt cancelledAt test displayFinancialStatus displayFulfillmentStatus ${Object.values(
    fields,
  )
    .map((field) => `${field}{shopMoney{amount currencyCode}}`)
    .join(" ")}} pageInfo{hasNextPage endCursor}}}`;
  const remote = new Map<string, z.infer<typeof financialOrder>>();
  const seen = new Set<string>();
  let after: string | null = null;
  for (let page = 0; ; page++) {
    if (page >= 1000)
      throw new Error("Limite de páginas da auditoria atingido.");
    const data: z.infer<typeof pageSchema>["orders"] = pageSchema.parse(
      await client.query(query, { after, filter }),
    ).orders;
    for (const order of data.nodes) {
      if (remote.has(order.id))
        throw new Error("Pedido repetido durante auditoria; tente novamente.");
      remote.set(order.id, order);
    }
    if (!data.pageInfo.hasNextPage) break;
    const cursor: string | null = data.pageInfo.endCursor;
    if (!cursor || seen.has(cursor) || !data.nodes.length)
      throw new Error("Paginação de auditoria sem progresso.");
    seen.add(cursor);
    after = cursor;
  }
  const { rows } = await db.query<Record<string, string | null>>(
    `SELECT o.id,o.updated_at::text,o.financial_status,o.fulfillment_status,o.cancelled_at::text,o.currency,
    o.total::text,o.received::text,o.refunded::text,o.net::text,to_jsonb(o)->>'outstanding' AS outstanding,to_jsonb(o)->>'current_total' AS current_total
    FROM pitterpan_sales_orders o WHERE o.store=$1 AND NOT o.test
    AND o.processed_at>=($2::date::timestamp AT TIME ZONE 'America/Sao_Paulo')
    AND o.processed_at<((($3::date+1)::timestamp) AT TIME ZONE 'America/Sao_Paulo')`,
    [store, start, end],
  );
  const local = new Map(rows.map((row) => [row.id!, row]));
  const counts = {
    shopify: remote.size,
    local: local.size,
    missing: 0,
    extra: 0,
    outdated: 0,
    divergent: 0,
    missingOfficialBalances: 0,
    shopifyNetInconsistent: 0,
  };
  const issues: Record<string, number> = {};
  const issue = (key: string) => {
    issues[key] = (issues[key] || 0) + 1;
  };
  for (const order of remote.values()) {
    if (
      financialCents(order.totalReceivedSet.shopMoney.amount) -
        financialCents(order.totalRefundedSet.shopMoney.amount) !==
      financialCents(order.netPaymentSet.shopMoney.amount)
    )
      counts.shopifyNetInconsistent++;
    const row = local.get(order.id);
    if (!row) {
      counts.missing++;
      continue;
    }
    if (new Date(row.updated_at!).getTime() !== Date.parse(order.updatedAt)) {
      counts.outdated++;
      continue;
    }
    let different = false;
    for (const [column, field] of Object.entries(fields)) {
      const expected = order[field as keyof typeof order] as
        { shopMoney: { amount: string; currencyCode: string } } | undefined;
      if (!expected) continue;
      if (row[column] == null) {
        if (column === "outstanding" || column === "current_total")
          counts.missingOfficialBalances++;
        issue(column);
        different = true;
        continue;
      }
      if (
        row.currency !== expected.shopMoney.currencyCode ||
        financialCents(row[column]!) !==
          financialCents(expected.shopMoney.amount)
      ) {
        issue(column);
        different = true;
      }
    }
    for (const [column, value] of Object.entries({
      financial_status: order.displayFinancialStatus || "UNKNOWN",
      fulfillment_status: order.displayFulfillmentStatus,
      cancelled_at: order.cancelledAt ? Date.parse(order.cancelledAt) : null,
    })) {
      const actual =
        column === "cancelled_at" && row[column]
          ? Date.parse(row[column]!)
          : row[column];
      if (actual !== value) {
        issue(column);
        different = true;
      }
    }
    if (different) counts.divergent++;
  }
  for (const id of local.keys()) if (!remote.has(id)) counts.extra++;
  return {
    window: { start, end },
    timezone: "America/Sao_Paulo",
    counts,
    issues,
    consistent:
      counts.missing +
        counts.extra +
        counts.outdated +
        counts.divergent +
        counts.shopifyNetInconsistent ===
      0,
  };
}
