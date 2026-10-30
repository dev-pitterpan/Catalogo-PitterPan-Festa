import test from "node:test";
import assert from "node:assert/strict";
import { searchOrderStatus } from "../src/lib/admin/order-status-search.ts";
test("busca de situação reconhece digitação, plurais, acentos e estornos sem transformar erro em todos", () => {
  for (const value of ["pago", "PAGOS", "paga", "pag"])
    assert.equal(searchOrderStatus(value), "PAID");
  assert.equal(searchOrderStatus("exp"), "EXPIRED");
  assert.equal(searchOrderStatus("expirados"), "EXPIRED");
  assert.equal(searchOrderStatus("cancel"), "CANCELLED");
  assert.equal(searchOrderStatus("estornados"), "REFUNDS");
  assert.equal(searchOrderStatus("reembolso parcial"), "PARTIALLY_REFUNDED");
  assert.equal(searchOrderStatus("reembolso total"), "REFUNDED");
  assert.equal(searchOrderStatus("pend"), "PENDING");
  assert.equal(searchOrderStatus("não informado"), "UNKNOWN");
  assert.equal(searchOrderStatus("parcialmente pago"), "PARTIALLY_PAID");
  assert.equal(searchOrderStatus(""), "all");
  assert.equal(searchOrderStatus("   "), "all");
  assert.equal(searchOrderStatus("qualquer coisa"), "NO_MATCH");
});
