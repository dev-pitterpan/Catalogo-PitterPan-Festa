import type { Product } from "../types/catalog";

export class CheckoutError extends Error {}

/** Não permite enviar uma seleção parcial nem confiar em variantes vindas do navegador. */
export function prepareCheckout(
  items: { id: string; quantity: number }[],
  products: Product[],
  website: string,
) {
  if (!items.length)
    throw new CheckoutError("Adicione produtos ao carrinho antes de comprar.");
  const lines = new Map<string, number>();
  const missing: string[] = [];
  for (const item of items) {
    const matches = products.filter((product) => product.id === item.id);
    const product = matches.length === 1 ? matches[0] : undefined;
    if (
      !product?.shopifyVariantId ||
      !/^[1-9]\d*$/.test(product.shopifyVariantId)
    ) {
      missing.push(
        product ? `${product.name} (cód. ${item.id})` : `cód. ${item.id}`,
      );
      continue;
    }
    if (
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 999
    )
      throw new CheckoutError("Use quantidades inteiras entre 1 e 999.");
    const total = (lines.get(product.shopifyVariantId) || 0) + item.quantity;
    if (total > 999)
      throw new CheckoutError("O limite é de 999 unidades por variante.");
    lines.set(product.shopifyVariantId, total);
  }
  if (missing.length)
    throw new CheckoutError(
      `Ainda não é possível comprar estes itens no site: ${missing.join(", ")}. Remova-os para continuar ou peça orçamento pelo WhatsApp.`,
    );
  const shop = new URL(website);
  if (shop.protocol !== "https:")
    throw new Error("O endereço da loja deve usar HTTPS.");
  return new URL(
    `/cart/${[...lines].map(([id, quantity]) => `${id}:${quantity}`).join(",")}`,
    shop.origin,
  ).href;
}
