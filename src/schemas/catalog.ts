import { z } from "zod";

// Valida os JSONs na entrada. TypeScript sozinho não valida dados recebidos em runtime.
export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string().optional(),
  description: z.string(),
  image: z.string(),
  keywords: z.array(z.string()).optional(),
  siteUrl: z.string().optional(),
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
});
export const configSchema = z.object({
  brand: z.object({ name: z.string(), website: z.url() }),
  catalog: z.object({ publicBaseUrl: z.url() }),
  whatsapp: z.object({
    number: z.string().regex(/^\d+$/),
    display: z.string(),
  }),
});
