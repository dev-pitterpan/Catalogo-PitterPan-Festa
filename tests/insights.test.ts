import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  readOrderDestination,
  readDestinations,
  destinationFilterSchema,
} from "../src/server/sales/destinations.ts";
import {
  analyticsWindow,
  queryAnalyticsTable,
  readShopifyAnalytics,
  analyticsFailure,
  AnalyticsResponseError,
} from "../src/server/sales/analytics.ts";
import { ShopifyGraphQLError } from "../src/server/shopify/client.ts";
test("diagnóstico distingue acesso, consulta e formato sem revelar mensagens externas", () => {
  assert.equal(
    analyticsFailure(new ShopifyGraphQLError(["ACCESS_DENIED"])).code,
    "ACCESS_DENIED",
  );
  assert.equal(
    analyticsFailure(new ShopifyGraphQLError(["undefinedField"])).code,
    "GRAPHQL_ERROR",
  );
  assert.equal(
    analyticsFailure(new AnalyticsResponseError("QUERY_INVALID")).code,
    "QUERY_INVALID",
  );
  assert.equal(
    analyticsFailure(new AnalyticsResponseError("RESPONSE_INVALID")).code,
    "RESPONSE_INVALID",
  );
  assert.ok(
    !JSON.stringify(
      analyticsFailure(new Error("secret-token customer@example.com")),
    ).includes("secret-token"),
  );
});
test("destino lê apenas cidade/UF/país e não bloqueia pedidos sem permissão", async () => {
  const calls: string[] = [];
  const client = {
    async query<T>(q: string) {
      calls.push(q);
      return {
        order: {
          updatedAt: "v1",
          shippingAddress: {
            city: "Joinville",
            provinceCode: "sc",
            countryCodeV2: "BR",
          },
        },
      } as T;
    },
  };
  const destination = await readOrderDestination(
    client,
    "gid://shopify/Order/1",
    "v1",
  );
  assert.equal(destination?.city, "Joinville");
  assert.equal(destination?.state, "SC");
  assert.ok(!/address1|phone|firstName|latitude|longitude/.test(calls[0]));
  assert.equal(
    await readOrderDestination(client, "gid://shopify/Order/1", "older"),
    null,
  );
  assert.equal(
    await readOrderDestination(
      {
        async query() {
          throw new Error("Access denied");
        },
      },
      "1",
      "v1",
    ),
    null,
  );
});
test("mapa contabiliza cidade, unidades, retirada, internacional e destino ausente sem duplicar itens", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      await readFile(
        new URL("../src/server/sales/schema.sql", import.meta.url),
        "utf8",
      ),
    );
    const rows = [
      ["1", "SEDEX", "Joinville", "SC", "BR"],
      ["2", "MOTOBOY", "Joinville", "SC", "BR"],
      ["3", "SEDEX", "Curitiba", "PR", "BR"],
      ["4", "PICKUP", null, null, null],
      ["5", "UNKNOWN", null, null, null],
      ["6", "SEDEX", "Lisboa", null, "PT"],
      ["7", "OTHER", "Joinville", "SC", "BR"],
    ];
    for (const [id, kind, city, state, country] of rows) {
      await db.query(
        `INSERT INTO pitterpan_sales_orders(store,id,name,processed_at,updated_at,financial_status,fulfillment_status,test,currency,total,received,refunded,net,delivery_kind,destination) VALUES('fixture',$1,$1,now(),now(),'PAID','FULFILLED',false,'BRL',100,100,0,100,$2,$3)`,
        [id, kind, JSON.stringify({ city, state, country })],
      );
      await db.query(
        `INSERT INTO pitterpan_sales_items(store,order_id,id,title,quantity,current_quantity) VALUES('fixture',$1,$1,'Produto',3,3)`,
        [id],
      );
    }
    const result = await readDestinations(
      db,
      "fixture",
      destinationFilterSchema.parse({}),
    );
    assert.equal(result.total, 5);
    assert.equal(result.pickup, 2);
    assert.equal(result.international, 1);
    assert.equal(result.missing, 2);
    assert.equal(result.states.find((r) => r.state === "SC")?.orders, 2);
    const sc = await readDestinations(
      db,
      "fixture",
      destinationFilterSchema.parse({ state: "SC", q: "join" }),
    );
    assert.equal(sc.total, 2);
    assert.equal(sc.cities.length, 1);
    assert.ok(sc.cities[0].location);
    assert.equal(sc.cities[0].orders, 2);
    assert.equal(sc.cities[0].units, 6);
    const moto = await readDestinations(
      db,
      "fixture",
      destinationFilterSchema.parse({ delivery: "MOTOBOY" }),
    );
    assert.equal(moto.total, 1);
    await db.exec(
      "UPDATE pitterpan_sales_orders SET cancelled_at=now() WHERE id='2'",
    );
    assert.equal(
      (await readDestinations(db, "fixture", destinationFilterSchema.parse({})))
        .total,
      4,
    );
    assert.equal(
      (await readDestinations(db, "another", destinationFilterSchema.parse({})))
        .total,
      0,
    );
  } finally {
    await db.close();
  }
});
test("janelas Analytics respeitam o fuso da loja e não sobrepõem o período anterior", () => {
  assert.deepEqual(
    analyticsWindow(7, "America/Sao_Paulo", new Date("2026-10-29T01:00:00Z")),
    {
      start: "2026-10-22",
      end: "2026-10-28",
      previousStart: "2026-10-15",
      previousEnd: "2026-10-21",
    },
  );
  assert.equal(
    analyticsWindow(1, "UTC", new Date("2026-10-29T12:00:00Z")).previousEnd,
    "2026-10-28",
  );
  assert.throws(() => analyticsWindow(999, "UTC"));
});
test("Analytics valida tabela oficial e recusa parseErrors sem converter ausência em zero", async () => {
  await assert.rejects(() =>
    queryAnalyticsTable(
      {
        async query<T>() {
          return {
            shopifyqlQuery: {
              tableData: null,
              parseErrors: ["Invalid metric"],
            },
          } as T;
        },
      },
      "FROM sales SHOW total_sales",
    ),
  );
  const table = await queryAnalyticsTable(
    {
      async query<T>() {
        return {
          shopifyqlQuery: {
            tableData: {
              columns: [
                {
                  name: "total_sales",
                  dataType: "MONEY",
                  displayName: "Vendas",
                },
              ],
              rows: [{ total_sales: "0" }],
            },
            parseErrors: [],
          },
        } as T;
      },
    },
    "FROM sales SHOW total_sales",
  );
  assert.equal(table.rows[0].total_sales, "0");
});
test("Analytics mantém vendas reais se sessões não estiverem disponíveis", async () => {
  const queries: string[] = [];
  const client = {
    async query<T>(q: string, v?: Record<string, unknown>) {
      if (q.includes("ianaTimezone"))
        return {
          shop: { currencyCode: "BRL", ianaTimezone: "America/Sao_Paulo" },
        } as T;
      const query = String(v?.query);
      queries.push(query);
      if (query.includes("FROM sessions")) throw new Error("Unavailable");
      return {
        shopifyqlQuery: {
          parseErrors: [],
          tableData: {
            columns: [
              { name: "total_sales", dataType: "MONEY", displayName: "Vendas" },
            ],
            rows: [{ total_sales: "123.45" }],
          },
        },
      } as T;
    },
  };
  const result = await readShopifyAnalytics(
    client,
    7,
    new Date("2026-10-29T12:00:00Z"),
  );
  assert.equal(result.totals.rows[0].total_sales, "123.45");
  assert.equal(result.sessions.table, null);
  assert.ok(result.sessions.error);
  assert.equal(result.trend.table?.rows[0].total_sales, "123.45");
  assert.ok(queries.every((q) => !q.includes("email")));
  // ShopifyQL absolute dates are unquoted, including the comparison period.
  assert.equal(queries.length, 6);
  assert.ok(queries[0].endsWith("SINCE 2026-10-23 UNTIL 2026-10-29"));
  assert.ok(queries[1].endsWith("SINCE 2026-10-16 UNTIL 2026-10-22"));
  for (const query of queries) {
    assert.match(
      query,
      /SINCE \d{4}-\d{2}-\d{2} UNTIL \d{4}-\d{2}-\d{2}(?: |$)/,
    );
    assert.doesNotMatch(query, /(?:SINCE|UNTIL) ['"]/);
  }
});
