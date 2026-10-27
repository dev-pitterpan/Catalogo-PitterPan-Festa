import test from "node:test";
import assert from "node:assert/strict";
import { collectionGroups } from "../src/lib/catalog/navigation.ts";
const item = (slug: string, name: string) => ({
  slug,
  name,
  cardClass: "",
  description: "",
  accent: "#ffffff",
});

test("subcoleções sazonais permanecem na família e a família ativa vem primeiro", () => {
  const groups = collectionGroups(
    [
      item("todos", "Todos"),
      item("confeitarias-natal", "Confeitarias Natal"),
      item("natal", "Natal"),
      item("halloween", "Halloween"),
      item("decoracoes-halloween", "Decorações Halloween"),
    ],
    "decoracoes-halloween",
  );
  assert.deepEqual(
    groups.map((group) => group.label),
    ["Catálogo completo", "Halloween", "Natal e fim de ano"],
  );
  assert.deepEqual(
    groups[2].items.map((entry) => entry.slug),
    ["natal", "confeitarias-natal"],
  );
  assert.equal(groups[1].items.length, 2);
});

test("busca pelo assunto encontra filhos e handles legados usam a classificação correta", () => {
  const catalogs = [
    item("formas-para-bolo", "Formas para Bolo"),
    item("decoracoes", "Aviamentos"),
    item("ponto-das-festas", "Ponto das Festas"),
    item("sacola-nova", "Coleção nova"),
  ];
  const groups = collectionGroups(catalogs, "formas-para-bolo", "confeitaria");
  assert.equal(groups.length, 1);
  assert.equal(groups[0].items[0].slug, "formas-para-bolo");
  const full = collectionGroups([...catalogs, catalogs[0]], "");
  assert.equal(full.flatMap((group) => group.items).length, 4);
  assert.equal(
    full.find((group) => group.label === "Artesanato e papelaria")?.items[0]
      .name,
    "Aviamentos",
  );
  assert.equal(
    full.find((group) => group.label === "Marcas")?.items[0].slug,
    "ponto-das-festas",
  );
  assert.equal(full.at(-1)?.label, "Outras coleções");
});
