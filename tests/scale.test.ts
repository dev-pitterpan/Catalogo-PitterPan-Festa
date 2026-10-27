import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  findPage,
  findByIds,
  stageItems,
  publishSnapshot,
  type ItemRow,
} from "../src/server/database/catalog-repository.ts";
import { catalogQuerySchema, normalizeText } from "../src/lib/catalog/query.ts";
import { normalizeVariant } from "../src/server/shopify/normalize.ts";
import { shopifyImageUrl } from "../src/server/shopify/media.ts";
import { categoryPage } from "../src/server/database/category-repository.ts";
import { moneyToMinor, formatMinor } from "../src/lib/money.ts";
const first = "11111111-1111-4111-8111-111111111111",
  second = "22222222-2222-4222-8222-222222222222";

test("13.518 registros: paginação, separação de coleções, busca, checkout e publicação atômica", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      await readFile(
        new URL("../src/server/database/schema.sql", import.meta.url),
        "utf8",
      ),
    );
    await db.query(
      "INSERT INTO catalog_imports(id,status,store_domain) VALUES($1,'loading','test.myshopify.com')",
      [first],
    );
    const make = (index: number): ItemRow => ({
      id: String(index),
      variant_id: String(100000 + index),
      product_id: String(index),
      name: `Produto ${String(index).padStart(5, "0")}`,
      description: "Descrição",
      category: index % 2 ? "Máscaras" : "Balões",
      vendor: "Marca",
      image_url: null,
      site_url: "https://www.pitterpan.com.br/products/test",
      collections: [index % 2 ? "halloween" : "natal"],
      tags: [],
      images: [],
      search_text: normalizeText(
        `${index} Produto ${index % 2 ? "Máscaras" : "Balões"}`,
      ),
      updated_at: "2026-10-21T12:00:00Z",
      inventory_quantity: 3,
      price: String(index) + ".90",
      compare_at_price: null,
      currency: "BRL",
    });
    for (let start = 1; start <= 13518; start += 200)
      await stageItems(
        db,
        first,
        Array.from({ length: Math.min(200, 13519 - start) }, (_, offset) =>
          make(start + offset),
        ),
      );
    await assert.rejects(() => publishSnapshot(db, first), /ready/);
    await db.query("UPDATE catalog_imports SET status='ready' WHERE id=$1", [
      first,
    ]);
    await publishSnapshot(db, first);
    const query = catalogQuerySchema.parse({});
    const page = await findPage(db, "todos", query);
    assert.equal(page.products.length, 20);
    assert.equal(page.pagination.total, 13518);
    assert.equal(page.pagination.pages, 676);
    const next = await findPage(db, "todos", { ...query, page: 2 });
    assert.equal(
      new Set([...page.products, ...next.products].map((product) => product.id))
        .size,
      40,
    );
    const cheap = await findPage(db, "todos", { ...query, sort: "price-asc" });
    const expensive = await findPage(db, "todos", {
      ...query,
      sort: "price-desc",
    });
    assert.equal(cheap.products[0].price, "1.90");
    assert.equal(expensive.products[0].price, "13518.90");
    assert.equal(
      (await findPage(db, "todos", { ...query, vendor: "Não existe" }))
        .pagination.total,
      0,
    );
    const halloween = await findPage(db, "halloween", query);
    assert.equal(halloween.pagination.total, 6759);
    assert.ok(
      halloween.products.every((product) => Number(product.id) % 2 === 1),
    );
    const natal = await findPage(db, "natal", { ...query, q: "balo" });
    assert.equal(natal.pagination.total, 6759);
    const wrong = await findPage(db, "halloween", {
      ...query,
      category: "Balões",
    });
    assert.equal(wrong.pagination.total, 0);
    const selected = await findByIds(db, ["13001", "13518"]);
    assert.equal(selected.length, 2);
    assert.equal(selected[1].shopifyVariantId !== undefined, true);
    const last = await findPage(db, "todos", { ...query, page: 999 });
    assert.equal(last.pagination.page, 676);
    assert.equal(last.products.length, 18);
    await assert.rejects(() => stageItems(db, first, [make(1)]));
    await db.query(
      "INSERT INTO catalog_imports(id,status,store_domain) VALUES($1,'ready','test.myshopify.com')",
      [second],
    );
    await stageItems(db, second, [make(1)]);
    await assert.rejects(() => publishSnapshot(db, second), /20%/);
    assert.equal((await findPage(db, "todos", query)).pagination.total, 13518);
    await db.query(
      "UPDATE catalog_items SET category='Categoria '||id WHERE import_id=$1 AND id::int<=350",
      [first],
    );
    const categoryList = await categoryPage(db, "todos", "", "", 1);
    assert.equal(categoryList.categories.length, 30);
    assert.equal(categoryList.total, 352);
    assert.equal(
      (await categoryPage(db, "todos", "Categoria 350", "", 1)).categories[0]
        .name,
      "Categoria 350",
    );
    await publishSnapshot(db, second, true);
    assert.equal((await findPage(db, "todos", query)).pagination.total, 1);
    console.log(
      "Base simulada: 13.518 variantes, 676 páginas, 20 itens por resposta; publicação incompleta bloqueada.",
    );
  } finally {
    await db.close();
  }
});

test("normalização respeita variante, SKU, coleção explícita e domínio de imagem", () => {
  const parent = {
    id: "gid://shopify/Product/1",
    title: "Máscara",
    description: "Texto completo",
    productType: "Máscaras",
    vendor: "Marca",
    tags: ["terror"],
    status: "ACTIVE",
    onlineStoreUrl: "https://www.pitterpan.com.br/products/mascara",
    updatedAt: "2026-10-21",
    featuredMedia: { image: { url: "https://cdn.shopify.com/test.webp" } },
  };
  const variant = {
    id: "gid://shopify/ProductVariant/22",
    sku: "0008936",
    title: "Verde",
    image: null,
    price: "29.90",
    compareAtPrice: "39.90",
  };
  const item = normalizeVariant(parent, variant, ["halloween"], []);
  assert.equal(item?.id, "0008936");
  assert.equal(item?.variant_id, "22");
  assert.deepEqual(item?.collections, ["halloween"]);
  assert.match(item?.site_url || "", /variant=22/);
  assert.equal(
    normalizeVariant({ ...parent, status: "DRAFT" }, variant, [], []),
    null,
  );
  assert.equal(
    normalizeVariant({ ...parent, onlineStoreUrl: null }, variant, [], []),
    null,
  );
  assert.throws(() =>
    normalizeVariant(parent, { ...variant, sku: "" }, [], []),
  );
  for (const url of [
    "http://cdn.shopify.com/x",
    "https://cdn.shopify.com.evil.test/x",
    "https://127.0.0.1/x",
    "https://user:pass@cdn.shopify.com/x",
  ])
    assert.equal(shopifyImageUrl(url), null);
  assert.equal(catalogQuerySchema.safeParse({ page: -1 }).success, false);
});

test("valores monetários usam centavos e formatam totais maiores que o preço unitário", () => {
  assert.equal(moneyToMinor("0.10") + moneyToMinor("0.20"), 30);
  assert.match(formatMinor(10000000000000), /100/);
  assert.throws(() => moneyToMinor("1.999"));
  assert.throws(() => formatMinor(Number.MAX_SAFE_INTEGER + 1));
});
