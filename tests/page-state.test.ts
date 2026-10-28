import test from "node:test";
import assert from "node:assert/strict";
import { matchesCatalogRoute } from "../src/lib/catalog/page-state.ts";
import type { CatalogPageData } from "../src/types/catalog.ts";
const natal: CatalogPageData = {
  catalogs: [],
  config: null,
  catalog: {
    name: "Natal",
    slug: "natal",
    description: "",
    banner: "",
    products: [],
  },
};
test("Todos não aceita dados iniciais nem cache pertencentes a Natal", () => {
  assert.equal(matchesCatalogRoute(natal, "todos"), false);
  assert.equal(matchesCatalogRoute(natal, "natal"), true);
  assert.equal(
    matchesCatalogRoute(
      {
        ...natal,
        catalog: { ...natal.catalog!, name: "Todos", slug: "todos" },
      },
      "todos",
    ),
    true,
  );
});
test("página inicial não recebe catálogo de uma rota anterior", () => {
  assert.equal(matchesCatalogRoute(natal), false);
  assert.equal(matchesCatalogRoute({ ...natal, catalog: null }), true);
  assert.equal(matchesCatalogRoute(undefined, "todos"), false);
});
