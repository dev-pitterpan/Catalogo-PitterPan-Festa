"use client";
import { useState, useEffect } from "react";
import { catalogVisual } from "../../lib/catalog/visual";
type CategoryData = {
  departments: { id: string; label: string; count: number }[];
  categories: { name: string; count: number }[];
  page: number;
  pages: number;
  total: number;
};
/** Departamentos compactos e categorias pesquisadas/paginadas: não cria milhares de links. */
export default function CategoryNavigation({
  slug,
  selected,
  onSelect,
}: {
  slug: string;
  selected: string;
  onSelect: (category: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CategoryData | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  useEffect(() => {
    if (!expanded) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError(false);
      fetch(
        `/api/categories/${encodeURIComponent(slug)}/?${new URLSearchParams({ q: search, department, page: String(page) })}`,
        { signal: controller.signal },
      )
        .then((response) => {
          if (!response.ok) throw new Error();
          return response.json();
        })
        .then((result: CategoryData) => setData(result))
        .catch(() => {
          if (!controller.signal.aborted) setError(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [slug, search, department, page, expanded]);
  return (
    <section className="category-navigation">
      <button
        type="button"
        className="category-navigation__heading"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        Categorias da coleção{" "}
        <span aria-hidden="true">{expanded ? "−" : "+"}</span>
      </button>
      {expanded && (
        <div>
          <label className="sr-only" htmlFor={`categories-${slug}`}>
            Pesquisar categoria
          </label>
          <input
            id={`categories-${slug}`}
            type="search"
            placeholder="Encontrar categoria…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <div className="category-navigation__departments">
            {(data && data.departments.length > 1 ? data.departments : []).map(
              (item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={department === item.id}
                  onClick={() => {
                    setDepartment(department === item.id ? "" : item.id);
                    setPage(1);
                  }}
                >
                  {item.label} <small>{item.count}</small>
                </button>
              ),
            )}
          </div>
          <button
            type="button"
            onClick={() => onSelect("")}
            aria-pressed={!selected}
          >
            Todas as categorias
          </button>
          {loading && <p role="status">Carregando…</p>}
          {error && (
            <p role="alert">
              Não foi possível consultar as categorias. Feche e abra para tentar
              novamente.
            </p>
          )}
          <ul>
            {data?.categories.map((item) => (
              <li key={item.name}>
                <button
                  type="button"
                  aria-pressed={selected === item.name}
                  onClick={() => onSelect(item.name)}
                >
                  <span className="category-navigation__name">
                    <i
                      style={{ background: catalogVisual(item.name).accent }}
                      aria-hidden="true"
                    />
                    {item.name}
                  </span>
                  <small>{item.count}</small>
                </button>
              </li>
            ))}
          </ul>
          {!loading && !error && data?.categories.length === 0 && (
            <p role="status">Nenhuma categoria encontrada.</p>
          )}
          {data && (
            <div className="category-navigation__pages">
              <button
                type="button"
                disabled={loading || page <= 1}
                onClick={() => setPage((value) => value - 1)}
              >
                Anterior
              </button>
              <small>
                {page}/{data.pages}
              </small>
              <button
                type="button"
                disabled={loading || page >= data.pages}
                onClick={() => setPage((value) => value + 1)}
              >
                Mais
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
