import { Layers3, Sparkles } from "lucide-react";
export const seasonalSlugs = new Set([
  "halloween",
  "natal",
  "pascoa",
  "dia-das-criancas",
  "festa-junina",
]);
export default function CatalogIcon({ slug }: { slug: string }) {
  return seasonalSlugs.has(slug) ? (
    <img src={`/assets/icons/catalogs/${slug}.svg`} alt="" />
  ) : slug === "todos" ? (
    <Layers3 aria-hidden="true" />
  ) : (
    <Sparkles aria-hidden="true" />
  );
}
