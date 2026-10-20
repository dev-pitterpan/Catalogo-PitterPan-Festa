/** Mantém as URLs antigas e a compatibilidade com links terminados em index.html. */
export function resolveCatalogRoute(pathname: string) {
  const parts = pathname
    .replace(/\/index\.html$/, "/")
    .split("/")
    .filter(Boolean);
  const isManager = parts[0] === "gestor";
  return {
    slug: isManager ? parts[1] : parts[0],
    isClient: !isManager,
    valid: isManager ? parts.length <= 2 : parts.length <= 1,
  };
}
/** Links compartilhados usam localhost no desenvolvimento e o domínio configurado em produção. */
export function publicCatalogUrl(
  slug: string,
  base: string,
  current?: { hostname: string; origin: string },
) {
  if (!current) return new URL(`${slug}/`, base).href;
  const local =
    /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(current.hostname) ||
    current.hostname.endsWith(".local");
  return new URL(`${slug}/`, local ? current.origin : base).href;
}
