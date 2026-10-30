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

test("busca tolera pequenas trocas, omissões e letras extras sem adivinhar situações ambíguas", () => {
  for (const term of [
    "expriados",
    "expriado",
    "expirdos",
    "expirrados",
    "EXPRÍADOS",
  ])
    assert.equal(searchOrderStatus(term), "EXPIRED", term);
  assert.equal(searchOrderStatus("canceldaos"), "CANCELLED");
  assert.equal(searchOrderStatus("reembolsdaos"), "REFUNDS");
  assert.equal(searchOrderStatus("pendnete"), "PENDING");
  assert.equal(searchOrderStatus("pgao"), "PAID");
  assert.equal(searchOrderStatus("xyz"), "NO_MATCH");
  assert.equal(searchOrderStatus("a".repeat(500)), "NO_MATCH");
  assert.equal(searchOrderStatus("banana"), "NO_MATCH");
  assert.equal(searchOrderStatus(""), "all");
});
