import test from "node:test";
import assert from "node:assert/strict";
import {
  departmentHandles,
  departmentSummaries,
  storefrontNavigation,
  uniqueVariants,
  brandHandles,
} from "../src/lib/catalog/departments.ts";
import type { Product } from "../src/types/catalog.ts";
const summary = (slug: string) => ({
  slug,
  name: slug,
  description: "",
  accent: "",
  cardClass: "",
});
test("departamentos unem coleções e preservam acesso por handles antigos", () => {
  assert.ok(departmentHandles("doces-e-guloseimas").includes("doces"));
  assert.ok(departmentHandles("doces-e-guloseimas").includes("guloseimas"));
  assert.ok(
    departmentHandles("embalagens-e-descartaveis").includes("descartaveis"),
  );
  assert.ok(
    departmentHandles("embalagens-e-descartaveis").includes(
      "descartaveis-embalagens",
    ),
  );
  assert.deepEqual(
    departmentHandles("utensilios-para-confeitar"),
    departmentHandles("utensilios-para-confeitar-1"),
  );
  assert.deepEqual(departmentHandles("natal"), ["natal", "confeitarias-natal"]);
  assert.deepEqual(departmentHandles("velas"), ["velas"]);
});
test("navegação mostra departamentos e datas, com marcas apenas nos filtros", () => {
  const raw = [
    summary("todos"),
    summary("velas"),
    summary("halloween"),
    ...[...brandHandles].map(summary),
    ...departmentSummaries(),
  ];
  const nav = storefrontNavigation(raw);
  assert.equal(nav.length, 10);
  assert.ok(nav.every((item) => !brandHandles.has(item.slug)));
  assert.ok(nav.some((item) => item.slug === "halloween"));
  assert.ok(raw.some((item) => item.slug === "bwb"));
});
test("união elimina apenas variantes repetidas, inclusive com SKU compartilhado", () => {
  const product = (id: string, variant: string): Product => ({
    id,
    shopifyVariantId: variant,
    sku: "mesmo-sku",
    name: "Produto",
    description: "",
    image: "",
  });
  const result = uniqueVariants([
    product("a", "1"),
    product("a", "1"),
    product("b", "2"),
  ]);
  assert.deepEqual(
    result.map((item) => item.shopifyVariantId),
    ["1", "2"],
  );
});
