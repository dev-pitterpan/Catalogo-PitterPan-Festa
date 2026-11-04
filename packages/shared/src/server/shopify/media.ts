/** Só aceita mídia hospedada nos domínios de imagens da Shopify. */
export function shopifyImageUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port)
      return null;
    if (
      url.hostname !== "cdn.shopify.com" &&
      !url.hostname.endsWith(".shopifycdn.com")
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
