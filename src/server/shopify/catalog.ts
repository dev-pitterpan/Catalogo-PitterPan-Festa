import { ShopifyClient } from "./client.ts";
import { shopifyImageUrl } from "./media.ts";
import type { Product } from "../../types/catalog.ts";

type Connection<T> = {
  nodes: T[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};
type Collection = { id: string; handle: string; title: string };
type Image = { url: string; altText?: string | null };
type Variant = {
  id: string;
  sku: string | null;
  title: string;
  price: string;
  compareAtPrice: string | null;
  inventoryQuantity?: number | null;
  inventoryPolicy: string;
  image: Image | null;
};
type Parent = {
  id: string;
  title: string;
  handle: string;
  description: string;
  productType: string;
  vendor: string;
  tags: string[];
  onlineStoreUrl: string | null;
  featuredImage: Image | null;
  variants: Connection<Variant>;
  collections: Connection<Collection>;
};
type Client = {
  query<T>(query: string, variables?: Record<string, unknown>): Promise<T>;
};
const pageInfo = "pageInfo { hasNextPage endCursor }";
const variantFields =
  "id sku title price compareAtPrice inventoryQuantity inventoryPolicy image { url altText }";
const collectionFields = "id handle title";

/** Every connection is drained, including nested variants and collections. */
export async function drain<T>(
  first: Connection<T>,
  next: (cursor: string) => Promise<Connection<T>>,
): Promise<T[]> {
  const result = [...first.nodes];
  const seen = new Set<string>();
  let current = first;
  while (current.pageInfo.hasNextPage) {
    const cursor = current.pageInfo.endCursor;
    if (!cursor || seen.has(cursor))
      throw new Error("Paginação Shopify sem progresso.");
    seen.add(cursor);
    current = await next(cursor);
    result.push(...current.nodes);
  }
  return result;
}

export async function loadShopifyCatalog(
  client: Client,
  collectionIds: string[] = [],
) {
  const { shop } = await client.query<{ shop: { currencyCode: string } }>(
    "{ shop { currencyCode } }",
  );
  const search = collectionIds.length
    ? `status:active AND (${collectionIds.map((id) => `collection_id:${id.split("/").at(-1)}`).join(" OR ")})`
    : "status:active";
  const query = `query($after:String,$search:String!){ products(first:40,after:$after,query:$search,sortKey:ID) { nodes {
    id title handle description productType vendor tags onlineStoreUrl featuredImage { url altText }
    variants(first:1) { nodes { ${variantFields} } ${pageInfo} }
    collections(first:10) { nodes { ${collectionFields} } ${pageInfo} }
  } ${pageInfo} } }`;
  const products = new Map<string, Product>();
  const collections = new Map<string, Collection>();
  let after: string | null = null;
  const cursors = new Set<string>();
  do {
    const data: { products: Connection<Parent> } = await client.query(query, {
      after,
      search,
    });
    for (const parent of data.products.nodes) {
      // Only products published to the online store may be exposed publicly.
      if (!parent.onlineStoreUrl) continue;
      const memberships = await drain(parent.collections, async (cursor) => {
        const { product } = await client.query<{
          product: { collections: Connection<Collection> };
        }>(
          `query($id:ID!,$after:String){product(id:$id){collections(first:100,after:$after){nodes{${collectionFields}} ${pageInfo}}}}`,
          { id: parent.id, after: cursor },
        );
        return product.collections;
      });
      for (const collection of memberships)
        collections.set(collection.id, collection);
      const variants = await drain(parent.variants, async (cursor) => {
        const { product } = await client.query<{
          product: { variants: Connection<Variant> };
        }>(
          `query($id:ID!,$after:String){product(id:$id){variants(first:100,after:$after){nodes{${variantFields}} ${pageInfo}}}}`,
          { id: parent.id, after: cursor },
        );
        return product.variants;
      });
      for (const variant of variants) {
        const variantId = variant.id.split("/").at(-1)!;
        if (!/^[1-9]\d*$/.test(variantId))
          throw new Error("ID de variante inválido.");
        const url = new URL(parent.onlineStoreUrl);
        if (url.protocol !== "https:" || url.username || url.password)
          throw new Error("URL de produto inválida.");
        url.searchParams.set("variant", variantId);
        const image =
          shopifyImageUrl(variant.image?.url) ||
          shopifyImageUrl(parent.featuredImage?.url);
        const stock = variant.inventoryQuantity ?? null;
        products.set(variant.id, {
          id: `shopify-${variantId}`,
          shopifyVariantId: variantId,
          shopifyProductId: parent.id,
          sku: variant.sku || "",
          handle: parent.handle,
          name: [
            parent.title,
            variant.title === "Default Title" ? "" : variant.title,
          ]
            .filter(Boolean)
            .join(" — "),
          description: parent.description,
          category: parent.productType || "Sem categoria",
          vendor: parent.vendor,
          tags: parent.tags,
          collections: memberships.map((c) => c.handle),
          keywords: [
            variant.sku || "",
            parent.vendor,
            ...parent.tags,
            ...memberships.map((c) => c.title),
          ],
          price: variant.price,
          compareAtPrice: variant.compareAtPrice || undefined,
          currency: shop.currencyCode,
          image: image || "/assets/images/brand/product-placeholder.svg",
          siteUrl: url.href,
          inventoryQuantity: stock,
          availableForSale:
            stock === null
              ? undefined
              : stock > 0 || variant.inventoryPolicy === "CONTINUE",
        });
      }
    }
    if (!data.products.pageInfo.hasNextPage) break;
    after = data.products.pageInfo.endCursor;
    if (!after || cursors.has(after))
      throw new Error("Paginação Shopify sem progresso.");
    cursors.add(after);
  } while (true);
  return {
    products: [...products.values()],
    collections: [...collections.values()],
  };
}

type Snapshot = Awaited<ReturnType<typeof loadShopifyCatalog>>;
// Preserve single-flight reads across Next development module reloads.
const cacheOwner = globalThis as typeof globalThis & {
  shopifyCatalogReadsV2?: {
    snapshots: Map<string, { value: Snapshot; expires: number }>;
    pending: Map<string, Promise<Snapshot>>;
  };
};
const { snapshots, pending } = (cacheOwner.shopifyCatalogReadsV2 ||= {
  snapshots: new Map<string, { value: Snapshot; expires: number }>(),
  pending: new Map<string, Promise<Snapshot>>(),
});
/** Publish only a complete snapshot; concurrent requests share the same read. */
export function getShopifyCatalog(collectionIds: string[] = []) {
  const key = `${process.env.SHOPIFY_STORE_DOMAIN}:${process.env.SHOPIFY_API_VERSION || "2026-07"}:${[...collectionIds].sort().join(",")}`;
  const snapshot = snapshots.get(key);
  if (snapshot && snapshot.expires > Date.now())
    return Promise.resolve(snapshot.value);
  const existing = pending.get(key);
  if (existing) return existing;
  const request = loadShopifyCatalog(new ShopifyClient(), collectionIds)
    .then((value) => {
      snapshots.set(key, { value, expires: Date.now() + 300_000 });
      return value;
    })
    .finally(() => {
      pending.delete(key);
    });
  pending.set(key, request);
  return request;
}

let collectionCache: { value: Collection[]; expires: number } | undefined;
let collectionPending: Promise<Collection[]> | undefined;
export function getShopifyCollections() {
  if (collectionCache && collectionCache.expires > Date.now())
    return Promise.resolve(collectionCache.value);
  return (collectionPending ||= (async () => {
    const client = new ShopifyClient();
    const page = async (
      after: string | null,
    ): Promise<Connection<Collection>> => {
      const data = await client.query<{ collections: Connection<Collection> }>(
        `query($after:String){collections(first:250,after:$after){nodes{${collectionFields}} ${pageInfo}}}`,
        { after },
      );
      return data.collections;
    };
    const value = await drain(await page(null), page);
    collectionCache = { value, expires: Date.now() + 300_000 };
    return value;
  })().finally(() => {
    collectionPending = undefined;
  }));
}

export function usesShopify() {
  return process.env.CATALOG_DATA_SOURCE === "shopify";
}

/** Read only selected variants, freshly, without scanning the whole store at checkout. */
export async function getShopifySelectedProducts(
  ids: string[],
  client: Client = new ShopifyClient(),
): Promise<Product[]> {
  const variantIds = [
    ...new Set(
      ids
        .filter((id) => /^shopify-[1-9]\d*$/.test(id))
        .map((id) => `gid://shopify/ProductVariant/${id.slice(8)}`),
    ),
  ];
  if (!variantIds.length) return [];
  type Node = Variant & {
    product: {
      id: string;
      title: string;
      status: string;
      onlineStoreUrl: string | null;
      productType: string;
      vendor: string;
    };
  };
  const { nodes, shop } = await client.query<{
    nodes: (Node | null)[];
    shop: { currencyCode: string };
  }>(
    `query($ids:[ID!]!){shop{currencyCode} nodes(ids:$ids){... on ProductVariant{${variantFields} product{id title status onlineStoreUrl productType vendor}}}}`,
    { ids: variantIds },
  );
  return nodes.flatMap((node) => {
    if (
      !node ||
      node.product.status !== "ACTIVE" ||
      !node.product.onlineStoreUrl
    )
      return [];
    const variantId = node.id.split("/").at(-1)!;
    const url = new URL(node.product.onlineStoreUrl);
    if (url.protocol !== "https:" || url.username || url.password)
      throw new Error("URL de produto inválida.");
    url.searchParams.set("variant", variantId);
    return [
      {
        id: `shopify-${variantId}`,
        shopifyVariantId: variantId,
        shopifyProductId: node.product.id,
        sku: node.sku || "",
        name: node.product.title,
        description: "",
        image:
          shopifyImageUrl(node.image?.url) ||
          "/assets/images/brand/product-placeholder.svg",
        category: node.product.productType,
        vendor: node.product.vendor,
        price: node.price,
        currency: shop.currencyCode,
        siteUrl: url.href,
        inventoryQuantity: node.inventoryQuantity ?? null,
      },
    ];
  });
}
