import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { orderSchema, type SalesOrder } from "../src/server/sales/model.ts";
import {
  saveOrder,
  readSalesFinance,
  readSalesOperations,
  readSalesOrders,
} from "../src/server/sales/repository.ts";
const store = "fixture.myshopify.com";
const money = (amount: string, currencyCode = "BRL") => ({
  shopMoney: { amount, currencyCode },
});
function order(id: number, patch: Partial<SalesOrder> = {}): SalesOrder {
  return {
    id: `gid://shopify/Order/${id}`,
    name: `#${id}`,
    processedAt: "2026-10-20T14:30:00Z",
    updatedAt: "2026-10-20T14:30:00Z",
    cancelledAt: null,
    test: false,
    customerInfo: {
      id: "gid://shopify/Customer/1",
      name: "Cliente de teste",
      checkedAt: "2026-10-20T14:30:00Z",
    },
    displayFinancialStatus: "PAID",
    displayFulfillmentStatus: "UNFULFILLED",
    totalPriceSet: money("100"),
    totalReceivedSet: money("100"),
    totalRefundedSet: money("0"),
    netPaymentSet: money("100"),
    totalOutstandingSet: money("0"),
    currentTotalPriceSet: money("100"),
    lineItems: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } },
    ...patch,
  };
}
const filters = {
  status: "all" as const,
  category: "",
  delivery: "all" as const,
  start: "2026-10-01",
  end: "2026-10-31",
};
test("saldos oficiais preservam centavos, distinguem estimativa e rejeitam moedas inconsistentes", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      await readFile(
        new URL("../src/server/sales/schema.sql", import.meta.url),
        "utf8",
      ),
    );
    await saveOrder(
      db,
      store,
      order(1, {
        displayFinancialStatus: "PARTIALLY_PAID",
        totalReceivedSet: money("40"),
        netPaymentSet: money("40"),
        totalOutstandingSet: money("35.99"),
        currentTotalPriceSet: money("75.99"),
      }),
    );
    await saveOrder(
      db,
      store,
      order(2, {
        displayFinancialStatus: "PENDING",
        totalReceivedSet: money("0"),
        netPaymentSet: money("0"),
        totalOutstandingSet: undefined,
        currentTotalPriceSet: undefined,
      }),
    );
    await saveOrder(
      db,
      store,
      order(3, {
        displayFinancialStatus: "PENDING",
        totalReceivedSet: money("0"),
        netPaymentSet: money("0"),
        totalOutstandingSet: money("-5"),
      }),
    );
    const f = await readSalesFinance(db, store, 30, filters);
    assert.equal(Number(f.totals[0].outstanding), 135.99);
    assert.equal(f.totals[0].outstanding_estimated, "1");
    const rows = await readSalesOrders(db, store, 30, filters);
    for (const row of rows.orders)
      assert.equal(Number(row.customer_pending_value), 135.99);
    assert.equal(
      rows.orders.find((o) => o.name === "#1")?.current_total,
      "75.99",
    );
    assert.equal(
      rows.orders.find((o) => o.name === "#3")?.outstanding,
      "-5.00",
    );
    assert.equal(
      orderSchema.safeParse(
        order(4, { totalOutstandingSet: money("3", "USD") }),
      ).success,
      false,
    );
    assert.equal(
      orderSchema.safeParse(
        order(4, { currentTotalPriceSet: money("3", "USD") }),
      ).success,
      false,
    );
    await db.exec(
      "ALTER TABLE pitterpan_sales_orders DROP COLUMN outstanding; ALTER TABLE pitterpan_sales_orders DROP COLUMN current_total",
    );
    const legacy = await readSalesFinance(db, store, 30, filters);
    assert.equal(legacy.totals[0].outstanding_estimated, "3");
    assert.equal(Number(legacy.totals[0].outstanding), 260);
  } finally {
    await db.close();
  }
});
test("operação separa reembolso de cancelamento e pagamento de atendimento, respeitando filtros e loja", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      await readFile(
        new URL("../src/server/sales/schema.sql", import.meta.url),
        "utf8",
      ),
    );
    await saveOrder(
      db,
      store,
      order(1, {
        displayFinancialStatus: "PARTIALLY_REFUNDED",
        totalPriceSet: money("4.99"),
        totalReceivedSet: money("4.99"),
        totalRefundedSet: money("4"),
        netPaymentSet: money("0.99"),
        currentTotalPriceSet: money("4.99"),
      }),
    );
    await saveOrder(
      db,
      store,
      order(2, {
        displayFinancialStatus: "REFUNDED",
        cancelledAt: "2026-10-21T14:00:00Z",
        totalPriceSet: money("236.93"),
        totalReceivedSet: money("236.93"),
        totalRefundedSet: money("236.93"),
        netPaymentSet: money("0"),
        currentTotalPriceSet: money("0"),
      }),
    );
    await saveOrder(
      db,
      store,
      order(3, { cancelledAt: "2026-10-21T14:00:00Z" }),
    );
    await saveOrder(
      db,
      store,
      order(4, {
        displayFulfillmentStatus: "READY_FOR_PICKUP",
        shippingLines: {
          nodes: [
            {
              title: "Matriz - Pitter Pan Festas",
              code: null,
              source: "shopify",
              deliveryCategory: null,
            },
          ],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      }),
    );
    await saveOrder(
      db,
      store,
      order(5, { displayFulfillmentStatus: "FULFILLED" }),
    );
    await saveOrder(db, store, order(6, { test: true }));
    await saveOrder(db, "another.myshopify.com", order(7));
    await saveOrder(
      db,
      store,
      order(8, { processedAt: "2026-09-01T10:00:00Z" }),
    );
    const data = await readSalesOperations(db, store, 30, filters);
    assert.equal(data.totals[0].orders, "5");
    assert.equal(data.fulfillment[0].awaiting, "2");
    assert.equal(data.fulfillment[0].ready, "1");
    assert.equal(data.refunds.length, 2);
    assert.equal(Number(data.totals[0].refunded), 240.93);
    assert.equal(data.refunds.find((o) => o.name === "#1")?.net, "0.99");
    assert.equal(data.awaiting.length, 2);
    assert.ok(
      !data.awaiting.some((o) =>
        ["#2", "#3", "#5", "#6", "#7", "#8"].includes(o.name),
      ),
    );
    const pickup = await readSalesOperations(db, store, 30, {
      ...filters,
      delivery: "PICKUP",
    });
    assert.equal(pickup.awaiting.length, 1);
    assert.equal(pickup.refunds.length, 0);
    const cancelled = await readSalesOperations(db, store, 30, {
      ...filters,
      status: "CANCELLED",
    });
    assert.equal(cancelled.refunds.length, 1);
    assert.equal(cancelled.awaiting.length, 0);
    const refunded = await readSalesOperations(db, store, 30, {
      ...filters,
      status: "REFUNDS",
    });
    assert.equal(refunded.refunds.length, 2);
    assert.equal(refunded.totals[0].orders, "2");
  } finally {
    await db.close();
  }
});

test("auditoria somente leitura identifica pedidos ausentes, desatualizados e valores diferentes sem alterar o histórico", async () => {
  const { auditSalesSnapshot, financialCents } =
    await import("../src/server/sales/audit.ts");
  assert.equal(financialCents("-0.01"), -1n);
  assert.equal(financialCents("9999999999999999.99"), 999999999999999999n);
  const db = new PGlite();
  try {
    await db.exec(
      await readFile(
        new URL("../src/server/sales/schema.sql", import.meta.url),
        "utf8",
      ),
    );
    const one = order(1),
      two = order(2),
      three = order(3),
      four = order(4);
    await saveOrder(db, store, one);
    await saveOrder(db, store, two);
    await saveOrder(db, store, four);
    const remote = [one, two, three];
    let calls = 0;
    const client = {
      async query<T>() {
        const page = calls++;
        return {
          orders: {
            nodes: page === 0 ? remote.slice(0, 2) : remote.slice(2),
            pageInfo: {
              hasNextPage: page === 0,
              endCursor: page === 0 ? "next" : null,
            },
          },
        } as T;
      },
    };
    await db.query(
      "UPDATE pitterpan_sales_orders SET refunded=0.01 WHERE id=$1",
      [one.id],
    );
    await db.query(
      "UPDATE pitterpan_sales_orders SET updated_at=updated_at-interval '1 second' WHERE id=$1",
      [two.id],
    );
    const before = await db.query(
      "SELECT * FROM pitterpan_sales_orders ORDER BY id",
    );
    const report = await auditSalesSnapshot(
      db,
      client,
      store,
      filters.start,
      filters.end,
    );
    assert.equal(calls, 2);
    assert.equal(report.counts.missing, 1);
    assert.equal(report.counts.extra, 1);
    assert.equal(report.counts.outdated, 1);
    assert.equal(report.counts.divergent, 1);
    assert.equal(report.issues.refunded, 1);
    assert.equal(report.consistent, false);
    assert.deepEqual(
      await db.query("SELECT * FROM pitterpan_sales_orders ORDER BY id"),
      before,
    );
    await assert.rejects(
      () =>
        auditSalesSnapshot(
          db,
          {
            async query<T>() {
              return {
                orders: {
                  nodes: [],
                  pageInfo: { hasNextPage: true, endCursor: "same" },
                },
              } as T;
            },
          },
          store,
          filters.start,
          filters.end,
        ),
      /sem progresso/,
    );
  } finally {
    await db.close();
  }
});
