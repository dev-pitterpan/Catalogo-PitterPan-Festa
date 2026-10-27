import CategoryNavigation from "./navigation/CategoryNavigation";
import CollectionNavigation from "./navigation/CollectionNavigation";
import CatalogIcon from "./navigation/CatalogIcon";
import { seasonalSlugs } from "./navigation/CatalogIcon";
import { catalogVisual } from "../lib/catalog/visual";
import { ChevronLeft, MessageCircle, Search } from "lucide-react";
import Link from "next/link";
import { useState, type CSSProperties, type ReactNode } from "react";
import type { Catalog, CatalogSummary } from "../types/catalog";
interface Props {
  catalog: Catalog;
  catalogs: CatalogSummary[];
  isClient: boolean;
  menuOpen: boolean;
  collapsed: boolean;
  onToggle: () => void;
  onClose: () => void;
  onCollapse: () => void;
  query: string;
  onSearch: (query: string) => void;
  count: number;
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
  sharebar: ReactNode;
  children: ReactNode;
}
export default function CatalogShell({
  catalog,
  catalogs,
  isClient,
  menuOpen,
  collapsed,
  onToggle,
  onClose,
  onCollapse,
  query,
  onSearch,
  count,
  selectedCategory,
  onCategorySelect,
  sharebar,
  children,
}: Props) {
  const [section, setSection] = useState<"collections" | "categories">(
    "collections",
  );
  const visual = catalogVisual(selectedCategory || catalog.slug);
  const banner =
    selectedCategory || !seasonalSlugs.has(catalog.slug)
      ? visual.banner
      : catalog.banner;
  const visualStyle = {
    "--catalog-accent": visual.accent,
    "--catalog-accent-rgb": visual.accentRgb,
    "--catalog-secondary": visual.secondary,
    "--catalog-secondary-rgb": visual.secondaryRgb,
  } as CSSProperties;
  const slug = catalog.slug,
    rootPrefix = "/";
  const brandHref = isClient ? `/${slug}/` : "/",
    brandLabel = isClient
      ? "Pitter Pan Festas"
      : "Voltar ao gestor de catálogos";
  const shellClass = `catalog-shell ${isClient ? "client-shell" : ""} ${menuOpen ? "menu-open" : ""} ${collapsed ? "sidebar-collapsed" : ""}`;
  const sidebarClass = `sidebar ${isClient ? "client-sidebar" : ""}`;
  return (
    <div
      className={`${shellClass} practical-catalog`}
      id="catalogApp"
      style={visualStyle}
    >
      <div className="sidebar-mobilebar" aria-label="Navegação Pitter Pan">
        <Link
          className="sidebar-mobilebrand"
          href={`${brandHref}`}
          aria-label={`${brandLabel}`}
        >
          <img
            src={`${rootPrefix}assets/images/brand/pitter-pan-logo.svg`}
            alt="Pitter Pan Festas"
          />
        </Link>
        <span className="sidebar-mobilecontext">
          {isClient ? catalog.name : "Catálogos"}
        </span>
        <button
          className="sidebar-toggle"
          type="button"
          onClick={onToggle}
          data-sidebar-toggle
          aria-controls="sidebar"
          aria-expanded={menuOpen}
          aria-label="Abrir menu de catálogos"
        >
          <span className="sidebar-toggle__halo" aria-hidden="true"></span>
          <span className="sidebar-toggle__lines" aria-hidden="true">
            <i></i>
            <i></i>
          </span>
        </button>
      </div>

      <button
        className="sidebar-backdrop"
        type="button"
        onClick={onClose}
        data-sidebar-close
        aria-label="Fechar menu"
      ></button>

      <aside
        className={`${sidebarClass}`}
        id="sidebar"
        aria-label="Catálogos Pitter Pan"
      >
        <div className="sidebar-brandbar">
          <Link
            className="brand"
            href={`${brandHref}`}
            aria-label={`${brandLabel}`}
          >
            <img
              src={`${rootPrefix}assets/images/brand/pitter-pan-logo.svg`}
              alt="Pitter Pan Festas"
            />
          </Link>
          <button
            className="sidebar-panel-close"
            type="button"
            onClick={onClose}
            data-sidebar-panel-close
            aria-label="Fechar menu de catálogos"
          >
            <span></span>
            <span></span>
          </button>
          <button
            className="sidebar-collapse"
            type="button"
            onClick={onCollapse}
            data-sidebar-collapse
            aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
            aria-pressed={collapsed}
          >
            <span className="sidebar-collapse__halo" aria-hidden="true"></span>
            <ChevronLeft aria-hidden="true" />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Escolha um catálogo">
          <div className="sidebar-context">
            <span className="sidebar-context__dot" />
            <div>
              <small>Você está em</small>
              <strong>{catalog.name}</strong>
            </div>
          </div>
          <div className="sidebar-sections" aria-label="Tipo de navegação">
            <button
              type="button"
              aria-pressed={section === "collections"}
              onClick={() => setSection("collections")}
            >
              Explorar
            </button>
            <button
              type="button"
              aria-pressed={section === "categories"}
              onClick={() => setSection("categories")}
            >
              Categorias
            </button>
          </div>
          <div
            className="sidebar-section-content"
            hidden={section !== "collections"}
          >
            <CollectionNavigation
              catalogs={catalogs}
              slug={slug}
              isClient={isClient}
              onClose={onClose}
              categories={catalog.pagination?.categories}
              selectedCategory={selectedCategory}
              onCategorySelect={onCategorySelect}
            />
          </div>
          <div
            className="sidebar-section-content"
            hidden={section !== "categories"}
          >
            <CategoryNavigation
              key={slug}
              slug={slug}
              selected={selectedCategory}
              onSelect={onCategorySelect}
            />
          </div>
        </nav>

        <footer className="sidebar-signature">
          <span className="signature-mark" aria-hidden="true">
            <MessageCircle aria-hidden="true" />
          </span>
          <p>
            Vamos juntos criar <strong>momentos inesquecíveis.</strong>
          </p>
          <small>Pitter Pan Festas · Catálogos digitais</small>
        </footer>
      </aside>

      <main
        className="catalog-workspace"
        data-catalog
        data-config-url={`${rootPrefix}data/config/site.json`}
        data-data-url={`${rootPrefix}data/catalogs/${slug}.json`}
        data-image-prefix={`${rootPrefix}`}
      >
        <div className="catalog-stage">
          {sharebar}

          <section className="catalog-hero catalog-hero--premium">
            <img
              className="catalog-hero__image"
              data-banner
              src={banner}
              alt={`Banner ${selectedCategory || catalog.name} Pitter Pan`}
            />
            <div className="catalog-hero__veil" aria-hidden="true"></div>
            <div className="catalog-hero__content catalog-hero__content--premium">
              <p className="catalog-eyebrow" data-eyebrow>
                {selectedCategory ? catalog.name : catalog.eyebrow || "Coleção"}
              </p>
              <h1 data-title>{selectedCategory || catalog.name}</h1>
              <div className="catalog-hero__meta">
                <span>
                  {selectedCategory
                    ? "Categoria selecionada"
                    : "Inspire sua próxima festa"}
                </span>
                <span aria-hidden="true">•</span>
                <span>Seleção Pitter Pan</span>
              </div>
              <span className="catalog-hero__line" aria-hidden="true"></span>
            </div>
            {selectedCategory && (
              <button
                type="button"
                className="catalog-category-reset"
                onClick={() => onCategorySelect("")}
              >
                Ver toda a coleção ×
              </button>
            )}
            <div className="catalog-hero__monogram" aria-hidden="true">
              <span className="catalog-hero__monogram-ring"></span>
              <CatalogIcon slug={slug} />
            </div>
          </section>

          <section
            className="catalog-search-section"
            aria-label="Pesquisa do catálogo"
          >
            <div className="catalog-search-heading">
              <span className="search-kicker">Encontre na coleção</span>
              <span className="search-hint">
                {catalog.name} · seleção Pitter Pan
              </span>
            </div>
            <div className="catalog-toolbar catalog-toolbar--theme">
              <label className="search-box" aria-label="Pesquisar produtos">
                <Search aria-hidden="true" />
                <input
                  value={query}
                  onChange={(e) => onSearch(e.target.value)}
                  data-search
                  type="search"
                  placeholder={
                    slug === "todos"
                      ? "Buscar em todos os produtos: nome, SKU, marca…"
                      : `Buscar em ${catalog.name}: nome, SKU, marca…`
                  }
                  autoComplete="off"
                />
              </label>
              <div className="result-count">
                <span className="result-count__icon">
                  <CatalogIcon slug={slug} />
                </span>
                <span className="result-count__copy">
                  <strong data-count>{count}</strong>
                  <small>itens na coleção</small>
                </span>
              </div>
            </div>
          </section>

          <section
            className="product-grid"
            data-product-grid
            aria-live="polite"
          >
            {children}
          </section>
        </div>
      </main>
    </div>
  );
}
