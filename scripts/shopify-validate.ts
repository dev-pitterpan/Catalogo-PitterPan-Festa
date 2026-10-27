import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { ShopifyClient } from "../src/server/shopify/client.ts";
import { drain, getShopifyCollections } from "../src/server/shopify/catalog.ts";
import { moneyToMinor } from "../src/lib/money.ts";
import { shopifyImageUrl } from "../src/server/shopify/media.ts";
if (existsSync(".env")) process.loadEnvFile(".env");
type Variant = {
  id: string;
  sku: string | null;
  price: string;
  image: { url: string } | null;
  product: {
    id: string;
    title: string;
    handle: string;
    status: string;
    onlineStoreUrl: string | null;
    productType: string;
    vendor: string;
    featuredImage: { url: string } | null;
  };
};
const client = new ShopifyClient();
let pages = 0;
const page = async (after: string | null) => {
  const data = await client.query<{
    productVariants: {
      nodes: Variant[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  }>(
    `query($after:String){productVariants(first:100,after:$after,sortKey:ID){nodes{id sku price image{url} product{id title handle status onlineStoreUrl productType vendor featuredImage{url}}} pageInfo{hasNextPage endCursor}}}`,
    { after },
  );
  if (++pages % 10 === 0) console.log(`Validação: ${pages} páginas lidas.`);
  return data.productVariants;
};
const variants = await drain(await page(null), page);
const visible = variants.filter(
  (v) => v.product.status === "ACTIVE" && v.product.onlineStoreUrl,
);
const products = new Map(visible.map((v) => [v.product.id, v.product]));
const categories: Record<string, number> = {};
const vendors: Record<string, number> = {};
const skus = new Map<string, number>();
for (const v of visible) {
  if (v.sku) skus.set(v.sku, (skus.get(v.sku) || 0) + 1);
  moneyToMinor(v.price);
  const url = new URL(v.product.onlineStoreUrl!);
  if (url.protocol !== "https:") throw new Error("URL pública inválida.");
}
for (const p of products.values()) {
  const category = p.productType.trim() || "Sem categoria";
  categories[category] = (categories[category] || 0) + 1;
  vendors[p.vendor || "Sem marca"] =
    (vendors[p.vendor || "Sem marca"] || 0) + 1;
}
const collections = await getShopifyCollections();
const report = {
  checkedAt: new Date().toISOString(),
  pages,
  scannedVariants: variants.length,
  publicProducts: products.size,
  publicVariants: visible.length,
  excludedVariants: variants.length - visible.length,
  duplicateVariantIds: visible.length - new Set(visible.map((v) => v.id)).size,
  emptySkus: visible.filter((v) => !v.sku?.trim()).length,
  repeatedSkus: [...skus].filter(([, count]) => count > 1).length,
  missingImages: visible.filter(
    (v) =>
      !shopifyImageUrl(v.image?.url) &&
      !shopifyImageUrl(v.product.featuredImage?.url),
  ).length,
  categories,
  vendors,
  collections,
};
await mkdir("reports", { recursive: true });
await writeFile(
  "reports/shopify-validation.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    ...report,
    categories: Object.keys(categories).length,
    vendors: Object.keys(vendors).length,
    collections: collections.length,
  }),
);
