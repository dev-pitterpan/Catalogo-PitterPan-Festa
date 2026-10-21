import { z } from "zod";

// Valida os JSONs na entrada. TypeScript sozinho não valida dados recebidos em runtime.
const money = z.string().regex(/^\d{1,10}(\.\d{1,2})?$/);
export const productSchema = z.object({
  id: z.string(),
  price: money.optional(),
  compareAtPrice: money.optional(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  vendor: z.string().optional(),
  name: z.string(),
  category: z.string().optional(),
  description: z.string(),
  image: z.string(),
  keywords: z.array(z.string()).optional(),
  siteUrl: z.string().optional(),
  shopifyVariantId: z
    .string()
    .regex(/^[1-9]\d*$/)
    .optional(),
});
export const summarySchema = z.object({
  name: z.string(),
  slug: z.string(),
  cardClass: z.string(),
  description: z.string(),
  accent: z.string(),
});
export const catalogSchema = z.object({
  name: z.string(),
  slug: z.string(),
  eyebrow: z.string().optional(),
  description: z.string(),
  banner: z.string(),
  products: z.array(productSchema),
  pagination: z
    .object({
      page: z.number().int(),
      pageSize: z.number().int(),
      total: z.number().int(),
      pages: z.number().int(),
      vendors: z.array(z.string()).default([]),
      categories: z.array(
        z.object({ name: z.string(), count: z.number().int() }),
      ),
    })
    .optional(),
});
export const configSchema = z.object({
  brand: z.object({ name: z.string(), website: z.url() }),
  catalog: z.object({ publicBaseUrl: z.url() }),
  whatsapp: z.object({
    number: z.string().regex(/^\d+$/),
    display: z.string(),
  }),
});
