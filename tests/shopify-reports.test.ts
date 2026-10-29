import test from "node:test";
import assert from "node:assert/strict";
import {
  shopifyReports,
  reportCategories,
} from "../src/lib/admin/shopify-reports.ts";
import {
  reportQuery,
  prepareReportTable,
  readShopifyReport,
  readShopifyOverview,
} from "../src/server/sales/reports.ts";
const range = { start: "2026-10-01", end: "2026-10-07" };
const table = (row: Record<string, string | number | null>) => ({
  columns: Object.keys(row).map((name) => ({
    name,
    displayName: name,
    dataType: "DECIMAL",
  })),
  rows: [row],
});
function client(
  options: { previousFails?: boolean; currentFails?: boolean } = {},
) {
  const queries: string[] = [];
  return {
    queries,
    async query<T>(
      _q: string,
      variables?: Record<string, unknown>,
    ): Promise<T> {
      if (!variables)
        return {
          shop: { currencyCode: "BRL", ianaTimezone: "America/Sao_Paulo" },
        } as T;
      const q = String(variables.query);
      queries.push(q);
      if (
        (options.previousFails && q.includes("SINCE 2026-09-24")) ||
        options.currentFails
      )
        throw new Error("Unavailable");
      const row: Record<string, string | number | null> = q.includes(
        "TIMESERIES",
      )
        ? { day: "2026-10-01", online_store_visitors: 15, sessions: 20 }
        : {
            online_store_visitors: 73,
            sessions: 100,
            gross_sales: 250,
            total_sales: 230,
            orders: 3,
            average_order_value: 76.67,
          };
      return {
        shopifyqlQuery: { parseErrors: [], tableData: table(row) },
      } as T;
    },
  };
}
test("report registry has unique IDs and queries only fixed categories and dimensions", () => {
  assert.equal(
    new Set(shopifyReports.map((r) => r.id)).size,
    shopifyReports.length,
  );
  for (const r of shopifyReports) {
    assert.ok(reportCategories.some((c) => c.id === r.category));
    const q = reportQuery(r.id, range.start, range.end);
    assert.ok(q.startsWith(`FROM ${r.dataset} SHOW `));
    assert.ok(q.includes("SINCE 2026-10-01 UNTIL 2026-10-07"));
    const totals = reportQuery(r.id, range.start, range.end, true);
    assert.doesNotMatch(totals, /GROUP BY|TIMESERIES|LIMIT/);
  }
  assert.throws(() => reportQuery("sales; DROP", range.start, range.end));
  assert.throws(() => reportQuery("sales-time", "2026-02-30", range.end));
  assert.throws(() => reportQuery("sales-time", range.end, range.start));
  assert.throws(() =>
    reportQuery("sales-time", "2026-10-01 SHOW secret", range.end),
  );
});
test("percentages use period counts and never turn missing or zero denominator into zero", () => {
  const convert = (row: Record<string, number | null>) =>
    prepareReportTable("conversion-funnel", table(row)).rows[0].conversion_rate;
  assert.equal(
    convert({
      sessions: 100,
      sessions_that_completed_checkout: 7,
      conversion_rate: 0.07,
    }),
    7,
  );
  assert.equal(
    convert({ sessions: 0, sessions_that_completed_checkout: 0 }),
    null,
  );
  assert.equal(
    convert({ sessions: null, sessions_that_completed_checkout: 3 }),
    null,
  );
  assert.equal(
    prepareReportTable(
      "inventory-sellthrough",
      table({ inventory_units_sold: 20, ending_inventory_units: 80 }),
    ).rows[0].sell_through_rate,
    20,
  );
});
test("opening one report queries only its dataset and uses separate aggregates for unique visitors", async () => {
  const c = client();
  const result = await readShopifyReport(c, "sessions-time", 7, range);
  assert.equal(c.queries.length, 4);
  assert.ok(c.queries.every((q) => q.startsWith("FROM sessions SHOW")));
  assert.equal(result.table.rows[0].online_store_visitors, 15);
  assert.equal(result.totals?.rows[0].online_store_visitors, 73);
  assert.equal(result.window.previousStart, "2026-09-24");
  assert.equal(result.comparisonAvailable, true);
});
test("unavailable comparison stays null while a failed current report fails explicitly", async () => {
  const result = await readShopifyReport(
    client({ previousFails: true }),
    "sessions-time",
    7,
    range,
  );
  assert.equal(result.previous, null);
  assert.equal(result.previousTotals, null);
  assert.equal(result.comparisonAvailable, false);
  await assert.rejects(
    readShopifyReport(
      client({ currentFails: true }),
      "sessions-time",
      7,
      range,
    ),
  );
});
test("overview loads only totals and the sales trend without loading other categories", async () => {
  const c = client();
  const result = await readShopifyOverview(c, 7, range);
  assert.equal(c.queries.length, 3);
  assert.ok(c.queries.every((q) => q.startsWith("FROM sales SHOW")));
  assert.equal(c.queries.filter((q) => q.includes("TIMESERIES day")).length, 1);
  assert.ok(result.trend);
  assert.equal(result.totals.rows[0].total_sales, 230);
});
