import test from "node:test";
import assert from "node:assert/strict";
import { containsPattern, matchesFilter } from "../src/lib/admin/filters.ts";
test("filtros de marca e categoria aceitam trechos e ignoram maiúsculas", () => {
  assert.equal(matchesFilter("Silver Plastic", "plastic"), true);
  assert.equal(matchesFilter("Confeitaria", " confei "), true);
  assert.equal(matchesFilter("Harald", "Sicao"), false);
  assert.equal(matchesFilter(undefined, ""), true);
  assert.equal(matchesFilter(undefined, "marca"), false);
});
test("busca parcial preserva porcentagem, sublinhado e barra como texto literal", () => {
  assert.equal(containsPattern("  Silver  "), "%Silver%");
  assert.equal(containsPattern("50%_\\"), "%50\\%\\_\\\\%");
  assert.equal(containsPattern(""), "%%");
});
