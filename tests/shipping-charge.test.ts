import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { shippingCharge } from "../packages/shared/src/server/sales/shipping.ts";
import { shippingChargeLabel } from "../packages/shared/src/lib/admin/shipping-charge.ts";
import {
  orderSchema,
  type SalesOrder,
} from "../packages/shared/src/server/sales/model.ts";
import {
  saveOrder,
  readSalesOrders,
  readSalesOperations,
} from "../packages/shared/src/server/sales/repository.ts";
const money = (amount: string, currencyCode = "BRL") => ({
  shopMoney: { amount, currencyCode },
});
const shipping = (
  amount?: string,
  title = "Local Delivery",
  isRemoved = false,
) => ({
  title,
  code: title,
  source: "shopify",
  deliveryCategory: null,
  isRemoved,
  ...(amount !== undefined ? { discountedPriceSet: money(amount) } : {}),
});
const lines = (nodes: ReturnType<typeof shipping>[]) => ({
  nodes,
  pageInfo: { hasNextPage: false, endCursor: null },
});
function order(
  id: number,
  amount?: string,
  title = "Local Delivery",
): SalesOrder {
  return {
    id: `gid://shopify/Order/${id}`,
    name: `#${id}`,
    processedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    cancelledAt: null,
    test: false,
    displayFinancialStatus: "PAID",
    displayFulfillmentStatus: "UNFULFILLED",
    totalPriceSet: money("100"),
    totalReceivedSet: money("100"),
    totalRefundedSet: money("0"),
    netPaymentSet: money("100"),
    shippingLines: lines([shipping(amount, title)]),
    lineItems: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } },
  };
}
test("frete: zero confirmado, valor ausente, linhas removidas e soma decimal são distintos", () => {
  assert.deepEqual(shippingCharge(undefined), { amount: null, checked: false });
  assert.deepEqual(shippingCharge(lines([])), { amount: null, checked: true });
  assert.deepEqual(shippingCharge(lines([shipping()])), {
    amount: null,
    checked: false,
  });
  assert.deepEqual(shippingCharge(lines([shipping("0.0")])), {
    amount: "0.00",
    checked: true,
  });
  assert.deepEqual(
    shippingCharge(
      lines([shipping("0.10"), shipping("0.20"), shipping("40", "Old", true)]),
    ),
    { amount: "0.30", checked: true },
  );
  assert.deepEqual(
    shippingCharge(lines([shipping("90071992547409.91"), shipping("0.09")])),
    { amount: "90071992547410.00", checked: true },
  );
  assert.equal(
    shippingChargeLabel(null, "BRL", false, "LOCAL"),
    "Frete a conferir",
  );
  assert.equal(
    shippingChargeLabel(null, "BRL", true, "LOCAL"),
    "Frete não informado",
  );
  assert.match(
    shippingChargeLabel("0.00", "BRL", true, "LOCAL"),
    /^Frete grátis/,
  );
  assert.match(
    shippingChargeLabel("0", "BRL", true, "PICKUP"),
    /^Sem cobrança de frete/,
  );
  assert.match(shippingChargeLabel("12.50", "BRL", true, "LOCAL"), /12,50/);
  assert.ok(
    !shippingChargeLabel("12.50", "BRL", true, "LOCAL").includes("grátis"),
  );
});
test("pedido preserva modalidade e preço cobrado antes dos reembolsos, sem somar frete novamente nos totais", async () => {
  const db = new PGlite();
  const store = "fixture.myshopify.com";
  try {
    await db.exec(
      await readFile(
        new URL(
          "../packages/shared/src/server/sales/schema.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await saveOrder(db, store, order(1, "0"));
    await saveOrder(db, store, order(2, "12.50"));
    const refund = order(3, "20.10", "Envio Expresso (Sedex)");
    refund.displayFinancialStatus = "PARTIALLY_REFUNDED";
    refund.totalRefundedSet = money("20.10");
    refund.netPaymentSet = money("79.90");
    await saveOrder(db, store, refund);
    const legacy = order(4);
    legacy.shippingLines = undefined;
    await saveOrder(db, store, legacy);
    const filters = {
      status: "all" as const,
      category: "",
      delivery: "all" as const,
    };
    const rows = (await readSalesOrders(db, store, 30, filters)).orders;
    assert.equal(rows.find((o) => o.name === "#1")?.delivery_kind, "LOCAL");
    assert.equal(rows.find((o) => o.name === "#1")?.shipping_charge, "0.00");
    assert.equal(
      rows.find((o) => o.name === "#1")?.shipping_charge_checked,
      "true",
    );
    assert.equal(rows.find((o) => o.name === "#2")?.shipping_charge, "12.50");
    assert.equal(rows.find((o) => o.name === "#3")?.shipping_charge, "20.10");
    assert.equal(
      rows.find((o) => o.name === "#4")?.shipping_charge_checked,
      "false",
    );
    const operations = await readSalesOperations(db, store, 30, filters);
    assert.equal(Number(operations.totals[0].received), 400);
    assert.equal(Number(operations.totals[0].net), 379.9);
    assert.equal(
      operations.awaiting.find((o) => o.name === "#2")?.shipping_charge,
      "12.50",
    );
    const incomplete = order(1);
    incomplete.shippingLines = undefined;
    await saveOrder(db, store, incomplete);
    assert.equal(
      (await readSalesOrders(db, store, 30, filters)).orders.find(
        (o) => o.name === "#1",
      )?.shipping_charge_checked,
      "true",
    );
    const wrongCurrency = order(5, "1");
    wrongCurrency.shippingLines!.nodes[0].discountedPriceSet = money(
      "1",
      "USD",
    );
    assert.equal(orderSchema.safeParse(wrongCurrency).success, false);
    await db.exec(
      "ALTER TABLE pitterpan_sales_orders DROP COLUMN shipping_charge; ALTER TABLE pitterpan_sales_orders DROP COLUMN shipping_charge_checked",
    );
    const old = (await readSalesOrders(db, store, 30, filters)).orders;
    assert.ok(
      old.every(
        (o) =>
          o.shipping_charge == null && o.shipping_charge_checked === "false",
      ),
    );
  } finally {
    await db.close();
  }
});
