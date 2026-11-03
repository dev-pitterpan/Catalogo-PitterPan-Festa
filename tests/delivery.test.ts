import test from "node:test";
import assert from "node:assert/strict";
import {
  deliveryFilterKinds,
  deliveryLabels,
  classifyDelivery,
} from "../src/lib/admin/delivery.ts";
test("modalidade respeita Motoboy/Sedex e a regra da loja para as demais opções", () => {
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
  assert.equal(classifyDelivery([{ title: "Frete grátis" }]).kind, "PICKUP");
  assert.equal(classifyDelivery([{ title: "Entrega local" }]).kind, "PICKUP");
  assert.equal(classifyDelivery([{ title: "Correios PAC" }]).kind, "PICKUP");
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

test("filtro mostra uma única opção de retirada e admite o código legado", () => {
  assert.equal(
    new Set(deliveryFilterKinds.map((kind) => deliveryLabels[kind])).size,
    deliveryFilterKinds.length,
  );
  assert.equal(deliveryLabels.PICKUP, "Retirada na loja");
  assert.equal(deliveryLabels.OTHER, "Retirada na loja");
});

test("nomes legados e outras opções representam retirada conforme regra da loja", () => {
  for (const title of [
    "Local Delivery",
    "LocalDelivery",
    "local_delivery",
    "Local-Delivery",
  ])
    assert.equal(classifyDelivery([{ title }]).kind, "PICKUP");
  assert.equal(classifyDelivery([{ title: "Entrega local" }]).kind, "PICKUP");
  assert.equal(classifyDelivery([{ title: "Correios PAC" }]).kind, "PICKUP");
});
