import { z } from "zod";
import { moneyToMinor } from "../../lib/money.ts";
import { normalizeText } from "../../lib/catalog/query.ts";
import { shopifyImageUrl } from "./media.ts";
import type { ItemRow } from "../database/catalog-repository.ts";
const imageSchema = z.object({
  url: z.string(),
  altText: z.string().nullable().optional(),
});
const parentSchema = z.object({
  id: z.string().regex(/^gid:\/\/shopify\/Product\/\d+$/),
  title: z.string().min(1),
  description: z.string(),
  productType: z.string(),
  vendor: z.string(),
  tags: z.array(z.string()),
  status: z.string(),
  onlineStoreUrl: z.string().nullable(),
  updatedAt: z.string(),
  featuredMedia: z
    .object({ image: imageSchema.nullable().optional() })
    .nullable()
    .optional(),
});
const variantSchema = z.object({
  id: z.string().regex(/^gid:\/\/shopify\/ProductVariant\/[1-9]\d*$/),
  price: z.string().refine((value) => {
    try {
      moneyToMinor(value);
      return true;
    } catch {
      return false;
    }
  }),
  compareAtPrice: z.string().nullable().optional(),
  sku: z.string().trim().min(1).max(100),
  title: z.string(),
  inventoryQuantity: z.number().int().nullable().optional(),
  image: imageSchema.nullable().optional(),
  selectedOptions: z
    .array(z.object({ name: z.string(), value: z.string() }))
    .optional(),
});
export function normalizeVariant(
  parent: unknown,
  variant: unknown,
  collections: string[],
  images: unknown[],
  currency = "BRL",
): ItemRow | null {
  const p = parentSchema.parse(parent);
  if (p.status !== "ACTIVE" || !p.onlineStoreUrl) return null;
  const v = variantSchema.parse(variant);
  const site = new URL(p.onlineStoreUrl);
  if (site.protocol !== "https:" || site.username || site.password)
    throw new Error("URL pública do produto inválida.");
  const ownImage = shopifyImageUrl(v.image?.url);
  const image = ownImage || shopifyImageUrl(p.featuredMedia?.image?.url);
  const gallery = images
    .map((item) => imageSchema.parse(item))
    .filter((item) => !!shopifyImageUrl(item.url));
  const variantName = v.title === "Default Title" ? "" : v.title;
  const name = [p.title, variantName].filter(Boolean).join(" — ");
  site.searchParams.set("variant", v.id.split("/").at(-1)!);
  return {
    id: v.sku,
    price: v.price,
    compare_at_price:
      v.compareAtPrice && moneyToMinor(v.compareAtPrice) > moneyToMinor(v.price)
        ? v.compareAtPrice
        : null,
    currency,
    variant_id: v.id.split("/").at(-1)!,
    product_id: p.id,
    name,
    description: p.description.replace(/\s+/g, " ").trim().slice(0, 180),
    category: p.productType || "Sem categoria",
    vendor: p.vendor,
    image_url: image,
    site_url: site.href,
    collections: [...new Set(collections)],
    tags: p.tags,
    images: gallery,
    search_text: normalizeText(
      [
        v.sku,
        name,
        p.productType,
        p.vendor,
        ...p.tags,
        ...(v.selectedOptions || []).map((option) => option.value),
      ].join(" "),
    ),
    updated_at: p.updatedAt,
    inventory_quantity: v.inventoryQuantity ?? null,
  };
}
