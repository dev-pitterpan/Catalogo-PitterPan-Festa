import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { resolveCatalogRoute } from "../lib/routes";
import type { CatalogPageData } from "../types/catalog";
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
) {
  const pathname = usePathname() || "/";
  const route = resolveCatalogRoute(pathname);
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
      return (await response.json()) as CatalogPageData;
    },
  });
  return {
    pathname,
    ...route,
    fetching: result.isFetching,
    catalogs: result.data?.catalogs || initialData.catalogs,
    catalog: result.data?.catalog || null,
    config: result.data?.config || null,
    loading: result.isPending,
    error: result.error?.message,
  };
}
