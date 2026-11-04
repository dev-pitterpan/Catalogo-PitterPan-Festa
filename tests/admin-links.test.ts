import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import {
  salesLink,
  salesOverviewCards,
  salesSectionFromHash,
} from "../packages/shared/src/lib/admin/sales-links.ts";
import { salesFilterSchema } from "../packages/shared/src/server/sales/filters.ts";
import {
  stockFilters,
  matchesStock,
} from "../packages/shared/src/lib/admin/stock.ts";
import { stockSelectionSql } from "../packages/shared/src/server/admin/stock.ts";
test("atalhos de vendas aplicam o filtro anunciado e preservam só o contexto comercial", () => {
  const source = new URLSearchParams({
    days: "7",
    start: "2026-10-01",
    end: "2026-10-07",
    category: "Festa & decoração",
    delivery: "PICKUP",
    revision: "8",
    cursor: "99",
    view: "operations",
    focus: "operations",
    snapshot: "old",
  });
  const cards = salesOverviewCards(source);
  assert.equal(cards.length, 4);
  const actualCard = new URL(
    cards.find((c) => c.label === "Atendimento em aberto")!.href,
    "https://local.test",
  );
  assert.equal(actualCard.searchParams.get("fulfillment"), "AWAITING");
  assert.equal(actualCard.hash, "#recent-orders");
  const refundCard = new URL(
    cards.find((c) => c.key === "refunds")!.href,
    "https://local.test",
  );
  assert.equal(refundCard.searchParams.get("status"), "REFUNDS");
  const netCard = new URL(
    cards.find((c) => c.key === "net")!.href,
    "https://local.test",
  );
  assert.equal(netCard.pathname, "/gestor/analises/");
  const awaiting = new URL(
    salesLink(source, { fulfillment: "AWAITING" }, "recent-orders"),
    "https://local.test",
  );
  assert.equal(awaiting.pathname, "/gestor/vendas/");
  assert.equal(awaiting.hash, "#recent-orders");
  assert.equal(awaiting.searchParams.get("fulfillment"), "AWAITING");
  assert.equal(awaiting.searchParams.get("delivery"), "PICKUP");
  assert.equal(awaiting.searchParams.get("category"), "Festa & decoração");
  for (const key of ["revision", "cursor", "view", "focus", "snapshot"])
    assert.equal(awaiting.searchParams.has(key), false);
  const refund = new URL(
    salesLink(source, { status: "REFUNDS" }, "recent-orders"),
    "https://local.test",
  );
  assert.equal(refund.searchParams.get("status"), "REFUNDS");
  const products = new URL(
    salesLink(source, {}, "sold-products"),
    "https://local.test",
  );
  assert.equal(products.hash, "#sold-products");
  for (const id of ["recent-orders", "sold-products", "sales-operations"])
    assert.equal(salesSectionFromHash(`#${id}`), id);
  assert.equal(salesSectionFromHash("#desconhecido"), undefined);
  assert.equal(
    salesLink(
      new URLSearchParams({
        status: "all",
        delivery: "all",
        fulfillment: "all",
      }),
    ),
    "/gestor/vendas/",
  );
  assert.equal(
    salesFilterSchema.safeParse({ fulfillment: "inventado" }).success,
    false,
  );
});
test("estoque: cada segmento seleciona as mesmas variantes no filtro local e SQL", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "CREATE TABLE stock_fixture(id integer,inventory_quantity integer); INSERT INTO stock_fixture VALUES (1,NULL),(2,-2),(3,0),(4,1),(5,5),(6,6),(7,99),(8,100),(9,101)",
    );
    const items = (
      await db.query<{ id: number; inventory_quantity: number | null }>(
        "SELECT * FROM stock_fixture ORDER BY id",
      )
    ).rows;
    for (const filter of stockFilters) {
      const expected = items
        .filter((r) => matchesStock(r.inventory_quantity, filter, 5, 100))
        .map((r) => r.id);
      const actual = await db.query<{ id: number }>(
        `SELECT id FROM stock_fixture WHERE $1::text='' AND $2::text='' AND $3::text='' AND $4::text='' AND $5::text='' AND ${stockSelectionSql} ORDER BY id`,
        ["", "", "", "", "", filter, 5, 100],
      );
      assert.deepEqual(
        actual.rows.map((r) => r.id),
        expected,
        filter,
      );
    }
  } finally {
    await db.close();
  }
});
