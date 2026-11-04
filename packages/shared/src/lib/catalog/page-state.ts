import type { CatalogPageData } from "../../types/catalog.ts";
/** Data from another route must never seed or render the requested catalog. */
export function matchesCatalogRoute(
  data: CatalogPageData | undefined,
  slug?: string,
) {
  return !!data && (slug ? data.catalog?.slug === slug : data.catalog === null);
}
