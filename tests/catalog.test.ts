import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { productSearchScore } from "../src/lib/search.ts";
import { loadSelection, totalQuantity, whatsappUrl } from "../src/lib/quote.ts";
import type { Catalog, QuoteItem, SiteConfig } from "../src/types/catalog.ts";
const catalog: Catalog = JSON.parse(
  await readFile(
    new URL("../public/data/catalogs/halloween.json", import.meta.url),
    "utf8",
  ),
);
const config: SiteConfig = JSON.parse(
  await readFile(
    new URL("../public/data/config/site.json", import.meta.url),
    "utf8",
  ),
);
test("busca ignora acentos, aceita palavras parciais e pequenos erros", () => {
  const balloon = catalog.products.find((item) =>
    item.name.includes("Balões"),
  )!;
  for (const query of ["baloes", "balo", "baloess"])
    assert.ok(productSearchScore(balloon, query) > 0);
  assert.equal(productSearchScore(balloon, "computador astronomia"), 0);
});
test("carrinho antigo ganha quantidade e dados inválidos não impedem abertura", () => {
  assert.equal(
    loadSelection({ getItem: () => '[{"id":"HAL-001","name":"Kit"}]' })[0]
      .quantity,
    1,
  );
  assert.deepEqual(loadSelection({ getItem: () => "{erro" }), []);
  assert.deepEqual(loadSelection({ getItem: () => "[null,12]" }), []);
});
test("WhatsApp agrupa coleções e mantém quantidades e links específicos", () => {
  const items: QuoteItem[] = [
    {
      ...catalog.products[0],
      catalog: catalog.name,
      catalogSlug: catalog.slug,
      quantity: 3,
      siteUrl: config.brand.website,
    },
    {
      ...catalog.products[1],
      id: "NAT-1",
      catalog: "Natal",
      catalogSlug: "natal",
      quantity: 2,
      siteUrl: "https://www.pitterpan.com.br/produto",
    },
  ];
  const message = new URL(whatsappUrl(items, config)).searchParams.get("text")!;
  assert.equal(totalQuantity(items), 5);
  assert.match(message, /Quantidade total: \*5 itens\*/);
  assert.match(message, /Coleções: \*2\*/);
  assert.match(message, /Ver no site: https:\/\/www.pitterpan.com.br\/produto/);
  assert.equal(
    message.includes("Ver no site: " + config.brand.website + "\n"),
    false,
  );
});
test("51 produtos, cinco catálogos e imagens preservados", async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL("../public/data/catalogs/manifest.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(manifest.catalogs.length, 5);
  const ids = new Set<string>();
  for (const summary of manifest.catalogs) {
    const data: Catalog = JSON.parse(
      await readFile(
        new URL(
          `../public/data/catalogs/${summary.slug}.json`,
          import.meta.url,
        ),
        "utf8",
      ),
    );
    for (const item of data.products) {
      assert.equal(ids.has(item.id), false);
      ids.add(item.id);
      await readFile(
        new URL(
          "../public/" + item.image.replace(/^\.\.\//, ""),
          import.meta.url,
        ),
      );
    }
    await readFile(
      new URL(
        "../public/" + data.banner.replace(/^\.\.\//, ""),
        import.meta.url,
      ),
    );
  }
  assert.equal(ids.size, 51);
});
