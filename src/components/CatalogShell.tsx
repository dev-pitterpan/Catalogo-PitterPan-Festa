import CategoryNavigation from "./navigation/CategoryNavigation";
import { ChevronLeft, MessageCircle, Search } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
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
  const slug = catalog.slug,
    rootPrefix = "/";
  const brandHref = isClient ? `/${slug}/` : "/",
    brandLabel = isClient
      ? "Pitter Pan Festas"
      : "Voltar ao gestor de catálogos";
  const shellClass = `catalog-shell ${isClient ? "client-shell" : ""} ${menuOpen ? "menu-open" : ""} ${collapsed ? "sidebar-collapsed" : ""}`;
  const sidebarClass = `sidebar ${isClient ? "client-sidebar" : ""}`;
  const navigation = catalogs.map((item) => (
    <Link
      key={item.slug}
      className={`catalog-nav-item ${item.slug === slug ? "is-active" : ""}`}
      href={`${isClient ? "" : "/gestor"}/${item.slug}/`}
      style={{ "--item-accent": item.accent } as CSSProperties}
    >
      <span className="nav-icon">
        <img src={`/assets/icons/catalogs/${item.slug}.svg`} alt="" />
      </span>
      <span className="nav-name">{item.name}</span>
    </Link>
  ));
  return (
    <div className={`${shellClass}`} id="catalogApp">
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
          <p className="nav-label">Coleções e catálogo geral</p>
          <div className="catalog-nav-list">{navigation}</div>
          <CategoryNavigation
            key={slug}
            slug={slug}
            selected={selectedCategory}
            onSelect={onCategorySelect}
          />
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
              src={`${rootPrefix}${catalog.banner.replace(/^\.\.\//, "")}`}
              alt={`Cenário ${catalog.name} Pitter Pan`}
            />
            <div className="catalog-hero__veil" aria-hidden="true"></div>
            <div className="catalog-hero__content catalog-hero__content--premium">
              <p className="catalog-eyebrow" data-eyebrow>
                {catalog.eyebrow || "Coleção"}
              </p>
              <h1 data-title>{catalog.name}</h1>
              <div className="catalog-hero__meta">
                <span>Experiência sazonal</span>
                <span aria-hidden="true">•</span>
                <span>Seleção Pitter Pan</span>
              </div>
              <span className="catalog-hero__line" aria-hidden="true"></span>
            </div>
            <div className="catalog-hero__monogram" aria-hidden="true">
              <span className="catalog-hero__monogram-ring"></span>
              <img
                src={`${rootPrefix}assets/icons/catalogs/${slug}.svg`}
                alt=""
              />
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
                  placeholder="Busque por vestido, balões, decoração, fantasia..."
                  autoComplete="off"
                />
              </label>
              <div className="result-count">
                <span className="result-count__icon">
                  <img
                    src={`${rootPrefix}assets/icons/catalogs/${slug}.svg`}
                    alt=""
                  />
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
