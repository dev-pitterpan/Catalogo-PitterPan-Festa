/** Solicita ao CDN Shopify uma foto do tamanho do card; preserva assets locais. */
export function cardImage(source: string, width = 640) {
  try {
    const url = new URL(source);
    if (url.protocol === "https:" && url.hostname === "cdn.shopify.com") {
      url.searchParams.set("width", String(width));
      return url.href;
    }
  } catch {
    /* Asset local. */
  }
  return source;
}
