"use client";

import type { CatalogPageData } from "../types/catalog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import LoadingState from "./LoadingState";
import { useCatalogPage } from "../hooks/useCatalogPage";
import { publicCatalogUrl } from "../lib/routes";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import CatalogShell from "../components/CatalogShell";
import ProductCard from "../components/ProductCard";
import QuoteCart from "../components/QuoteCart";
import AdminSelect from "./admin/AdminSelect";
import ShareBar from "../components/ShareBar";
import ManagerHome from "./manager/ManagerHome";
import { useQuote } from "../hooks/useQuote";
import { MAX_CART_ITEMS, whatsappUrl } from "../lib/quote";

export default function CatalogApp({
  initialData,
  managerView,
}: {
  managerView?: boolean;
  initialData: CatalogPageData;
}) {
  const pathname = usePathname() || "/";
  return (
    <CatalogPage
      key={`${pathname}-${managerView}`}
      initialData={initialData}
      managerView={managerView}
    />
  );
}

function CatalogPage({
  initialData,
  managerView,
}: {
  initialData: CatalogPageData;
  managerView?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [vendor, setVendor] = useState("");
  const [sort, setSort] = useState<"name" | "price-asc" | "price-desc">("name");
  const {
    pathname,
    isClient,
    catalogs,
    catalog,
    config,
    loading,
    error,
    fetching,
  } = useCatalogPage(
    initialData,
    {
      q: debouncedQuery,
      category,
      page,
      vendor,
      sort,
    },
    managerView,
  );
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);
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
    setDebouncedQuery("");
    setCategory("");
    setVendor("");
    setSort("name");
    setPage(1);
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
          <ManagerHome catalogs={catalogs} publicView={isClient} />
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
        <div className="catalog-filters">
          <div className="catalog-filter-field">
            <span>Categoria</span>
            <AdminSelect
              label="Categoria"
              value={category}
              onValueChange={(value) => {
                setCategory(value);
                setPage(1);
              }}
              options={[
                { value: "", label: "Todas as categorias" },
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
