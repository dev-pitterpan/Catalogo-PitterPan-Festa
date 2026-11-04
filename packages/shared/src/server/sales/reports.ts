import {
  reportById,
  type ShopifyReport,
} from "../../lib/admin/shopify-reports.ts";
import { dateRangeSchema, type DateRange } from "../../lib/admin/date-range.ts";
import {
  analyticsWindow,
  queryAnalyticsTable,
  type AnalyticsTable,
} from "./analytics.ts";
type Client = { query<T>(q: string, v?: Record<string, unknown>): Promise<T> };
function fields(report: ShopifyReport) {
  return [
    ...new Set(
      report.metrics.flatMap((m) => [
        m.key,
        ...(m.ratio || []).filter((k) => k !== "available_units"),
      ]),
    ),
  ];
}
export function reportQuery(
  id: string,
  start: string,
  end: string,
  totals = false,
) {
  const r = reportById(id);
  if (!r) throw new Error("Relatório inválido.");
  // Dates are validated before interpolation; all other clauses come from this fixed registry.
  dateRangeSchema.parse({ start, end });
  if (!start || !end) throw new Error("Período inválido.");
  const shape = totals
    ? ""
    : r.series
      ? " TIMESERIES day"
      : r.dimensions?.length
        ? ` GROUP BY ${r.dimensions.map((d) => d.key).join(", ")}`
        : "";
  const order = totals
    ? ""
    : r.series
      ? " ORDER BY day ASC"
      : r.dimensions?.length
        ? ` ORDER BY ${r.metrics[0].key} DESC LIMIT 50`
        : "";
  return `FROM ${r.dataset} SHOW ${fields(r).join(", ")}${r.where ? ` WHERE ${r.where}` : ""}${shape} SINCE ${start} UNTIL ${end}${order}`;
}
const numeric = (v: unknown) =>
  v === null || v === undefined || v === "" || !Number.isFinite(Number(v))
    ? null
    : Number(v);
export function prepareReportTable(
  id: string,
  table: AnalyticsTable,
): AnalyticsTable {
  const r = reportById(id);
  if (!r) throw new Error("Relatório inválido.");
  const columns = [
    ...(r.series ? [{ key: "day", label: "Data" }] : r.dimensions || []),
    ...r.metrics,
  ];
  return {
    columns: columns.map((c) => ({
      name: c.key,
      displayName: c.label,
      dataType:
        table.columns.find((x) => x.name === c.key)?.dataType || "DECIMAL",
    })),
    rows: table.rows.map((row) => {
      const result = { ...row };
      for (const m of r.metrics)
        if (m.ratio) {
          const numerator = numeric(row[m.ratio[0]]);
          const denominator =
            m.ratio[1] === "available_units"
              ? numerator !== null &&
                numeric(row.ending_inventory_units) !== null
                ? numerator + Number(row.ending_inventory_units)
                : null
              : numeric(row[m.ratio[1]]);
          result[m.key] =
            numerator !== null && denominator !== null && denominator > 0
              ? (100 * numerator) / denominator
              : null;
        }
      return result;
    }),
  };
}
export async function readShopifyReport(
  client: Client,
  id: string,
  days: number,
  custom: DateRange,
  now = new Date(),
) {
  const report = reportById(id);
  if (!report) throw new Error("Relatório inválido.");
  const { shop } = await client.query<{
    shop: { currencyCode: string; ianaTimezone: string };
  }>("{shop{currencyCode ianaTimezone}}");
  const window = analyticsWindow(days, shop.ianaTimezone, now, custom);
  const read = (start: string, end: string, totals = false) =>
    queryAnalyticsTable(client, reportQuery(id, start, end, totals)).then((t) =>
      prepareReportTable(id, t),
    );
  const [current, previous, totals, previousTotals] = await Promise.allSettled([
    read(window.start, window.end),
    read(window.previousStart, window.previousEnd),
    read(window.start, window.end, true),
    read(window.previousStart, window.previousEnd, true),
  ]);
  if (current.status === "rejected") throw current.reason;
  return {
    id,
    currency: shop.currencyCode,
    timezone: shop.ianaTimezone,
    window,
    table: current.value,
    previous: previous.status === "fulfilled" ? previous.value : null,
    totals: totals.status === "fulfilled" ? totals.value : null,
    previousTotals:
      previousTotals.status === "fulfilled" ? previousTotals.value : null,
    comparisonAvailable:
      previous.status === "fulfilled" && previousTotals.status === "fulfilled",
    generatedAt: now.toISOString(),
    source: "shopifyql" as const,
  };
}
export async function readShopifyOverview(
  client: Client,
  days: number,
  custom: DateRange,
  now = new Date(),
) {
  const { shop } = await client.query<{
    shop: { currencyCode: string; ianaTimezone: string };
  }>("{shop{currencyCode ianaTimezone}}");
  const window = analyticsWindow(days, shop.ianaTimezone, now, custom);
  const query = (start: string, end: string) =>
    queryAnalyticsTable(
      client,
      `FROM sales SHOW gross_sales, total_sales, orders, average_order_value SINCE ${start} UNTIL ${end}`,
    );
  const totals = await query(window.start, window.end);
  const previous = await query(window.previousStart, window.previousEnd).catch(
    () => null,
  );
  const trend = await queryAnalyticsTable(
    client,
    `FROM sales SHOW total_sales TIMESERIES day SINCE ${window.start} UNTIL ${window.end} ORDER BY day ASC`,
  ).catch(() => null);
  return {
    trend,
    totals,
    previous,
    currency: shop.currencyCode,
    timezone: shop.ianaTimezone,
    window,
    generatedAt: now.toISOString(),
  };
}
