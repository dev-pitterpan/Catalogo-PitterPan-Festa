"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, X, ChevronDown } from "lucide-react";
import type { CSSProperties } from "react";
import type { CatalogSummary } from "../../types/catalog";
import { normalizeText } from "../../lib/catalog/query";
import CatalogIcon from "./CatalogIcon";
import { collectionGroups } from "../../lib/catalog/navigation";
import { catalogVisual } from "../../lib/catalog/visual";
import { departments, departmentHandles } from "../../lib/catalog/departments";

export default function CollectionNavigation({
  catalogs,
  slug,
  isClient,
  onClose,
  categories = [],
  selectedCategory = "",
  onCategorySelect,
}: {
  catalogs: CatalogSummary[];
  slug: string;
  isClient: boolean;
  onClose: () => void;
  categories?: { name: string; count: number }[];
  selectedCategory?: string;
  onCategorySelect?: (category: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [collapsedFilters, setCollapsedFilters] = useState<
    Record<string, boolean>
  >({});
  const terms = normalizeText(query).split(" ").filter(Boolean);
  const departmentSlugs = new Set(
    departments.map((department) => department.slug),
  );
  const ecommerce = catalogs.some((item) => item.slug === "festas-e-decoracao");
  const groups = ecommerce
    ? [
        {
          label: "Catálogo completo",
          items: catalogs.filter((item) => item.slug === "todos"),
        },
        {
          label: "Comprar por departamento",
          items: departments.flatMap((department) =>
            catalogs.filter((item) => item.slug === department.slug),
          ),
        },
        {
          label: "Datas especiais",
          items: catalogs
            .filter(
              (item) =>
                item.slug !== "todos" && !departmentSlugs.has(item.slug),
            )
            .sort(
              (a, b) =>
                Number(b.slug === slug) - Number(a.slug === slug) ||
                a.name.localeCompare(b.name, "pt-BR"),
            ),
        },
      ].map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const searchable = normalizeText(
            [item.name, ...departmentHandles(item.slug)].join(" "),
          );
          return terms.every((term) => searchable.includes(term));
        }),
      }))
    : collectionGroups(catalogs, slug, query);
  const matchCount = groups.reduce((sum, group) => sum + group.items.length, 0);
  return (
    <div className="collection-navigation">
      <div className="collection-navigation__search-header">
        <label className="collection-navigation__search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            aria-label="Buscar coleção"
            placeholder="Encontre em todas as coleções…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        {query && (
          <button
            type="button"
            className="collection-navigation__clear"
            aria-label="Limpar busca de coleções"
            onClick={() => setQuery("")}
          >
            <X size={15} aria-hidden="true" />
          </button>
        )}
        <p className="collection-navigation__hint" role="status">
          {terms.length
            ? `${matchCount} coleções encontradas`
            : ecommerce
              ? "Departamentos e datas especiais"
              : `${catalogs.length} coleções organizadas por assunto`}
        </p>
      </div>
      {groups
        .filter((group) => group.items.length)
        .map((group) => (
          <section
            className="collection-navigation__group"
            key={group.label}
            aria-label={group.label}
          >
            <h3>
              {group.label}
              <span>{group.items.length}</span>
            </h3>
            <div className="catalog-nav-list">
              {group.items.map((item) => (
                <div key={item.slug} className="collection-navigation__branch">
                  <Link
                    className={`catalog-nav-item ${item.slug === slug ? "is-active" : ""}`}
                    href={`${isClient ? "" : "/gestor"}/${item.slug}/`}
                    prefetch={false}
                    onClick={onClose}
                    aria-current={item.slug === slug ? "page" : undefined}
                    title={item.name}
                    style={{ "--item-accent": item.accent } as CSSProperties}
                  >
                    <span className="nav-icon">
                      <CatalogIcon slug={item.slug} />
                    </span>
                    <span className="nav-name">{item.name}</span>
                  </Link>
                  {item.slug === slug &&
                    !terms.length &&
                    categories.length > 0 &&
                    onCategorySelect && (
                      <div className="collection-navigation__filter-section">
                        <button
                          type="button"
                          className="collection-navigation__filter-toggle"
                          aria-expanded={!collapsedFilters[item.slug]}
                          aria-controls={`collection-filters-${item.slug}`}
                          onClick={() =>
                            setCollapsedFilters((previous) => ({
                              ...previous,
                              [item.slug]: !previous[item.slug],
                            }))
                          }
                        >
                          <span>
                            Filtrar produtos
                            {selectedCategory ? ` · ${selectedCategory}` : ""}
                          </span>
                          <ChevronDown size={15} aria-hidden="true" />
                        </button>
                        <div
                          id={`collection-filters-${item.slug}`}
                          hidden={!!collapsedFilters[item.slug]}
                          className="collection-navigation__children"
                          aria-label={`Categorias de ${item.name}`}
                        >
                          <button
                            type="button"
                            aria-pressed={!selectedCategory}
                            onClick={() => onCategorySelect("")}
                          >
                            {item.slug === "todos"
                              ? "Todos os produtos"
                              : `Todos de ${item.name}`}
                          </button>
                          {categories.map((category) => (
                            <button
                              key={category.name}
                              type="button"
                              aria-pressed={selectedCategory === category.name}
                              onClick={() => onCategorySelect(category.name)}
                            >
                              <span>
                                <i
                                  aria-hidden="true"
                                  style={{
                                    background: catalogVisual(category.name)
                                      .accent,
                                  }}
                                />
                                {category.name}
                              </span>
                              <small>{category.count}</small>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              ))}
            </div>
          </section>
        ))}
      {!matchCount && (
        <p className="collection-navigation__empty">
          Nenhuma coleção encontrada. Tente outra palavra.
        </p>
      )}
    </div>
  );
}
