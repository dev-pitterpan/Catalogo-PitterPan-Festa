"use client";

import type { CatalogPageData } from "../types/catalog";
import LoadingState from "./LoadingState";
import { useCatalogPage } from "../hooks/useCatalogPage";
import { publicCatalogUrl } from "../lib/routes";
import { useEffect, useMemo, useState } from "react";
import CatalogShell from "../components/CatalogShell";
import ProductCard from "../components/ProductCard";
import QuoteCart from "../components/QuoteCart";
import ShareBar from "../components/ShareBar";
import ManagerHome from "./manager/ManagerHome";
import { useQuote } from "../hooks/useQuote";
import { productSearchScore } from "../lib/search";
import { whatsappUrl } from "../lib/quote";

export default function CatalogApp({
  initialData,
}: {
  initialData: CatalogPageData;
}) {
  const { pathname, isClient, catalogs, catalog, config, loading, error } =
    useCatalogPage(initialData);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const quote = useQuote();
  const [browserLocation, setBrowserLocation] = useState<{
    hostname: string;
    origin: string;
  }>();
  useEffect(() => {
    setBrowserLocation({
      hostname: location.hostname,
      origin: location.origin,
    });
  }, []);
  useEffect(() => {
    setQuery("");
    setMenuOpen(false);
    setCartOpen(false);
  }, [pathname]);
  useEffect(() => {
    document.documentElement.className = catalog
      ? `theme-${catalog.slug}-root`
      : "";
    document.body.className = catalog
      ? `theme-${catalog.slug}${isClient ? " client-page" : ""}${menuOpen ? " sidebar-is-open" : ""}${cartOpen ? " quote-cart-open" : ""}`
      : "";
    document.title = catalog
      ? `${catalog.name} | Pitter Pan Festas`
      : "Pitter Pan Festas | Gestor de Catálogos";
  }, [catalog, menuOpen, cartOpen, isClient]);
  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setCartOpen(false);
        setMenuOpen(false);
      }
    }
    function resize() {
      if (innerWidth > 980) setMenuOpen(false);
      else setCollapsed(false);
    }
    window.addEventListener("keydown", escape);
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("keydown", escape);
      window.removeEventListener("resize", resize);
    };
  }, []);
  const products = useMemo(
    () =>
      (catalog?.products || [])
        .map((product) => ({
          product,
          score: productSearchScore(product, query, catalog?.name),
        }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((item) => item.product),
    [catalog, query],
  );
  if (loading) return <LoadingState />;
  if (error)
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center gap-4 p-8 font-sans text-pitter-blue bg-pitter-ice text-center">
        <h1>Não foi possível abrir a página</h1>
        <p role="alert">{error}</p>
        <a href="/">Voltar aos catálogos</a>
        <button onClick={() => location.reload()}>Tentar novamente</button>
      </main>
    );
  if (!catalog || !config)
    return (
      <>
        <div className="manager-page">
          <ManagerHome catalogs={catalogs} />
        </div>
      </>
    );
  const publicUrl = publicCatalogUrl(
    catalog.slug,
    config.catalog.publicBaseUrl,
    browserLocation,
  );
  return (
    <div
      className={`catalog-page theme-${catalog.slug}${isClient ? " client-page" : ""}`}
    >
      {quote.storageError && (
        <p role="alert">
          Não foi possível salvar o carrinho neste navegador. A seleção atual
          continua disponível enquanto esta página estiver aberta.
        </p>
      )}
      <CatalogShell
        catalog={catalog}
        catalogs={catalogs}
        isClient={isClient}
        menuOpen={menuOpen}
        collapsed={collapsed}
        onToggle={() => setMenuOpen((open) => !open)}
        onClose={() => setMenuOpen(false)}
        onCollapse={() => {
          if (innerWidth > 980) setCollapsed((value) => !value);
        }}
        query={query}
        onSearch={setQuery}
        count={products.length}
        sharebar={
          isClient ? null : <ShareBar catalog={catalog} url={publicUrl} />
        }
      >
        {products.length ? (
          products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isClient={isClient}
              quantity={
                quote.selected.find((item) => item.id === product.id)
                  ?.quantity || 0
              }
              onChange={(delta) =>
                quote.change(product, delta, catalog, config)
              }
              website={config.brand.website}
            />
          ))
        ) : (
          <div className="empty-state">
            <strong>Nenhum item encontrado.</strong>
            <span>Tente outro nome, categoria ou uma palavra parecida.</span>
          </div>
        )}
      </CatalogShell>
      {isClient && (
        <QuoteCart
          selected={quote.selected}
          open={cartOpen}
          onOpen={() => {
            setMenuOpen(false);
            setCartOpen(true);
          }}
          onClose={() => setCartOpen(false)}
          onChange={quote.change}
          onRemove={quote.remove}
          onClear={quote.clear}
          onSend={() => {
            if (quote.selected.length)
              window.open(
                whatsappUrl(quote.selected, config),
                "_blank",
                "noopener,noreferrer",
              );
          }}
        />
      )}
    </div>
  );
}
