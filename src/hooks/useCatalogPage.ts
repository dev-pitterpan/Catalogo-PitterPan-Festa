import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { resolveCatalogRoute } from "../lib/routes";
import type { CatalogPageData } from "../types/catalog";
import { matchesCatalogRoute } from "../lib/catalog/page-state";
/** O servidor fornece o primeiro conteúdo; consultas posteriores atualizam o cache da interface. */
export function useCatalogPage(
  initialData: CatalogPageData,
  filters: {
    q: string;
    category: string;
    page: number;
    vendor: string;
    sort: "name" | "price-asc" | "price-desc";
  },
  managerView?: boolean,
) {
  const pathname = usePathname() || "/";
  const resolved = resolveCatalogRoute(pathname);
  const route = {
    ...resolved,
    isClient: managerView === undefined ? resolved.isClient : !managerView,
  };
  const result = useQuery({
    queryKey: [
      "catalog-page",
      pathname,
      filters.q,
      filters.category,
      filters.page,
      filters.vendor,
      filters.sort,
    ],
    initialData:
      matchesCatalogRoute(initialData, route.slug) &&
      !filters.q &&
      !filters.category &&
      !filters.vendor &&
      filters.sort === "name" &&
      filters.page === 1
        ? initialData
        : undefined,
    placeholderData: (previous) =>
      previous?.catalog?.slug === route.slug ? previous : undefined,
    queryFn: async ({ signal }) => {
      if (!route.valid) throw new Error("Página não encontrada.");
      if (!route.slug)
        return { catalogs: initialData.catalogs, catalog: null, config: null };
      const search = new URLSearchParams({
        q: filters.q,
        category: filters.category,
        page: String(filters.page),
        vendor: filters.vendor,
        sort: filters.sort,
      });
      const response = await fetch(
        `/api/catalogs/${encodeURIComponent(route.slug)}/?${search}`,
        { signal },
      );
      if (!response.ok)
        throw new Error("Não foi possível carregar os produtos.");
      const data = (await response.json()) as CatalogPageData;
      if (!matchesCatalogRoute(data, route.slug))
        throw new Error(
          "O catálogo retornado não corresponde à página solicitada.",
        );
      return data;
    },
  });
  return {
    pathname,
    ...route,
    fetching: result.isFetching,
    catalogs: result.data?.catalogs || initialData.catalogs,
    catalog: matchesCatalogRoute(result.data, route.slug)
      ? result.data?.catalog || null
      : null,
    config: matchesCatalogRoute(result.data, route.slug)
      ? result.data?.config || null
      : null,
    loading:
      result.isPending ||
      (!result.error && !matchesCatalogRoute(result.data, route.slug)),
    error: result.error?.message,
  };
}
