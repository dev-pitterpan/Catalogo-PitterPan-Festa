"use client";

import type { CatalogPageData } from "../types/catalog";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import LoadingState from "./LoadingState";
import { useCatalogPage } from "../hooks/useCatalogPage";
import { publicCatalogUrl } from "../lib/routes";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import CatalogShell from "./CatalogShell";
import ProductCard from "./ProductCard";
import QuoteCart from "./QuoteCart";
import AdminSelect from "./admin/AdminSelect";
import ShareBar from "./ShareBar";
import ManagerHome from "./manager/ManagerHome";
import { useQuote } from "../hooks/useQuote";
import { MAX_CART_ITEMS, whatsappUrl } from "../lib/quote";
import {
  shoppingDepartments,
  shoppingSubcategories,
} from "../lib/catalog/departments";

export default function CatalogApp({
  initialData,
  managerView,
  initialQuery = "",
  campaignMonth,
}: {
  managerView?: boolean;
  initialData: CatalogPageData;
  initialQuery?: string;
  campaignMonth?: number;
}) {
  const pathname = usePathname() || "/";
  return (
    <CatalogPage
      key={`${pathname}-${managerView}-${initialQuery}`}
      initialData={initialData}
      managerView={managerView}
      initialQuery={initialQuery}
      campaignMonth={campaignMonth}
    />
  );
}

function CatalogPage({
  initialData,
  managerView,
  initialQuery,
  campaignMonth,
}: {
  initialData: CatalogPageData;
  managerView?: boolean;
  initialQuery: string;
  campaignMonth?: number;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [vendor, setVendor] = useState("");
  const [sort, setSort] = useState<"name" | "price-asc" | "price-desc">("name");
  const { isClient, catalogs, catalog, config, loading, error, fetching } =
    useCatalogPage(
      initialData,
      {
        q: debouncedQuery,
        category,
        page,
        vendor,
        sort,
      },
      managerView,
      initialQuery,
    );
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
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
    document.documentElement.className = catalog
      ? `theme-${catalog.slug}-root`
      : "";
    document.body.className = catalog
      ? `theme-${catalog.slug}${isClient ? " client-page" : ""}${menuOpen ? " sidebar-is-open" : ""}${cartOpen ? " quote-cart-open" : ""}`
      : "";
    document.title = catalog
      ? `${catalog.name} | Pitter Pan Festas`
      : isClient
        ? "Pitter Pan Festas | Catálogos"
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
  const products = catalog?.products || [];
  if (error)
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center gap-4 p-8 font-sans text-pitter-blue bg-pitter-ice text-center">
        <h1>Não foi possível abrir a página</h1>
        <p role="alert">{error}</p>
        <a href="/">Voltar aos catálogos</a>
        <button onClick={() => location.reload()}>Tentar novamente</button>
      </main>
    );
  if (loading) return <LoadingState />;
  if (!catalog || !config)
    return (
      <>
        <div className="manager-page">
          <ManagerHome
            catalogs={catalogs}
            publicView={isClient}
            campaignMonth={campaignMonth}
          />
        </div>
      </>
    );
  const publicUrl = publicCatalogUrl(
    catalog.slug,
    config.catalog.publicBaseUrl,
    browserLocation,
  );
  const showProductTypes =
    !isClient ||
    ![...shoppingDepartments, ...shoppingSubcategories].some(
      ({ slug }) => slug === catalog.slug,
    );
  return (
    <div
      className={`catalog-page catalog-unified theme-${catalog.slug}${isClient ? " client-page" : " manager-catalog-page"}`}
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
        onCatalogSelect={() => {
          setQuery("");
          setDebouncedQuery("");
          setCategory("");
          setVendor("");
          setSort("name");
          setPage(1);
        }}
        onCollapse={() => {
          if (innerWidth > 980) setCollapsed((value) => !value);
        }}
        onCategorySelect={(value) => {
          setCategory(value);
          setPage(1);
          setMenuOpen(false);
        }}
        selectedCategory={category}
        query={query}
        onSearch={setQuery}
        count={catalog.pagination?.total ?? products.length}
        sharebar={
          isClient ? null : <ShareBar catalog={catalog} url={publicUrl} />
        }
      >
        <div
          className={`catalog-filters-panel${isClient ? " catalog-filters-panel--public" : ""}`}
        >
          {isClient && (
            <button
              type="button"
              className="catalog-mobile-filters"
              aria-expanded={filtersOpen}
              aria-controls="catalog-result-filters"
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <SlidersHorizontal size={16} aria-hidden="true" />
              Filtrar
            </button>
          )}
          <div
            id="catalog-result-filters"
            className={`catalog-filters${filtersOpen ? " is-open" : ""}`}
          >
            {showProductTypes && (
              <div className="catalog-filter-field">
                <span>{isClient ? "Tipo de produto" : "Categoria"}</span>
                <AdminSelect
                  label={isClient ? "Tipo de produto" : "Categoria"}
                  value={category}
                  onValueChange={(value) => {
                    setCategory(value);
                    setPage(1);
                  }}
                  options={[
                    {
                      value: "",
                      label: isClient
                        ? "Todos os tipos"
                        : "Todas as categorias",
                    },
                    ...(category &&
                    !catalog.pagination?.categories.some(
                      (item) => item.name === category,
                    )
                      ? [{ value: category, label: category }]
                      : []),
                    ...(catalog.pagination?.categories.map((item) => ({
                      value: item.name,
                      label: `${item.name} (${item.count})`,
                    })) || []),
                  ]}
                />
              </div>
            )}
            <div className="catalog-filter-field">
              <span>Marca</span>
              <AdminSelect
                label="Marca"
                value={vendor}
                onValueChange={(value) => {
                  setVendor(value);
                  setPage(1);
                }}
                options={[
                  { value: "", label: "Todas as marcas" },
                  ...(catalog.pagination?.vendors.map((name) => ({
                    value: name,
                    label: name,
                  })) || []),
                ]}
              />
            </div>
            <div className="catalog-filter-field">
              <span>Ordenar</span>
              <AdminSelect
                label="Ordenar produtos"
                value={sort}
                onValueChange={(value) => {
                  setSort(value as typeof sort);
                  setPage(1);
                }}
                options={[
                  { value: "name", label: "Nome" },
                  { value: "price-asc", label: "Menor preço" },
                  { value: "price-desc", label: "Maior preço" },
                ]}
              />
            </div>
          </div>
          <span role="status">
            {fetching
              ? "Atualizando produtos…"
              : `${catalog.pagination?.total ?? products.length} produtos encontrados`}
          </span>
        </div>
        {isClient && quote.selected.length >= MAX_CART_ITEMS && (
          <p role="status">
            Seu carrinho atingiu o limite de {MAX_CART_ITEMS} produtos
            diferentes. Remova um item para adicionar outro.
          </p>
        )}
        {products.length ? (
          products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isClient={isClient}
              quantity={
                quote.selected.find(
                  (item) =>
                    item.id === product.id ||
                    (!!item.shopifyVariantId &&
                      item.shopifyVariantId === product.shopifyVariantId),
                )?.quantity || 0
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
        {catalog.pagination && (
          <nav className="catalog-pagination" aria-label="Páginas de produtos">
            <button
              type="button"
              disabled={fetching || catalog.pagination.page <= 1}
              onClick={() => setPage(catalog.pagination!.page - 1)}
            >
              <ChevronLeft size={18} aria-hidden="true" /> Anterior
            </button>
            <span>
              Página {catalog.pagination.page} de {catalog.pagination.pages}
            </span>
            <button
              type="button"
              disabled={
                fetching || catalog.pagination.page >= catalog.pagination.pages
              }
              onClick={() => setPage(catalog.pagination!.page + 1)}
            >
              Próxima <ChevronRight size={18} aria-hidden="true" />
            </button>
          </nav>
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
