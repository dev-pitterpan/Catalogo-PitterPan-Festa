import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { resolveCatalogRoute } from "../lib/routes";
import { loadCatalog, loadConfig, loadManifest } from "../services/catalog";
import type { CatalogPageData } from "../types/catalog";
/** O servidor fornece o primeiro conteúdo; consultas posteriores atualizam o cache da interface. */
export function useCatalogPage(initialData: CatalogPageData) {
  const pathname = usePathname() || "/";
  const route = resolveCatalogRoute(pathname);
  const result = useQuery({
    queryKey: ["catalog-page", pathname],
    initialData,
    queryFn: async ({ signal }) => {
      if (!route.valid) throw new Error("Página não encontrada.");
      const catalogs = await loadManifest(signal);
      if (!route.slug) return { catalogs, catalog: null, config: null };
      const [catalog, config] = await Promise.all([
        loadCatalog(route.slug, signal),
        loadConfig(signal),
      ]);
      return { catalogs, catalog, config };
    },
  });
  return {
    pathname,
    ...route,
    catalogs: result.data.catalogs,
    catalog: result.data.catalog,
    config: result.data.config,
    loading: result.isPending,
    error: result.error?.message,
  };
}
