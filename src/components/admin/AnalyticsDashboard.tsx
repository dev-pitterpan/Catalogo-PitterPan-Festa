"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  ChevronRight,
  RefreshCw,
  Search,
  ExternalLink,
} from "lucide-react";
import AdminSelect from "./AdminSelect";
import DateRangePicker from "./DateRangePicker";
import PitterSpinner from "./PitterSpinner";
import FinanceOverview from "./FinanceOverview";
import InteractiveColumns from "./InteractiveColumns";
import { RevenueChart, shortDate, numberValue } from "./AnalyticsCharts";
import {
  reportCategories,
  shopifyReports,
} from "../../lib/admin/shopify-reports";
import type { DateRange } from "../../lib/admin/date-range";
import type { readShopifyOverview } from "../../server/sales/reports";
import ShopifyReportDetail from "./ShopifyReportDetail";
type Overview = Awaited<ReturnType<typeof readShopifyOverview>>;
const questions = [
  {
    id: "sales-time",
    title: "Como evoluíram as vendas?",
    description: "Visão comercial da Shopify, separada dos pagamentos.",
    icon: ChartNoAxesCombined,
  },
  {
    id: "sales-product",
    title: "Quais produtos mais venderam?",
    description:
      "Unidades atuais em pedidos pagos, sem cancelados ou estorno total.",
    icon: ShoppingBag,
  },
  {
    id: "marketing-referrer",
    title: "De onde vieram as vendas?",
    description: "Descubra os canais e plataformas de origem.",
    icon: Megaphone,
  },
  {
    id: "sessions-time",
    title: "Quantas pessoas visitaram a loja?",
    description: "Acompanhe visitas e visitantes da loja online.",
    icon: Globe,
  },
  {
    id: "conversion-funnel",
    title: "As visitas estão virando compras?",
    description: "Veja o caminho do carrinho até a compra.",
    icon: MousePointerClick,
  },
  {
    id: "customer-type",
    title: "Os clientes estão voltando?",
    description: "Compare clientes novos e recorrentes.",
    icon: Users,
  },
];
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export default function AnalyticsDashboard() {
  const router = useRouter();
  const [days, setDays] = useState("30"),
    [range, setRange] = useState<DateRange>({ start: "", end: "" }),
    [revision, setRevision] = useState(0),
    [reportId, setReportId] = useState(""),
    [search, setSearch] = useState(""),
    [data, setData] = useState<Overview | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  const [homeChart, setHomeChart] = useState("line");
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
    heading.current?.focus();
  }, [reportId]);
  const money = (n: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: data?.currency || "BRL",
    }).format(n);
  return (
    <div className="analytics-dashboard shopify-reports">
      <div className="analytics-toolbar">
        <div className="analytics-period">
          <span className="analytics-eyebrow">RESULTADOS DA SUA LOJA</span>
          <strong>
            {data
              ? `${shortDate(data.window.start)} a ${shortDate(data.window.end)}`
              : "Escolha o período"}
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
      {reportId ? (
        <>
          <button
            className="admin-button analytics-back"
            onClick={() => setReportId("")}
          >
            <ArrowLeft size={16} /> Voltar ao resumo
          </button>
          <h2 ref={heading} tabIndex={-1} className="admin-sr-only">
            Detalhes do relatório
          </h2>
          <ShopifyReportDetail key={reportId} id={reportId} params={params} />
        </>
      ) : (
        <>
          <div className="analytics-guide-intro">
            <span className="analytics-eyebrow">
              UMA VISÃO CLARA DO NEGÓCIO
            </span>
            <h2 ref={heading} tabIndex={-1}>
              Como está a sua loja?
            </h2>
            <p>
              Comece pelos números principais. Depois, escolha o que quer
              entender melhor.
            </p>
          </div>
          {busy && (
            <div className="admin-panel analytics-loading">
              <PitterSpinner label="Buscando os resultados na Shopify…" />
            </div>
          )}
          {error && (
            <p className="admin-data-notice" role="alert">
              {error} Você ainda pode abrir os relatórios abaixo.
            </p>
          )}
          <FinanceOverview params={params} />
          <details className="analytics-shopify-comparison">
            <summary>Comparar com o Shopify Analytics</summary>
            <p className="finance-definition">
              Os relatórios de vendas da Shopify incluem pedidos pendentes, não
              pagos e cancelados. Vendas registradas e ajustes comerciais não
              equivalem a pagamentos recebidos. Use os quadros financeiros acima
              para conferir recebido e estornado.
            </p>
            {data && (
              <section
                className="analytics-kpis"
                aria-label="Resumo do período"
              >
                {[
                  {
                    key: "total_sales",
                    label: "Vendas registradas (Shopify)",
                    tone: "blue",
                    hint: "Valor total de vendas conforme o relatório Shopify.",
                  },
                  {
                    key: "orders",
                    label: "Pedidos no Analytics",
                    tone: "gold",
                    hint: "Quantidade de pedidos registrados no período.",
                  },
                  {
                    key: "average_order_value",
                    label: "Valor médio por pedido",
                    tone: "rose",
                    hint: "Ticket médio calculado pela Shopify.",
                  },
                  {
                    key: "gross_sales",
                    label: "Vendas antes dos descontos",
                    tone: "teal",
                    hint: "Vendas brutas antes de descontos e devoluções.",
                  },
                ].map((k) => {
                  const current = numberValue(data.totals.rows[0]?.[k.key]),
                    before = numberValue(data.previous?.rows[0]?.[k.key]);
                  const change =
                    current !== null && before !== null && before !== 0
                      ? (100 * (current - before)) / Math.abs(before)
                      : null;
                  return (
                    <article
                      className={`analytics-kpi analytics-kpi--${k.tone}`}
                      key={k.key}
                      title={k.hint}
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
                              {change > 0 ? "+" : ""}
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
            {data?.trend && (
              <section className="admin-panel analytics-featured-chart">
                <header>
                  <div>
                    <span className="analytics-eyebrow">
                      CRITÉRIO DO SHOPIFY ANALYTICS
                    </span>
                    <h2>Vendas registradas por dia.</h2>
                    <p>
                      Passe pelo gráfico para descobrir o valor de cada dia.
                    </p>
                  </div>
                  <div
                    className="pitter-chart-switch"
                    role="group"
                    aria-label="Visualização das vendas"
                  >
                    <button
                      aria-pressed={homeChart === "line"}
                      onClick={() => setHomeChart("line")}
                    >
                      Evolução
                    </button>
                    <button
                      aria-pressed={homeChart === "depth"}
                      onClick={() => setHomeChart("depth")}
                    >
                      Colunas 3D
                    </button>
                  </div>
                </header>
                {homeChart === "depth" ? (
                  <InteractiveColumns
                    table={data.trend}
                    metric={{
                      key: "total_sales",
                      label: "Vendas registradas (Shopify)",
                      format: "money",
                    }}
                    series
                    format={(v) => {
                      const n = numberValue(v);
                      return n === null ? "—" : money(n);
                    }}
                  />
                ) : (
                  <RevenueChart
                    table={data.trend}
                    currency={data.currency}
                    money={(v) => (v === null ? "—" : money(v))}
                    showTable={false}
                  />
                )}
                <button
                  className="analytics-expand"
                  onClick={() => setReportId("sales-time")}
                >
                  Explorar todos os detalhes das vendas{" "}
                  <ChevronRight size={14} />
                </button>
              </section>
            )}
          </details>
          <div className="analytics-guide-intro">
            <h2>O que você quer descobrir?</h2>
            <p>Clique em uma pergunta para explorar o gráfico e os dados.</p>
          </div>
          <div className="analytics-question-grid">
            {questions.map(({ id, title, description, icon: Icon }) => (
              <button
                className="analytics-question-card"
                key={id}
                onClick={() =>
                  id === "sales-product"
                    ? router.push(`/gestor/vendas/?${params}#sold-products`)
                    : setReportId(id)
                }
              >
                <Icon size={22} />
                <span>
                  <strong>{title}</strong>
                  <small>{description}</small>
                </span>
                <ChevronRight size={17} />
              </button>
            ))}
          </div>
          <details className="analytics-all-reports">
            <summary>
              Todos os relatórios · vendas, clientes, estoque e mais
            </summary>
            <p className="analytics-session-note">
              Encontre uma informação específica. Cada relatório abre
              separadamente.
            </p>
            <label className="shopify-report-search">
              <Search size={16} />
              <input
                type="search"
                aria-label="Pesquisar relatórios"
                placeholder="Busque por produto, estoque, entrega…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            {reportCategories.map((c) => {
              const reports = shopifyReports.filter(
                (r) =>
                  r.category === c.id &&
                  normalize(`${r.title} ${r.description}`).includes(
                    normalize(search.trim()),
                  ),
              );
              return reports.length ? (
                <section className="analytics-report-group" key={c.id}>
                  <h3>{c.title}</h3>
                  {reports.map((r) => (
                    <button key={r.id} onClick={() => setReportId(r.id)}>
                      {r.title}
                      <ChevronRight size={15} />
                    </button>
                  ))}
                </section>
              ) : null;
            })}
            {!shopifyReports.some((r) =>
              normalize(`${r.title} ${r.description}`).includes(
                normalize(search.trim()),
              ),
            ) && <p>Nenhum relatório encontrado para essa busca.</p>}
          </details>
        </>
      )}
      <footer className="analytics-simple-footer">
        <span>
          Pagamentos: pedidos sincronizados da Shopify. Relatórios comerciais:
          Shopify Analytics{data ? ` · ${data.timezone}` : ""}.
        </span>
        <a
          href="https://admin.shopify.com/store/pitter-pan/analytics/reports"
          target="_blank"
          rel="noopener noreferrer"
        >
          Abrir painel da Shopify <ExternalLink size={12} />
        </a>
      </footer>
    </div>
  );
}
