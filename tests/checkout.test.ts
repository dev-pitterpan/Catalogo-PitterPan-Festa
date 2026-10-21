import test from "node:test";
import assert from "node:assert/strict";
import { prepareCheckout } from "../src/lib/checkout.ts";
import type { Product } from "../src/types/catalog.ts";
const product: Product = {
  id: "8936",
  name: "Frank",
  description: "",
  image: "",
  shopifyVariantId: "45465265963062",
};
const shop = "https://www.pitterpan.com.br/";
test("checkout usa variante atual e soma quantidades da seleção", () => {
  const second = { ...product, id: "other", shopifyVariantId: "12345" };
  assert.equal(
    prepareCheckout(
      [
        { id: "8936", quantity: 2 },
        { id: "8936", quantity: 1 },
        { id: "other", quantity: 4 },
      ],
      [product, second],
      shop,
    ),
    shop + "cart/45465265963062:3,12345:4",
  );
});
test("checkout bloqueia seleção parcial, IDs desconhecidos e ambíguos", () => {
  assert.throws(
    () =>
      prepareCheckout(
        [
          { id: "8936", quantity: 1 },
          { id: "unknown", quantity: 1 },
        ],
        [product],
        shop,
      ),
    /unknown/,
  );
  assert.throws(
    () =>
      prepareCheckout(
        [{ id: "8936", quantity: 1 }],
        [{ ...product, shopifyVariantId: undefined }],
        shop,
      ),
    /Frank/,
  );
  assert.throws(
    () =>
      prepareCheckout([{ id: "8936", quantity: 1 }], [product, product], shop),
    /8936/,
  );
});
test("checkout rejeita seleção vazia, variantes inválidas e quantidades incorretas", () => {
  assert.throws(() => prepareCheckout([], [product], shop));
  for (const quantity of [0, -1, 1.5, 1000, NaN])
    assert.throws(() =>
      prepareCheckout([{ id: "8936", quantity }], [product], shop),
    );
  assert.throws(() =>
    prepareCheckout(
      [{ id: "8936", quantity: 1 }],
      [{ ...product, shopifyVariantId: "bad/path" }],
      shop,
    ),
  );
  assert.throws(() =>
    prepareCheckout(
      [
        { id: "8936", quantity: 600 },
        { id: "8936", quantity: 600 },
      ],
      [product],
      shop,
    ),
  );
});
