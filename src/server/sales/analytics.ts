import { z } from "zod";
import { ShopifyGraphQLError } from "../shopify/client.ts";
export class AnalyticsResponseError extends Error {
  readonly code: "QUERY_INVALID" | "RESPONSE_INVALID" | "NO_TABLE";
  constructor(code: "QUERY_INVALID" | "RESPONSE_INVALID" | "NO_TABLE") {
    super(code);
    this.code = code;
  }
}
export function analyticsFailure(error: unknown) {
  if (error instanceof ShopifyGraphQLError) {
    return error.accessDenied
      ? {
          code: "ACCESS_DENIED",
          error:
            "A Shopify negou acesso às análises. Confira read_reports na instalação e a autorização de dados protegidos de nível 2 do app de vendas.",
        }
      : {
          code: "GRAPHQL_ERROR",
          error:
            "A Shopify recusou a consulta GraphQL. É necessário revisar os campos e a versão da API no código.",
        };
  }
  if (error instanceof AnalyticsResponseError) {
    return {
      code: error.code,
      error:
        error.code === "QUERY_INVALID"
          ? "A Shopify recusou a sintaxe ou uma métrica do relatório. É necessário revisar a consulta ShopifyQL no código."
          : "A resposta do relatório não corresponde ao formato esperado. É necessário revisar a integração de análises.",
    };
  }
  return {
    code: "ANALYTICS_UNAVAILABLE",
    error:
      "Não foi possível concluir a consulta de análises. Verifique a configuração do app de vendas, a conexão e o tempo de resposta. Nenhuma métrica foi estimada.",
  };
}
type Client = { query<T>(q: string, v?: Record<string, unknown>): Promise<T> };
const scalar = z.union([z.string(), z.number(), z.null()]);
const tableSchema = z.object({
  columns: z.array(
    z.object({
      name: z.string(),
      dataType: z.string(),
      displayName: z.string(),
    }),
  ),
  rows: z.array(z.record(z.string(), scalar)),
});
export type AnalyticsTable = z.infer<typeof tableSchema>;
export function analyticsWindow(
  days: number,
  timezone: string,
  now = new Date(),
) {
  if (![1, 7, 30, 60].includes(days)) throw new Error("Período inválido.");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  const end = `${part("year")}-${part("month")}-${part("day")}`;
  const shift = (n: number) =>
    new Date(Date.parse(`${end}T12:00:00Z`) + n * 86400000)
      .toISOString()
      .slice(0, 10);
  return {
    start: shift(1 - days),
    end,
    previousStart: shift(1 - days * 2),
    previousEnd: shift(-days),
  };
}
export async function queryAnalyticsTable(client: Client, query: string) {
  const raw = await client.query<unknown>(
    `query($query:String!){shopifyqlQuery(query:$query){tableData{columns{name dataType displayName} rows} parseErrors}}`,
    { query },
  );
  const parsed = z
    .object({
      shopifyqlQuery: z
        .object({
          parseErrors: z.array(z.string()),
          tableData: tableSchema.nullable(),
        })
        .nullable(),
    })
    .safeParse(raw);
  if (!parsed.success) throw new AnalyticsResponseError("RESPONSE_INVALID");
  const body = parsed.data.shopifyqlQuery;
  if (body?.parseErrors.length)
    throw new AnalyticsResponseError("QUERY_INVALID");
  if (!body?.tableData) throw new AnalyticsResponseError("NO_TABLE");
  return body.tableData;
}
const metrics =
  "gross_sales, discounts, returns, net_sales, shipping_charges, taxes, total_sales, orders, average_order_value";
export async function readShopifyAnalytics(
  client: Client,
  days: number,
  now = new Date(),
) {
  const { shop } = await client.query<{
    shop: { currencyCode: string; ianaTimezone: string };
  }>("{shop{currencyCode ianaTimezone}}");
  const window = analyticsWindow(days, shop.ianaTimezone, now);
  const range = `SINCE '${window.start}' UNTIL '${window.end}'`;
  const totals = await queryAnalyticsTable(
    client,
    `FROM sales SHOW ${metrics} ${range}`,
  );
  const requests = {
    previous: `FROM sales SHOW ${metrics} SINCE '${window.previousStart}' UNTIL '${window.previousEnd}'`,
    trend: `FROM sales SHOW total_sales, orders TIMESERIES day ${range} ORDER BY day ASC`,
    channels: `FROM sales SHOW total_sales GROUP BY sales_channel ${range} ORDER BY total_sales DESC LIMIT 10`,
    products: `FROM sales SHOW total_sales, net_items_sold GROUP BY product_title ${range} ORDER BY total_sales DESC LIMIT 10`,
    sessions: `FROM sessions SHOW sessions, online_store_visitors, sessions_with_cart_additions, sessions_that_reached_checkout, sessions_that_completed_checkout ${range}`,
  };
  const sections = {} as Record<
    keyof typeof requests,
    { table: AnalyticsTable | null; error: string | null }
  >;
  const outcomes = await Promise.allSettled(
    Object.values(requests).map((query) => queryAnalyticsTable(client, query)),
  );
  (Object.keys(requests) as (keyof typeof requests)[]).forEach((key, i) => {
    const result = outcomes[i];
    sections[key] =
      result.status === "fulfilled"
        ? { table: result.value, error: null }
        : {
            table: null,
            error:
              "Esta métrica não está disponível. Verifique as permissões de relatórios e o acesso ao conjunto de dados na Shopify.",
          };
  });
  return {
    source: "shopifyql" as const,
    currency: shop.currencyCode,
    timezone: shop.ianaTimezone,
    window,
    totals,
    ...sections,
    generatedAt: now.toISOString(),
  };
}
