"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  ChartNoAxesCombined,
  ShoppingBag,
  Globe,
  MousePointerClick,
  Users,
  Megaphone,
  Boxes,
  Store,
  ChevronRight,
  RefreshCw,
  Search,
  ExternalLink,
} from "lucide-react";
import AdminSelect from "./AdminSelect";
import DateRangePicker from "./DateRangePicker";
import PitterSpinner from "./PitterSpinner";
import { shortDate, numberValue } from "./AnalyticsCharts";
import {
  reportCategories,
  shopifyReports,
} from "../../lib/admin/shopify-reports";
import type { DateRange } from "../../lib/admin/date-range";
import type { readShopifyOverview } from "../../server/sales/reports";
import ShopifyReportDetail from "./ShopifyReportDetail";
type Overview = Awaited<ReturnType<typeof readShopifyOverview>>;
const icons = {
  sales: ChartNoAxesCombined,
  orders: ShoppingBag,
  acquisition: Globe,
  behavior: MousePointerClick,
  customers: Users,
  marketing: Megaphone,
  inventory: Boxes,
  pos: Store,
};
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export default function AnalyticsDashboard() {
  const [days, setDays] = useState("30"),
    [range, setRange] = useState<DateRange>({ start: "", end: "" }),
    [revision, setRevision] = useState(0),
    [category, setCategory] = useState(""),
    [reportId, setReportId] = useState(""),
    [search, setSearch] = useState(""),
    [data, setData] = useState<Overview | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const params = new URLSearchParams({
    days,
    start: range.start,
    end: range.end,
    refresh: String(revision),
  }).toString();
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    setBusy(true);
    void fetch(`/api/admin/analytics/?${params}&overview=1`, {
      cache: "no-store",
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(55000)]),
    })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || "Falha na consulta.");
        if (!controller.signal.aborted) setData(body);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Falha na consulta.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [params]);
  useEffect(() => {
    if (category || reportId) heading.current?.focus();
  }, [category, reportId]);
  const selected = reportCategories.find((c) => c.id === category),
    report = shopifyReports.find((r) => r.id === reportId);
  const list = shopifyReports.filter(
    (r) =>
      (!category || r.category === category) &&
      (!search ||
        normalize(`${r.title} ${r.description}`).includes(normalize(search))),
  );
  function openCategory(id: string) {
    setCategory(id);
    setReportId("");
    setSearch("");
  }
  const money = (n: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: data?.currency || "BRL",
    }).format(n);
  return (
    <div className="analytics-dashboard shopify-reports">
      <div className="analytics-toolbar">
        <div className="analytics-period">
          <span className="analytics-eyebrow">SHOPIFY ANALYTICS</span>
          <strong>
            {data
              ? `${shortDate(data.window.start)} a ${shortDate(data.window.end)}`
              : "Selecione o período"}
          </strong>
        </div>
        <div className="insights-filters">
          <AdminSelect
            label="Período das análises"
            value={days}
            onValueChange={(v) => {
              setDays(v);
              setRange({ start: "", end: "" });
            }}
            options={[
              { value: "1", label: "Hoje" },
              { value: "7", label: "Últimos 7 dias" },
              { value: "30", label: "Últimos 30 dias" },
              { value: "60", label: "Últimos 60 dias" },
            ]}
          />
          <DateRangePicker value={range} onChange={setRange} />
          <button
            className="admin-button"
            onClick={() => setRevision((n) => n + 1)}
            aria-label="Atualizar relatórios"
          >
            <RefreshCw size={16} /> Atualizar
          </button>
        </div>
      </div>
      <nav
        className="shopify-report-navigation"
        aria-label="Categorias de análises"
      >
        <button
          className={!category ? "is-current" : ""}
          aria-current={!category ? "page" : undefined}
          onClick={() => openCategory("")}
        >
          Visão geral
        </button>
        {reportCategories.map((c) => (
          <button
            key={c.id}
            className={category === c.id ? "is-current" : ""}
            aria-current={category === c.id ? "page" : undefined}
            onClick={() => openCategory(c.id)}
          >
            {c.title}
          </button>
        ))}
      </nav>
      {!category && !search && !reportId && (
        <>
          {busy && (
            <div className="admin-panel analytics-loading" role="status">
              <PitterSpinner label="Consultando o resumo da Shopify…" />
            </div>
          )}
          {error && (
            <p className="admin-data-notice" role="alert">
              {error} Você pode consultar os relatórios abaixo individualmente.
            </p>
          )}
          {data && (
            <section className="analytics-kpis" aria-label="Resumo do período">
              {[
                { key: "gross_sales", label: "Vendas brutas", tone: "gold" },
                { key: "total_sales", label: "Total de vendas", tone: "blue" },
                { key: "orders", label: "Pedidos", tone: "rose" },
                {
                  key: "average_order_value",
                  label: "Valor médio do pedido",
                  tone: "teal",
                },
              ].map((k) => {
                const current = numberValue(data.totals.rows[0]?.[k.key]),
                  previous = numberValue(data.previous?.rows[0]?.[k.key]);
                const change =
                  current !== null && previous !== null && previous !== 0
                    ? ((current - previous) / Math.abs(previous)) * 100
                    : null;
                return (
                  <article
                    className={`analytics-kpi analytics-kpi--${k.tone}`}
                    key={k.key}
                  >
                    <div className="analytics-kpi-top">{k.label}</div>
                    <strong>
                      {current === null
                        ? "—"
                        : k.key === "orders"
                          ? current.toLocaleString("pt-BR")
                          : money(current)}
                    </strong>
                    <div className="analytics-kpi-comparison">
                      {change === null ? (
                        <small>Sem base para comparação</small>
                      ) : (
                        <>
                          <span
                            className={`analytics-change ${change < 0 ? "is-down" : "is-up"}`}
                          >
                            {change < 0 ? (
                              <ArrowDownRight size={14} />
                            ) : (
                              <ArrowUpRight size={14} />
                            )}{" "}
                            {change.toLocaleString("pt-BR", {
                              maximumFractionDigits: 1,
                            })}
                            %
                          </span>
                          <small>vs. período anterior</small>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          )}
          <div className="shopify-library-heading">
            <span className="analytics-eyebrow">
              ESCOLHA O QUE QUER ANALISAR
            </span>
            <h2>Seus resultados, por assunto.</h2>
            <p>
              Abra uma categoria e selecione um relatório para ver os detalhes.
            </p>
          </div>
          <div className="shopify-category-grid">
            {reportCategories.map((c, i) => {
              const Icon = icons[c.icon];
              return (
                <button
                  className={`shopify-category-card shopify-category-card--${i % 4}`}
                  key={c.id}
                  onClick={() => openCategory(c.id)}
                >
                  <span className="shopify-category-icon">
                    <Icon size={23} />
                  </span>
                  <span className="shopify-category-copy">
                    <strong>{c.title}</strong>
                    <span>{c.description}</span>
                    <small>
                      {shopifyReports.filter((r) => r.category === c.id).length}{" "}
                      relatórios
                    </small>
                  </span>
                  <ChevronRight size={18} />
                </button>
              );
            })}
          </div>
        </>
      )}
      <div className="shopify-library-heading shopify-library-heading--list">
        <div>
          {(category || reportId) && (
            <button
              className="shopify-back"
              onClick={() => {
                if (reportId) setReportId("");
                else openCategory("");
              }}
            >
              <ArrowLeft size={15} />
              {reportId ? "Voltar aos relatórios" : "Todas as categorias"}
            </button>
          )}
          <h2 ref={heading} tabIndex={-1}>
            {report
              ? report.title
              : selected?.title || "Biblioteca de relatórios"}
          </h2>
          {!report && (
            <p>
              {selected?.description ||
                "Pesquise um indicador para abrir o relatório correspondente."}
            </p>
          )}
        </div>
        {!report && (
          <label className="shopify-report-search">
            <Search size={16} />
            <input
              type="search"
              aria-label="Pesquisar relatórios"
              placeholder="Pesquisar relatórios…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        )}
      </div>
      {report ? (
        <ShopifyReportDetail key={report.id} id={report.id} params={params} />
      ) : category || search.trim() ? (
        <>
          <div className="shopify-report-list" role="list">
            {list.map((r) => (
              <button
                role="listitem"
                key={r.id}
                onClick={() => {
                  setCategory(r.category);
                  setReportId(r.id);
                }}
              >
                <span>
                  <strong>{r.title}</strong>
                  <small>{r.description}</small>
                </span>
                <span className="shopify-report-category-label">
                  {reportCategories.find((c) => c.id === r.category)?.title}
                </span>
                <ChevronRight size={17} />
              </button>
            ))}
          </div>
          {!list.length && (
            <div className="analytics-empty">
              Nenhum relatório encontrado. Tente outro termo.
            </div>
          )}
          {category === "customers" && (
            <div className="shopify-native-notice">
              <Users size={20} />
              <div>
                <strong>Coortes e análise RFM</strong>
                <p>
                  Esses relatórios especializados continuam disponíveis no
                  painel da Shopify. Não estimamos os resultados a partir dos
                  pedidos do catálogo.
                </p>
                <a
                  href="https://admin.shopify.com/store/pitter-pan/analytics/reports"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir relatórios na Shopify <ExternalLink size={13} />
                </a>
              </div>
            </div>
          )}
        </>
      ) : null}
      {!category && !report && (
        <div className="shopify-native-notice">
          <Globe size={23} />
          <div>
            <strong>Live View da Shopify</strong>
            <p>
              Visitantes agora, carrinhos ativos e o globo ao vivo são
              consultados na Shopify. Os relatórios acima seguem o processamento
              do Analytics e não representam atividade em tempo real.
            </p>
            <a
              href="https://admin.shopify.com/store/pitter-pan/analytics/live"
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir Live View <ExternalLink size={13} />
            </a>
          </div>
        </div>
      )}
      {!report && (
        <footer className="analytics-source">
          <span>
            <i /> Fonte: Shopify Analytics
          </span>
          <p>
            {data
              ? `Atualizado em ${new Date(data.generatedAt).toLocaleString("pt-BR", { timeZone: data.timezone })} · ${data.timezone}. `
              : ""}
            Os detalhes são consultados ao abrir cada relatório. A
            disponibilidade depende dos dados e acessos da loja.
          </p>
        </footer>
      )}
    </div>
  );
}
