import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  validSignature,
  webhookOrderId,
} from "../src/server/sales/security.ts";
import {
  saveOrder,
  readSales,
  readSalesOrders,
  readSalesFinance,
} from "../src/server/sales/repository.ts";
import { orderSchema, type SalesOrder } from "../src/server/sales/model.ts";
import { ShopifyClient } from "../src/server/shopify/client.ts";
const store = "fixture.myshopify.com";
function order(id = "1"): SalesOrder {
  const m = (amount: string) => ({
    shopMoney: { amount, currencyCode: "BRL" },
  });
  return {
    id: `gid://shopify/Order/${id}`,
    name: `#${id}`,
    processedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    cancelledAt: null,
    test: false,
    displayFinancialStatus: "PAID",
    displayFulfillmentStatus: "UNFULFILLED",
    totalPriceSet: m("100.00"),
    totalReceivedSet: m("100.00"),
    totalRefundedSet: m("0.00"),
    netPaymentSet: m("100.00"),
    lineItems: {
      nodes: [
        {
          id: `gid://shopify/LineItem/${id}`,
          title: "Balão",
          sku: "SKU-COMPARTILHADO",
          quantity: 3,
          currentQuantity: 3,
          variant: { id: "gid://shopify/ProductVariant/10" },
          product: { id: "gid://shopify/Product/1" },
        },
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
    },
  };
}
test("webhook verifica bytes exatos, recusa assinatura adulterada e valida ID sem precisão perdida", () => {
  const body = Buffer.from('{"id":123}'),
    secret = "private-fixture";
  const signature = createHmac("sha256", secret).update(body).digest("base64");
  assert.equal(validSignature(body, signature, secret), true);
  assert.equal(
    validSignature(Buffer.from('{ "id":123}'), signature, secret),
    false,
  );
  assert.equal(validSignature(body, signature, "wrong"), false);
  assert.equal(validSignature(body, "bad", secret), false);
  assert.equal(
    webhookOrderId("orders/paid", { id: 123 }),
    "gid://shopify/Order/123",
  );
  assert.equal(
    webhookOrderId("refunds/create", { id: 123, order_id: "456" }),
    "gid://shopify/Order/456",
  );
  assert.throws(() =>
    webhookOrderId("orders/paid", { id: Number.MAX_SAFE_INTEGER + 1 }),
  );
});
test("vendas: reenvio, eventos atrasados, reembolso, cancelamento, teste e outra loja não corrompem indicadores", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "CREATE TABLE unrelated(id int PRIMARY KEY); INSERT INTO unrelated VALUES(7);",
    );
    const sql = await readFile(
      new URL("../src/server/sales/schema.sql", import.meta.url),
      "utf8",
    );
    await db.exec(sql);
    await db.exec(sql);
    const paid = order();
    await saveOrder(db, store, paid, true);
    await saveOrder(db, store, paid, true);
    assert.equal(
      (await db.query("SELECT * FROM pitterpan_sales_confirmations")).rows
        .length,
      1,
    );
    const old = {
      ...paid,
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
      displayFinancialStatus: "PENDING",
    };
    assert.equal(await saveOrder(db, store, old), false);
    const refund = order("2");
    refund.displayFinancialStatus = "PARTIALLY_REFUNDED";
    refund.totalRefundedSet.shopMoney.amount = "40.00";
    refund.netPaymentSet.shopMoney.amount = "60.00";
    refund.lineItems.nodes[0].currentQuantity = 1;
    refund.lineItems.nodes[0].variant = {
      id: "gid://shopify/ProductVariant/20",
    };
    await saveOrder(db, store, refund, true);
    const cancelled = order("3");
    cancelled.cancelledAt = new Date().toISOString();
    await saveOrder(db, store, cancelled, true);
    const fake = order("4");
    fake.test = true;
    await saveOrder(db, store, fake, true);
    await saveOrder(db, "another.myshopify.com", order("5"), true);
    const data = await readSales(db, store, 30, "0");
    assert.equal(data.totals[0].orders, "3");
    assert.equal(data.totals[0].paid, "1");
    assert.equal(data.totals[0].cancelled, "1");
    assert.equal(Number(data.totals[0].net), 260);
    assert.equal(Number(data.totals[0].refunded), 40);
    assert.equal(data.top.length, 2);
    assert.equal(data.top[0].units, "3");
    assert.equal(data.top[1].units, "1");
    assert.equal(data.events.length, 1);
    const partial = order("6");
    partial.lineItems.pageInfo.hasNextPage = true;
    await assert.rejects(() => saveOrder(db, store, partial), /incompletos/);
    const duplicate = order("6");
    duplicate.lineItems.nodes.push(duplicate.lineItems.nodes[0]);
    await assert.rejects(() => saveOrder(db, store, duplicate), /duplicados/);
    const changed = {
      ...paid,
      updatedAt: new Date(Date.now() + 1000).toISOString(),
      cancelledAt: new Date().toISOString(),
    };
    await saveOrder(db, store, changed);
    assert.equal((await readSales(db, store, 30, "0")).events.length, 0);
    assert.deepEqual((await db.query("SELECT * FROM unrelated")).rows, [
      { id: 7 },
    ]);
    assert.equal(
      orderSchema.safeParse({
        ...paid,
        totalReceivedSet: { shopMoney: { amount: "100", currencyCode: "USD" } },
      }).success,
      false,
    );
  } finally {
    await db.close();
  }
});
test("cliente de vendas usa credencial explícita e não herda token do catálogo", async (t) => {
  const calls: { url: string; body: string; authorization: string | null }[] =
    [];
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string, options: RequestInit) => {
      const headers = new Headers(options.headers);
      calls.push({
        url: String(url),
        body: String(options.body),
        authorization: headers.get("X-Shopify-Access-Token"),
      });
      return new Response(
        JSON.stringify(
          String(url).includes("oauth")
            ? { access_token: "sales-fixture-token", expires_in: 86399 }
            : { data: { ok: true } },
        ),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
  );
  const api = new ShopifyClient({
    SHOPIFY_STORE_DOMAIN: store,
    SHOPIFY_CLIENT_ID: "sales-app",
    SHOPIFY_CLIENT_SECRET: "sales-secret",
  });
  await api.query("{ shop { id } }");
  assert.match(calls[0].body, /client_id=sales-app/);
  assert.match(calls[0].body, /client_secret=sales-secret/);
  assert.equal(calls[1].authorization, "sales-fixture-token");
  assert.equal(calls.length, 2);
});

test("worker retoma cursor, completa itens, deduplica pagamento e preserva checkpoint após falha", async (t) => {
  const db = new PGlite();
  await db.exec(
    await readFile(
      new URL("../src/server/sales/schema.sql", import.meta.url),
      "utf8",
    ),
  );
  const globals = globalThis as typeof globalThis & { catalogPool?: unknown };
  const previousPool = globals.catalogPool;
  globals.catalogPool = {
    query: db.query.bind(db),
    connect: async () => ({ query: db.query.bind(db), release() {} }),
  };
  const keys = [
    "DATABASE_URL",
    "SHOPIFY_SALES_STORE_DOMAIN",
    "SHOPIFY_SALES_CLIENT_ID",
    "SHOPIFY_SALES_CLIENT_SECRET",
  ];
  const previous = keys.map((k) => process.env[k]);
  process.env.DATABASE_URL = "postgresql://fixture.invalid/test";
  process.env.SHOPIFY_SALES_STORE_DOMAIN = store;
  process.env.SHOPIFY_SALES_CLIENT_ID = "fixture";
  process.env.SHOPIFY_SALES_CLIENT_SECRET = "fixture";
  t.after(async () => {
    globals.catalogPool = previousPool;
    keys.forEach((k, i) => {
      if (previous[i] === undefined) delete process.env[k];
      else process.env[k] = previous[i];
    });
    await db.close();
  });
  const { syncSalesPage } = await import("../src/server/sales/sync.ts");
  let fail = false,
    pageCalls = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string, options: RequestInit) => {
      if (String(url).includes("oauth"))
        return new Response(
          JSON.stringify({ access_token: "fixture-token", expires_in: 86399 }),
        );
      const { query, variables } = JSON.parse(String(options.body));
      if (fail)
        return new Response(
          JSON.stringify({
            errors: [{ extensions: { code: "ACCESS_DENIED" } }],
          }),
        );
      let data;
      if (query.includes("orders(first:5")) {
        pageCalls++;
        if (!variables.after) {
          const partial = order("10");
          partial.shippingLines = {
            nodes: [
              {
                title: "Sedex",
                code: null,
                source: null,
                deliveryCategory: null,
              },
            ],
            pageInfo: { hasNextPage: true, endCursor: "shipping-next" },
          };
          partial.lineItems.pageInfo = {
            hasNextPage: true,
            endCursor: "line-next",
          };
          data = {
            orders: {
              nodes: [partial],
              pageInfo: { hasNextPage: true, endCursor: "order-next" },
            },
          };
        } else {
          assert.equal(variables.after, "order-next");
          data = {
            orders: {
              nodes: [order("11")],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          };
        }
      } else if (query.includes("shippingLines(first:100")) {
        assert.equal(variables.after, "shipping-next");
        data = {
          order: {
            updatedAt: partialUpdatedAt,
            shippingLines: {
              nodes: [
                {
                  title: "Retirada na loja",
                  code: null,
                  source: null,
                  deliveryCategory: null,
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        };
      } else if (query.includes("lineItems(first:100")) {
        const extra = {
          ...order("12").lineItems.nodes[0],
          variant: { id: "gid://shopify/ProductVariant/12" },
        };
        data = {
          order: {
            updatedAt: partialUpdatedAt,
            lineItems: {
              nodes: [extra],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        };
      } else {
        data = {
          order:
            variables.id === "gid://shopify/Order/999" ? null : order("20"),
        };
      }
      // Keep the pagination consistency timestamp stable across both calls.
      if (query.includes("orders(first:5") && !variables.after) {
        if (data.orders) data.orders.nodes[0].updatedAt = partialUpdatedAt;
      }
      return new Response(JSON.stringify({ data }));
    },
  );
  const partialUpdatedAt = new Date().toISOString();
  const first = await syncSalesPage();
  assert.equal(first.more, true);
  assert.equal(
    (
      await db.query(
        "SELECT * FROM pitterpan_sales_items WHERE order_id='gid://shopify/Order/10'",
      )
    ).rows.length,
    2,
  );
  fail = true;
  await assert.rejects(() => syncSalesPage());
  const checkpoint = (
    await db.query<{
      cursor: string;
      completed_at: Date | null;
      lease_id: string | null;
    }>("SELECT cursor,completed_at,lease_id FROM pitterpan_sales_sync")
  ).rows[0];
  assert.equal(checkpoint.cursor, "order-next");
  assert.equal(checkpoint.completed_at, null);
  assert.equal(checkpoint.lease_id, null);
  fail = false;
  assert.equal((await syncSalesPage()).more, false);
  assert.equal(pageCalls, 2);
  await db.query(
    "INSERT INTO pitterpan_sales_inbox(store,delivery_id,topic,order_id) VALUES($1,'delivery-1','orders/paid','gid://shopify/Order/20'),($1,'delivery-2','orders/paid','gid://shopify/Order/20')",
    [store],
  );
  await syncSalesPage();
  assert.equal(
    (await db.query("SELECT * FROM pitterpan_sales_confirmations")).rows.length,
    1,
  );
  assert.equal(
    (
      await db.query(
        "SELECT * FROM pitterpan_sales_inbox WHERE done_at IS NULL",
      )
    ).rows.length,
    0,
  );
  await db.query(
    "INSERT INTO pitterpan_sales_inbox(store,delivery_id,topic,order_id) VALUES($1,'invalid-order','orders/paid','gid://shopify/Order/999')",
    [store],
  );
  await syncSalesPage();
  const retry = (
    await db.query<{ attempts: number; done_at: Date | null }>(
      "SELECT attempts,done_at FROM pitterpan_sales_inbox WHERE delivery_id='invalid-order'",
    )
  ).rows[0];
  assert.equal(retry.attempts, 1);
  assert.equal(retry.done_at, null);
  await db.query(
    "UPDATE pitterpan_sales_inbox SET attempts=10 WHERE delivery_id='invalid-order'",
  );
  assert.equal((await readSales(db, store, 30)).failed, 1);
  await db.query(
    "UPDATE pitterpan_sales_sync SET lease_until=now()+interval '10 minutes'",
  );
  assert.equal((await syncSalesPage()).busy, true);
});

test("setup reaproveita arquivo validado com BOM e preserva as credenciais e banco existentes", async () => {
  const { mkdtemp, writeFile, readFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { spawnSync } = await import("node:child_process");
  const { parseEnv } = await import("node:util");
  const root = await mkdtemp(join(tmpdir(), "pitter-sales-test-"));
  try {
    const original =
      'SHOPIFY_CLIENT_ID=original-app\nSHOPIFY_CLIENT_SECRET=original-secret\nSHOPIFY_ADMIN_ACCESS_TOKEN=original-token\nDATABASE_URL=postgresql://original-db\nADMIN_PASSWORD_HASH="scrypt:fixture:key"\nSHOPIFY_SALES_CLIENT_ID=\n';
    await writeFile(join(root, ".env"), original);
    await writeFile(
      join(root, ".env.shopify-test.local"),
      "\uFEFFSHOPIFY_STORE_DOMAIN=fixture.myshopify.com\nSHOPIFY_CLIENT_ID=new-app\nSHOPIFY_CLIENT_SECRET=new-secret\nSHOPIFY_API_VERSION=2026-10\n",
    );
    const script = fileURLToPath(
      new URL("../scripts/sales/setup.ts", import.meta.url),
    );
    const result = spawnSync(process.execPath, [script], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(!result.stdout.includes("new-secret"));
    const text = await readFile(join(root, ".env"), "utf8"),
      env = parseEnv(text);
    assert.equal(env.SHOPIFY_CLIENT_ID, "original-app");
    assert.equal(env.SHOPIFY_CLIENT_SECRET, "original-secret");
    assert.equal(env.SHOPIFY_ADMIN_ACCESS_TOKEN, "original-token");
    assert.equal(env.DATABASE_URL, "postgresql://original-db");
    assert.equal(env.SHOPIFY_SALES_CLIENT_ID, "new-app");
    assert.equal(env.SHOPIFY_SALES_CLIENT_SECRET, "new-secret");
    assert.equal(env.CRON_SECRET?.length, 64);
    const again = spawnSync(process.execPath, [script], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(again.status, 0);
    assert.equal(await readFile(join(root, ".env"), "utf8"), text);
    await writeFile(
      join(root, ".env.shopify-test.local"),
      "SHOPIFY_STORE_DOMAIN=fixture.myshopify.com\nSHOPIFY_CLIENT_ID=different-app\nSHOPIFY_CLIENT_SECRET=different-secret\n",
    );
    assert.notEqual(
      spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8" })
        .status,
      0,
    );
    assert.equal(await readFile(join(root, ".env"), "utf8"), text);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("vendas pagina de dez em dez, combina situação/categoria e mantém totais completos", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      await readFile(
        new URL("../src/server/sales/schema.sql", import.meta.url),
        "utf8",
      ),
    );
    await db.exec(`CREATE TABLE catalog_items(import_id text,product_id text,category text,variant_id text,image_url text);
      CREATE TABLE catalog_state(singleton boolean,active_import text);
      INSERT INTO catalog_state VALUES(true,'active');
      INSERT INTO catalog_items(import_id,product_id,category) VALUES('active','gid://shopify/Product/1','Festas'),('active','gid://shopify/Product/2','Natal'),('old','gid://shopify/Product/1','Categoria antiga');`);
    const timestamp = new Date().toISOString();
    for (let i = 1; i <= 26; i++) {
      const item = order(String(i));
      item.processedAt = timestamp;
      if (i >= 24 && i <= 25) {
        item.displayFinancialStatus = "EXPIRED";
        item.lineItems.nodes[0].product = { id: "gid://shopify/Product/2" };
      }
      if (i === 26) item.cancelledAt = timestamp;
      await saveOrder(db, store, item);
    }
    // A test order and another store never leak into the filtered pages.
    await saveOrder(db, "other.myshopify.com", order("900"));
    const fake = order("901");
    fake.test = true;
    await saveOrder(db, store, fake);
    const { readSalesOrders } =
      await import("../src/server/sales/repository.ts");
    const filter = { status: "PAID" as const, category: "fest" };
    const first = await readSales(db, store, 30, undefined, filter);
    assert.equal(first.totals[0].orders, "24");
    assert.equal(
      (
        await readSales(db, store, 30, undefined, {
          ...filter,
          delivery: "UNKNOWN",
        })
      ).totals[0].orders,
      "24",
    );
    assert.equal(first.top[0].units, "69");
    assert.equal(first.orders.length, 10);
    assert.equal(first.hasMore, true);
    const second = await readSalesOrders(
      db,
      store,
      30,
      filter,
      first.nextCursor!,
    );
    assert.equal(second.orders.length, 10);
    assert.equal(second.hasMore, true);
    const third = await readSalesOrders(
      db,
      store,
      30,
      filter,
      second.nextCursor!,
    );
    assert.equal(third.orders.length, 4);
    assert.equal(third.hasMore, false);
    assert.equal(third.nextCursor, null);
    assert.equal(
      new Set(
        [...first.orders, ...second.orders, ...third.orders].map((o) => o.id),
      ).size,
      24,
    );
    const expired = await readSales(db, store, 30, undefined, {
      status: "EXPIRED",
      category: "nat",
    });
    assert.equal(expired.orders.length, 2);
    assert.equal(expired.totals[0].orders, "2");
    assert.equal(expired.top.length, 0);
    assert.equal(
      (
        await readSales(db, store, 30, undefined, {
          status: "CANCELLED",
          category: "",
        })
      ).orders.length,
      1,
    );
    assert.equal(
      (
        await readSales(db, store, 30, undefined, {
          status: "PAID",
          category: "antiga",
        })
      ).orders.length,
      0,
    );
    assert.equal(
      (
        await readSales(db, store, 30, undefined, {
          status: "all",
          category: "%",
        })
      ).orders.length,
      0,
    );
    await assert.rejects(() =>
      readSalesOrders(db, store, 30, filter, "malformed"),
    );
  } finally {
    await db.close();
  }
});

test("vendas preservam fotos, agrupam modalidades por produto e filtram entregas sem confundir pedidos", async () => {
  const db = new PGlite();
  try {
    const schema = await readFile(
      new URL("../src/server/sales/schema.sql", import.meta.url),
      "utf8",
    );
    await db.exec(schema);
    await db.exec(schema);
    for (const [id, title] of [
      ["1", "Retirada na loja"],
      ["2", "Sedex"],
      ["3", "Motoboy"],
      ["4", "Correios PAC"],
      ["5", ""],
    ]) {
      const sale = order(id);
      sale.lineItems.nodes[0].image = {
        url: "https://cdn.shopify.com/s/files/test/product.png",
      };
      sale.shippingLines = {
        nodes: title
          ? [{ title, code: null, source: null, deliveryCategory: null }]
          : [],
        pageInfo: { hasNextPage: false, endCursor: null },
      };
      await saveOrder(db, store, sale);
    }
    const all = await readSales(db, store, 30);
    assert.equal(all.top[0].units, "15");
    assert.equal(all.top[0].pickup_units, "3");
    assert.equal(all.top[0].sedex_units, "3");
    assert.equal(all.top[0].motoboy_units, "3");
    assert.equal(all.top[0].other_units, "3");
    assert.equal(all.top[0].unknown_units, "3");
    assert.match(all.top[0].image, /cdn.shopify.com/);
    assert.equal(all.deliveries.length, 5);
    const sedex = await readSales(db, store, 30, undefined, {
      status: "PAID",
      category: "",
      delivery: "SEDEX",
    });
    assert.equal(sedex.orders.length, 1);
    assert.equal(sedex.orders[0].delivery_kind, "SEDEX");
    assert.equal(sedex.top[0].units, "3");
    assert.equal(sedex.totals[0].orders, "1");
    await db.exec(
      "UPDATE pitterpan_sales_orders SET processed_at='2026-10-02T03:00:00Z' WHERE id='gid://shopify/Order/2'",
    );
    const customFilter = {
      status: "PAID" as const,
      category: "",
      delivery: "SEDEX" as const,
      start: "2026-10-02",
      end: "2026-10-02",
    };
    const custom = await readSales(db, store, 30, undefined, customFilter);
    assert.equal(custom.totals[0].orders, "1");
    assert.equal(custom.orders[0].id, "gid://shopify/Order/2");
    assert.equal(
      (
        await readSalesOrders(db, store, 30, {
          ...customFilter,
          end: "2026-10-01",
          start: "2026-10-01",
        })
      ).orders.length,
      0,
    );
    await db.exec(
      "UPDATE pitterpan_sales_orders SET processed_at=now() WHERE id='gid://shopify/Order/2'",
    );

    const invalidPhoto = order("6");
    invalidPhoto.lineItems.nodes[0].image = {
      url: "https://untrusted.example/photo.png",
    };
    await saveOrder(db, store, invalidPhoto);
    assert.equal(
      (
        await db.query<{ image_url: string | null }>(
          "SELECT image_url FROM pitterpan_sales_items WHERE order_id='gid://shopify/Order/6'",
        )
      ).rows[0].image_url,
      null,
    );
    const partial = order("7");
    partial.shippingLines = {
      nodes: [],
      pageInfo: { hasNextPage: true, endCursor: "next" },
    };
    await assert.rejects(() => saveOrder(db, store, partial));
    // A deploy before the additive migration still renders legacy sales as unknown.
    await db.exec(
      "ALTER TABLE pitterpan_sales_orders DROP COLUMN delivery_kind; ALTER TABLE pitterpan_sales_orders DROP COLUMN delivery_label; ALTER TABLE pitterpan_sales_items DROP COLUMN image_url;",
    );
    assert.equal(
      (await readSales(db, store, 30)).orders[0].delivery_kind,
      "UNKNOWN",
    );
    await db.exec(schema);
    assert.equal((await readSales(db, store, 30)).top[0].unknown_units, "18");
  } finally {
    await db.close();
  }
});

test("financeiro separa recebido, estorno e expirado, preservando reembolsos de cancelados", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      await readFile(
        new URL("../src/server/sales/schema.sql", import.meta.url),
        "utf8",
      ),
    );
    const fixtures = [
      {
        id: "101",
        status: "PAID",
        received: "100.00",
        refunded: "0.00",
        net: "100.00",
        cancel: false,
      },
      {
        id: "102",
        status: "EXPIRED",
        received: "0.00",
        refunded: "0.00",
        net: "0.00",
        cancel: false,
      },
      {
        id: "103",
        status: "VOIDED",
        received: "0.00",
        refunded: "0.00",
        net: "0.00",
        cancel: false,
      },
      {
        id: "104",
        status: "PENDING",
        received: "0.00",
        refunded: "0.00",
        net: "0.00",
        cancel: false,
      },
      {
        id: "105",
        status: "PARTIALLY_PAID",
        received: "30.00",
        refunded: "0.00",
        net: "30.00",
        cancel: false,
      },
      {
        id: "106",
        status: "PARTIALLY_REFUNDED",
        received: "100.00",
        refunded: "25.50",
        net: "74.50",
        cancel: false,
      },
      {
        id: "107",
        status: "REFUNDED",
        received: "100.00",
        refunded: "100.00",
        net: "0.00",
        cancel: true,
      },
      {
        id: "108",
        status: "PAID",
        received: "100.00",
        refunded: "0.00",
        net: "100.00",
        cancel: true,
      },
    ];
    for (const f of fixtures) {
      const o = order(f.id);
      o.displayFinancialStatus = f.status;
      o.totalReceivedSet.shopMoney.amount = f.received;
      o.totalRefundedSet.shopMoney.amount = f.refunded;
      o.netPaymentSet.shopMoney.amount = f.net;
      if (f.cancel) o.cancelledAt = o.processedAt;
      await saveOrder(db, store, o);
    }
    const fake = order("999");
    fake.test = true;
    await saveOrder(db, store, fake);
    await saveOrder(db, "other.myshopify.com", order("998"));
    const data = await readSalesFinance(db, store, 30);
    const total = data.totals[0];
    assert.equal(total.orders, "8");
    assert.equal(Number(total.received), 430);
    assert.equal(Number(total.refunded), 125.5);
    assert.equal(Number(total.net), 304.5);
    assert.equal(total.expired, "1");
    assert.equal(Number(total.expired_value), 100);
    assert.equal(Number(total.voided_value), 100);
    assert.equal(Number(total.outstanding), 170);
    assert.equal(total.cancelled, "2");
    assert.equal(total.refunded_orders, "2");
    assert.equal(total.paid, "1");
    assert.equal(
      data.statuses.reduce((sum, s) => sum + Number(s.orders), 0),
      8,
    );
    assert.equal(
      data.daily.reduce((sum, s) => sum + Number(s.net), 0),
      304.5,
    );
    const refunded = await readSalesFinance(db, store, 30, {
      status: "REFUNDED",
      category: "",
    });
    assert.equal(refunded.totals[0].orders, "1");
    assert.equal(Number(refunded.totals[0].refunded), 100);
    const page = await readSalesOrders(db, store, 30, {
      status: "REFUNDED",
      category: "",
    });
    assert.ok(page.orders[0].cancelled_at);
    assert.equal(Number(page.orders[0].received), 100);
    assert.equal(Number(page.orders[0].refunded), 100);
    await db.query(
      "UPDATE pitterpan_sales_orders SET net=999 WHERE store=$1 AND id=$2",
      [store, "gid://shopify/Order/101"],
    );
    const mismatch = await readSalesFinance(db, store, 30);
    assert.equal(mismatch.totals[0].inconsistent, "1");
    assert.equal(Number(mismatch.totals[0].net), 304.5);
    const empty = await readSalesFinance(db, store, 30, {
      status: "all",
      category: "",
      start: "2020-01-01",
      end: "2020-01-31",
    });
    assert.equal(empty.totals.length, 0);
    const dollar = order("120");
    for (const field of [
      "totalPriceSet",
      "totalReceivedSet",
      "totalRefundedSet",
      "netPaymentSet",
    ] as const)
      dollar[field].shopMoney.currencyCode = "USD";
    await saveOrder(db, store, dollar);
    const currencies = await readSalesFinance(db, store, 30);
    assert.equal(currencies.totals.length, 2);
    assert.equal(
      Number(currencies.totals.find((t) => t.currency === "BRL")!.net),
      304.5,
    );
    assert.equal(
      Number(currencies.totals.find((t) => t.currency === "USD")!.net),
      100,
    );
    const beforeMidnight = order("121");
    beforeMidnight.processedAt = "2025-01-02T02:59:59Z";
    await saveOrder(db, store, beforeMidnight);
    const afterMidnight = order("122");
    afterMidnight.processedAt = "2025-01-02T03:00:00Z";
    await saveOrder(db, store, afterMidnight);
    const day = await readSalesFinance(db, store, 30, {
      status: "all",
      category: "",
      start: "2025-01-01",
      end: "2025-01-01",
    });
    assert.equal(day.totals[0].orders, "1");
    assert.equal(day.daily[0].day, "2025-01-01");
  } finally {
    await db.close();
  }
});

test("clientes: compara por ID, separa moeda e loja e mantém pendências independentes do filtro", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      await readFile(
        new URL("../src/server/sales/schema.sql", import.meta.url),
        "utf8",
      ),
    );
    const customer = {
      id: "gid://shopify/Customer/77",
      name: "Pessoa Exemplo",
      checkedAt: new Date().toISOString(),
    };
    const paid = { ...order("701"), customerInfo: customer };
    const pending = {
      ...order("702"),
      customerInfo: customer,
      displayFinancialStatus: "PENDING",
      totalReceivedSet: { shopMoney: { amount: "0.00", currencyCode: "BRL" } },
      netPaymentSet: { shopMoney: { amount: "0.00", currencyCode: "BRL" } },
    };
    const namesake = {
      ...pending,
      id: "gid://shopify/Order/703",
      customerInfo: { ...customer, id: "gid://shopify/Customer/88" },
    };
    await saveOrder(db, store, paid);
    await saveOrder(db, store, pending);
    await saveOrder(db, store, namesake);
    await saveOrder(db, "other.myshopify.com", {
      ...pending,
      id: "gid://shopify/Order/704",
    });
    const foreign = {
      ...pending,
      id: "gid://shopify/Order/705",
      totalPriceSet: { shopMoney: { amount: "5.00", currencyCode: "USD" } },
      totalReceivedSet: { shopMoney: { amount: "0.00", currencyCode: "USD" } },
      totalRefundedSet: { shopMoney: { amount: "0.00", currencyCode: "USD" } },
      netPaymentSet: { shopMoney: { amount: "0.00", currencyCode: "USD" } },
    };
    await saveOrder(db, store, foreign);
    const { readSalesOrders } =
      await import("../src/server/sales/repository.ts");
    const data = await readSalesOrders(db, store, 30, {
      status: "PAID",
      category: "",
      delivery: "all",
      start: "",
      end: "",
    });
    assert.equal(data.orders.length, 1);
    assert.equal(data.orders[0].customer_name, "Pessoa Exemplo");
    assert.equal(data.orders[0].customer_pending_orders, "1");
    assert.equal(data.orders[0].customer_pending_value, "100.00");
    assert.equal(data.orders[0].customer_paid_orders, "1");
    const { readOrderCustomer, refreshOrderCustomers } =
      await import("../src/server/sales/customers.ts");
    const restricted = {
      query: async <T>(q: string): Promise<T> => {
        if (q.includes("displayName")) throw Error("restricted");
        return {
          order: { updatedAt: paid.updatedAt, customer: { id: customer.id } },
        } as T;
      },
    };
    const identity = await readOrderCustomer(
      restricted,
      paid.id,
      paid.updatedAt,
    );
    assert.equal(identity?.id, customer.id);
    assert.equal(identity?.name, null);
    const result = await refreshOrderCustomers(
      db,
      {
        query: async <T>(): Promise<T> =>
          ({
            nodes: [
              {
                id: paid.id,
                updatedAt: paid.updatedAt,
                customer: { id: customer.id, displayName: "Nome atualizado" },
              },
              {
                id: "gid://shopify/Order/704",
                updatedAt: paid.updatedAt,
                customer: { id: customer.id, displayName: "Outra loja" },
              },
            ],
          }) as T,
      },
      store,
      [paid.id],
    );
    assert.equal(result.loaded, 1);
    assert.equal(result.orders[0].customer_name, "Nome atualizado");
  } finally {
    await db.close();
  }
});
