import test from "node:test";
import assert from "node:assert/strict";
import { classifyDelivery } from "../src/lib/admin/delivery.ts";
test("modalidade vem de serviços explícitos, sem tratar frete grátis ou PAC como retirada/Sedex", () => {
  assert.equal(
    classifyDelivery([{ title: "Retirada na Loja América" }]).kind,
    "PICKUP",
  );
  assert.equal(
    classifyDelivery([{ title: "", deliveryCategory: "LOCAL_PICKUP" }]).kind,
    "PICKUP",
  );
  assert.equal(
    classifyDelivery([{ title: "Entrega por motoboy" }]).kind,
    "MOTOBOY",
  );
  assert.equal(classifyDelivery([{ title: "Correios SEDEX10" }]).kind, "SEDEX");
  assert.equal(classifyDelivery([{ title: "Frete grátis" }]).kind, "OTHER");
  assert.equal(classifyDelivery([{ title: "Entrega local" }]).kind, "OTHER");
  assert.equal(classifyDelivery([{ title: "Correios PAC" }]).kind, "OTHER");
  assert.equal(classifyDelivery([]).kind, "UNKNOWN");
  assert.equal(
    classifyDelivery([{ title: "Retirada ou motoboy" }]).kind,
    "UNKNOWN",
  );
  assert.equal(
    classifyDelivery([{ title: "Sedex" }, { title: "Retirada" }]).kind,
    "MIXED",
  );
  assert.equal(
    classifyDelivery([
      { title: "Sedex", isRemoved: true },
      { title: "Retirada" },
    ]).kind,
    "PICKUP",
  );
});
