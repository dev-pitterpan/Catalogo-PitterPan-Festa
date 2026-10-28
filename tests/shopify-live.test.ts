import test from "node:test";
import assert from "node:assert/strict";
import {
  drain,
  loadShopifyCatalog,
  getShopifySelectedProducts,
} from "../src/server/shopify/catalog.ts";
import { prepareCheckout } from "../src/lib/checkout.ts";

const connection = <T>(nodes: T[], cursor: string | null = null) => ({
  nodes,
  pageInfo: { hasNextPage: cursor !== null, endCursor: cursor },
});
const variant = (id: number, sku = "REPETIDO") => ({
  id: `gid://shopify/ProductVariant/${id}`,
  sku,
  title: "Default Title",
  price: "12.50",
  compareAtPrice: null,
  inventoryQuantity: 4,
  inventoryPolicy: "DENY",
  image: null,
});
const collection = (id: number) => ({
  id: `gid://shopify/Collection/${id}`,
  handle: `colecao-${id}`,
  title: `Coleção ${id}`,
});
const parent = (id: number) => ({
  id: `gid://shopify/Product/${id}`,
  title: "Produto",
  handle: `produto-${id}`,
  description: "Descrição",
  productType: "Festas",
  vendor: "Marca",
  tags: ["tema"],
  onlineStoreUrl: `https://loja.example/products/produto-${id}`,
  featuredImage: { url: "https://cdn.shopify.com/image.jpg" },
  variants: connection([variant(id)]),
  collections: connection([collection(1)]),
});

test("Shopify drena produtos e conexões internas, preserva SKUs repetidos/vazios e elimina variantes duplicadas", async () => {
  const first = parent(1);
  first.variants = connection([variant(1)], "v1");
  first.collections = connection([collection(1)], "c1");
  const calls: string[] = [];
  const client = {
    async query<T>(
      query: string,
      variables: Record<string, unknown> = {},
    ): Promise<T> {
      calls.push(query);
      let result: unknown;
      if (query.includes("currencyCode"))
        result = { shop: { currencyCode: "BRL" } };
      else if (query.includes("products(first:"))
        result = {
          products: variables.after
            ? connection([parent(2), { ...parent(3), onlineStoreUrl: null }])
            : connection([first], "p1"),
        };
      else if (query.includes("variants(first:100"))
        result = {
          product: { variants: connection([variant(1), variant(4, "")]) },
        };
      else result = { product: { collections: connection([collection(2)]) } };
      return result as T;
    },
  };
  const data = await loadShopifyCatalog(client);
  assert.equal(data.products.length, 3);
  assert.equal(new Set(data.products.map((p) => p.id)).size, 3);
  assert.deepEqual(
    data.products.find((p) => p.shopifyVariantId === "4")?.collections,
    ["colecao-1", "colecao-2"],
  );
  assert.equal(data.products.find((p) => p.shopifyVariantId === "4")?.sku, "");
  assert.equal(data.products[0].image, "https://cdn.shopify.com/image.jpg");
  assert.equal(data.products[0].inventoryQuantity, 4);
  assert.equal(calls.length, 5);
  assert.equal(
    prepareCheckout(
      [{ id: "shopify-4", quantity: 2 }],
      data.products,
      "https://loja.example",
    ),
    "https://loja.example/cart/4:2",
  );
});

test("Shopify rejeita paginação sem progresso e falha sem entregar catálogo parcial", async () => {
  await assert.rejects(
    drain(connection([1], "same"), async () => connection([2], "same")),
    /sem progresso/,
  );
  await assert.rejects(
    drain(connection([1], "next"), async () => {
      throw new Error("offline");
    }),
    /offline/,
  );
});

test("checkout lê apenas variantes selecionadas e exclui produtos sem publicação", async () => {
  let requested: unknown;
  const client = {
    async query<T>(
      _query: string,
      variables?: Record<string, unknown>,
    ): Promise<T> {
      requested = variables?.ids;
      return {
        shop: { currencyCode: "BRL" },
        nodes: [
          { ...variant(4), product: { ...parent(4), status: "ACTIVE" } },
          { ...variant(5), product: { ...parent(5), status: "DRAFT" } },
          null,
        ],
      } as T;
    },
  };
  const products = await getShopifySelectedProducts(
    ["shopify-4", "shopify-4", "shopify-5", "HAL-001"],
    client,
  );
  assert.deepEqual(requested, [
    "gid://shopify/ProductVariant/4",
    "gid://shopify/ProductVariant/5",
  ]);
  assert.equal(products.length, 1);
  assert.equal(
    prepareCheckout(
      [{ id: "shopify-4", quantity: 3 }],
      products,
      "https://loja.example",
    ),
    "https://loja.example/cart/4:3",
  );
  assert.deepEqual(
    await getShopifySelectedProducts(["HAL-001"], {
      query: async () => {
        throw new Error("não consultar");
      },
    }),
    [],
  );
});

test("coleções usam conexão direta, paginam e unificam variantes sem varrer a loja", async () => {
  const calls: Record<string, unknown>[] = [];
  const client = {
    async query<T>(
      query: string,
      variables: Record<string, unknown> = {},
    ): Promise<T> {
      if (query.includes("currencyCode"))
        return { shop: { currencyCode: "BRL" } } as T;
      assert.ok(query.includes("collection(id:$id)"));
      assert.ok(!query.includes("collection_id:"));
      calls.push(variables);
      const product = parent(variables.after ? 2 : 1);
      const hidden = { ...parent(3), status: "DRAFT" };
      return {
        collection: {
          products: connection(
            [product, hidden],
            variables.after ? null : "next",
          ),
        },
      } as T;
    },
  };
  const result = await loadShopifyCatalog(client, [
    "collection-a",
    "collection-b",
    "collection-a",
  ]);
  assert.deepEqual(
    calls.map((c) => [c.id, c.after]),
    [
      ["collection-a", null],
      ["collection-a", "next"],
      ["collection-b", null],
      ["collection-b", "next"],
    ],
  );
  assert.deepEqual(
    result.products.map((p) => p.id),
    ["shopify-1", "shopify-2"],
  );
});
