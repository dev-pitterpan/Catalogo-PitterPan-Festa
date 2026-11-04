"use client";

import { useState } from "react";
import Link, { useLinkStatus } from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgePercent,
  CakeSlice,
  CalendarDays,
  Candy,
  Egg,
  Flame,
  Flag,
  Ghost,
  Layers3,
  Package,
  Palette,
  PartyPopper,
  Search,
  Shapes,
  Sparkles,
  TreePine,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { departments } from "../../lib/catalog/departments";
import { normalizeText } from "../../lib/catalog/query";
import type { CatalogSummary } from "../../types/catalog";

const icons: Record<string, LucideIcon> = {
  todos: Layers3,
  "festas-e-decoracao": PartyPopper,
  "doces-e-guloseimas": Candy,
  confeitaria: CakeSlice,
  "embalagens-e-descartaveis": Package,
  "artesanato-e-papelaria": Palette,
  utilidades: Shapes,
  "datas-especiais": CalendarDays,
  ofertas: BadgePercent,
  halloween: Ghost,
  natal: TreePine,
  pascoa: Egg,
  "festa-junina": Flame,
  "copa-do-mundo": Flag,
  "4-de-julho": Flag,
  reveillon: Sparkles,
};
const descriptions: Record<string, string> = {
  "festas-e-decoracao": "Balões, temas e detalhes para celebrar.",
  "doces-e-guloseimas": "Sabores para festas e lembrancinhas.",
  confeitaria: "Ingredientes, formas e utensílios.",
  "embalagens-e-descartaveis": "Tudo para embalar, servir e apresentar.",
  "artesanato-e-papelaria": "Materiais para colocar ideias em festa.",
  utilidades: "Soluções práticas para o dia a dia.",
  "datas-especiais": "Explore todas as campanhas temáticas.",
  ofertas: "Seleções com condições especiais.",
};
function NavigationProgress() {
  const { pending } = useLinkStatus();
  return pending ? <span role="status">Abrindo catálogo…</span> : null;
}

function CatalogTile({
  catalog,
  compact = false,
  publicView = false,
}: {
  catalog: CatalogSummary;
  compact?: boolean;
  publicView?: boolean;
}) {
  const Icon = icons[catalog.slug] || CalendarDays;
  return (
    <Link
      className={`manager-hub__tile ${compact ? "manager-hub__tile--compact" : ""}`}
      href={`${publicView ? "" : "/gestor"}/${catalog.slug}/`}
      target={publicView ? undefined : "_blank"}
      rel={publicView ? undefined : "noopener noreferrer"}
      prefetch={false}
    >
      <span className="manager-hub__icon">
        <Icon size={23} strokeWidth={1.65} aria-hidden="true" />
      </span>
      <span className="manager-hub__tile-copy">
        <strong>{catalog.name}</strong>
        <NavigationProgress />
        {!compact && (
          <small>{descriptions[catalog.slug] || catalog.description}</small>
        )}
      </span>
      <ArrowUpRight
        className="manager-hub__tile-arrow"
        size={17}
        aria-hidden="true"
      />
    </Link>
  );
}
export default function ManagerHome({
  catalogs,
  publicView = false,
}: {
  catalogs: CatalogSummary[];
  publicView?: boolean;
}) {
  const [query, setQuery] = useState("");
  const terms = normalizeText(query).split(" ").filter(Boolean);
  const matches = (catalog: CatalogSummary) =>
    terms.every((term) =>
      normalizeText(
        `${catalog.name} ${descriptions[catalog.slug] || catalog.description}`,
      ).includes(term),
    );
  const departmentSlugs = new Set(departments.map((item) => item.slug));
  const departmentItems = departments.flatMap((department) =>
    catalogs.filter((catalog) => catalog.slug === department.slug),
  );
  const seasonalItems = catalogs
    .filter(
      (catalog) =>
        catalog.slug !== "todos" && !departmentSlugs.has(catalog.slug),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const filteredDepartments = departmentItems.filter(matches);
  const filteredSeasonal = seasonalItems.filter(matches);
  const total = filteredDepartments.length + filteredSeasonal.length;
  const all = catalogs.find((catalog) => catalog.slug === "todos");
  return (
    <main className="manager-hub">
      <header className="manager-hub__topbar">
        <Link
          href={publicView ? "/" : "/gestor/"}
          className="manager-hub__brand"
          aria-label={
            publicView
              ? "Início dos catálogos Pitter Pan"
              : "Início do gestor Pitter Pan"
          }
        >
          <img
            src="/assets/images/brand/pitter-pan-logo.svg"
            alt="Pitter Pan Festas"
          />
          <span>
            <strong>Pitter Pan Festas</strong>
            <small>Central de catálogos</small>
          </span>
        </Link>
        <span className="manager-hub__account">
          <UserRound size={16} aria-hidden="true" />
          <span>{publicView ? "Catálogos Pitter Pan" : "Área do gestor"}</span>
        </span>
      </header>
      <div className="manager-hub__content">
        <section className="manager-hub__intro" aria-labelledby="gestor-title">
          <div>
            <p className="manager-hub__eyebrow">
              <PartyPopper size={15} aria-hidden="true" /> Organização que vira
              festa
            </p>
            <h1 id="gestor-title">
              Tudo pronto para
              <br className="manager-hub__break" /> o próximo atendimento.
            </h1>
            <p>
              Encontre uma seleção, confira os produtos e compartilhe com seu
              cliente.
            </p>
          </div>
          {all && (
            <Link
              className="manager-hub__all"
              href={publicView ? "/todos/" : "/gestor/todos/"}
              target={publicView ? undefined : "_blank"}
              rel={publicView ? undefined : "noopener noreferrer"}
              prefetch={false}
            >
              <span className="manager-hub__all-icon">
                <Layers3 size={22} aria-hidden="true" />
              </span>
              <span>
                <small>Visão completa</small>
                <strong>Todos os produtos</strong>
                <NavigationProgress />
              </span>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          )}
        </section>
        <div className="manager-hub__toolbar">
          <label className="manager-hub__search">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              aria-label="Buscar departamentos e datas especiais"
              placeholder="Buscar departamento ou data especial…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Limpar busca"
              >
                <X size={16} />
              </button>
            )}
          </label>
          <span className="manager-hub__summary" role="status">
            {terms.length
              ? `${total} resultados`
              : `${departmentItems.length} departamentos · ${seasonalItems.length} datas especiais`}
          </span>
        </div>
        {filteredDepartments.length > 0 && (
          <section
            className="manager-hub__section"
            aria-labelledby="departments-title"
          >
            <div className="manager-hub__section-heading">
              <h2 id="departments-title">
                Departamentos <span>{filteredDepartments.length}</span>
              </h2>
              <p>Do que seu cliente precisa?</p>
            </div>
            <nav
              className="manager-hub__grid"
              aria-label="Catálogos por departamento"
            >
              {filteredDepartments.map((catalog) => (
                <CatalogTile
                  key={catalog.slug}
                  catalog={catalog}
                  publicView={publicView}
                />
              ))}
            </nav>
          </section>
        )}
        {filteredSeasonal.length > 0 && (
          <section
            className="manager-hub__section"
            aria-labelledby="seasonal-title"
          >
            <div className="manager-hub__section-heading">
              <h2 id="seasonal-title">
                Datas especiais <span>{filteredSeasonal.length}</span>
              </h2>
              <p>Cada ocasião merece uma seleção.</p>
            </div>
            <nav
              className="manager-hub__dates"
              aria-label="Catálogos de datas especiais"
            >
              {filteredSeasonal.map((catalog) => (
                <CatalogTile
                  key={catalog.slug}
                  catalog={catalog}
                  compact
                  publicView={publicView}
                />
              ))}
            </nav>
          </section>
        )}
        {!total && (
          <div className="manager-hub__empty">
            <Search size={28} aria-hidden="true" />
            <h2>Nenhuma seleção encontrada</h2>
            <p>Tente outra palavra ou limpe a busca.</p>
            <button type="button" onClick={() => setQuery("")}>
              Ver todas as seleções
            </button>
          </div>
        )}
        <footer className="manager-hub__footer">
          <span>
            <Sparkles size={14} aria-hidden="true" /> Pequenos detalhes. Grandes
            celebrações.
          </span>
          <small>Pitter Pan Festas · Catálogos digitais</small>
        </footer>
      </div>
    </main>
  );
}
