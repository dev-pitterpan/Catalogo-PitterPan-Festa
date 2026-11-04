import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyDelivery,
  deliveryFilterKinds,
  deliveryLabels,
} from "../packages/shared/src/lib/admin/delivery.ts";
test("serviços reais da Shopify são distintos: PAC, Sedex, Motoboy, retirada, entrega local e Jadlog", () => {
  for (const [title, code, source, expected] of [
    [
      "Matriz - Pitter Pan Festas",
      "Matriz - Pitter Pan Festas",
      "shopify",
      "PICKUP",
    ],
    ["Envio Normal (PAC)", "03298", "Frenet", "PAC"],
    ["Envio Expresso (Sedex)", "03220", "Frenet", "SEDEX"],
    ["Envio via Motoboy", "OWNE", "Frenet", "MOTOBOY"],
    ["Jadlog Package", "F_3", "Frenet", "JADLOG"],
    ["Local Delivery", "Local Delivery", "shopify", "LOCAL"],
    ["Retirada na Loja América", "", "", "PICKUP"],
    ["Frete grátis", "", "", "OTHER"],
  ])
    assert.equal(classifyDelivery([{ title, code, source }]).kind, expected);
  assert.equal(
    classifyDelivery([{ title: "", deliveryCategory: "LOCAL_PICKUP" }]).kind,
    "PICKUP",
  );
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
test("modalidades possuem opções distintas nos filtros", () => {
  assert.equal(
    new Set(deliveryFilterKinds.map((kind) => deliveryLabels[kind])).size,
    deliveryFilterKinds.length,
  );
  assert.equal(deliveryLabels.OTHER, "Outras entregas");
});
