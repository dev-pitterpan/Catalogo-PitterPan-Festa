/** Mantém o carrinho entre coleções e versões do catálogo, inclusive quando o armazenamento falha. */
import { useEffect, useState } from "react";
import {
  loadSelection,
  STORAGE_KEY,
  MAX_CART_ITEMS,
  MAX_QUANTITY,
} from "../lib/quote";
import type { Catalog, Product, QuoteItem, SiteConfig } from "../types/catalog";
// Memória da aba preserva a seleção quando o navegador bloqueia localStorage.
let fallbackSelection: QuoteItem[] = [];
export function useQuote() {
  // SSR e navegador começam vazios; a leitura ocorre somente após hidratar.
  const [selected, setSelected] = useState<QuoteItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      setSelected(
        saved === null
          ? fallbackSelection
          : loadSelection({ getItem: () => saved }),
      );
    } catch {
      setSelected(fallbackSelection);
      setStorageError(true);
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    // Nunca sobrescreve um carrinho antigo antes de terminar sua leitura.
    if (!hydrated) return;
    fallbackSelection = selected;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [selected, hydrated]);
  function change(
    product: Product,
    delta: number,
    catalog?: Catalog,
    config?: SiteConfig,
  ) {
    setSelected((previous) => {
      const sameProduct = (item: QuoteItem) =>
        item.id === product.id ||
        (!!item.shopifyVariantId &&
          item.shopifyVariantId === product.shopifyVariantId);
      const existing = previous.find(sameProduct);
      if (existing)
        return previous
          .map((item) =>
            sameProduct(item)
              ? {
                  ...item,
                  id: product.id,
                  quantity: Math.min(MAX_QUANTITY, item.quantity + delta),
                }
              : item,
          )
          .filter((item) => item.quantity > 0);
      if (
        delta <= 0 ||
        !catalog ||
        !config ||
        previous.length >= MAX_CART_ITEMS
      )
        return previous;
      return [
        ...previous,
        {
          ...product,
          catalog: catalog.name,
          catalogSlug: catalog.slug,
          siteUrl: product.siteUrl || config.brand.website,
          quantity: delta,
        },
      ];
    });
  }
  return {
    selected,
    storageError,
    change,
    remove: (id: string) =>
      setSelected((items) => items.filter((item) => item.id !== id)),
    clear: () => setSelected([]),
  };
}
