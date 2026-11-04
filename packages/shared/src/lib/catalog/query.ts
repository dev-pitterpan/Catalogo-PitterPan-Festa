import { z } from "zod";
export const PAGE_SIZE = 20;
export const catalogQuerySchema = z.object({
  q: z.string().trim().max(120).default(""),
  category: z.string().trim().max(200).default(""),
  vendor: z.string().trim().max(200).default(""),
  sort: z.enum(["name", "price-asc", "price-desc"]).default("name"),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
// Texto passado como parâmetro SQL, nunca concatenado como SQL executável.
export function searchQuery(value: string) {
  return normalizeText(value)
    .split(" ")
    .filter(Boolean)
    .slice(0, 12)
    .map((term) => `${term}:*`)
    .join(" & ");
}
