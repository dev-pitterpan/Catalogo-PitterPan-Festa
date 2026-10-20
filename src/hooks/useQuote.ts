/** Mantém o carrinho entre coleções e versões do catálogo, inclusive quando o armazenamento falha. */
import { useEffect, useState } from "react";
import { loadSelection, STORAGE_KEY } from "../lib/quote";
import type { Catalog, Product, QuoteItem, SiteConfig } from "../types/catalog";
export function useQuote() {
  // SSR e navegador começam vazios; a leitura ocorre somente após hidratar.
  const [selected, setSelected] = useState<QuoteItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try {
      setSelected(loadSelection(localStorage));
    } catch {
      setStorageError(true);
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    // Nunca sobrescreve um carrinho antigo antes de terminar sua leitura.
    if (!hydrated) return;
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
      const existing = previous.find((item) => item.id === product.id);
      if (existing)
        return previous
          .map((item) =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + delta }
              : item,
          )
          .filter((item) => item.quantity > 0);
      if (delta <= 0 || !catalog || !config) return previous;
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
