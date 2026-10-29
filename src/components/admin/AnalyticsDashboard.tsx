"use client";
import { useEffect, useState } from "react";
import {
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingBag,
  Wallet,
  ReceiptText,
  ChartNoAxesCombined,
  Store,
  Package,
  Globe,
  CalendarDays,
} from "lucide-react";
import {
  RevenueChart,
  RankedBars,
  SessionJourney,
  ChartEmpty,
  shortDate,
} from "./AnalyticsCharts";
import AdminSelect from "./AdminSelect";
import DateRangePicker from "./DateRangePicker";
import type { DateRange } from "../../lib/admin/date-range";
import PitterSpinner from "./PitterSpinner";
import { csvCell } from "../../lib/admin/csv";
import type {
  readShopifyAnalytics,
  AnalyticsTable,
} from "../../server/sales/analytics";
type Data = Awaited<ReturnType<typeof readShopifyAnalytics>>;
const numeric = (value: unknown) =>
  value !== null &&
  value !== undefined &&
  value !== "" &&
  Number.isFinite(Number(value))
    ? Number(value)
    : null;
const num = (value: number | null) =>
  value === null
    ? "—"
    : new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(
        value,
      );
function value(table: AnalyticsTable | null | undefined, key: string) {
  return numeric(table?.rows[0]?.[key]);
}
const names: Record<string, string> = {
  gross_sales: "Vendas brutas",
  discounts: "Descontos",
  returns: "Estornos de vendas",
  net_sales: "Vendas líquidas",
  shipping_charges: "Frete",
  taxes: "Tributos",
  total_sales: "Total de vendas",
  orders: "Pedidos",
  average_order_value: "Valor médio do pedido",
};
export default function AnalyticsDashboard() {
  const [range, setRange] = useState<DateRange>({ start: "", end: "" });
  const [days, setDays] = useState("30"),
    [revision, setRevision] = useState(0),
    [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError("");
    setData(null);
    void fetch(
      `/api/admin/analytics/?${new URLSearchParams({ days, start: range.start, end: range.end })}`,
      {
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(55000),
        ]),
        cache: "no-store",
      },
    )
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error);
        if (!controller.signal.aborted) setData(body);
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : "Falha na consulta.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [days, revision, range.start, range.end]);
  const money = (n: number | null) =>
    n === null
      ? "—"
      : new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: data?.currency || "BRL",
        }).format(n);
  function download() {
    if (!data) return;
    const rows: unknown[][] = [
      ["Fonte", "Shopify Analytics"],
      ["Período", data.window.start, data.window.end],
      ["Fuso", data.timezone],
      [],
      ["Indicador", "Valor"],
      ...Object.entries(names).map(([key, label]) => [
        label,
        data.totals.rows[0]?.[key] ?? "Não disponível",
      ]),
    ];
    for (const [title, table] of [
      ["Vendas por dia", data.trend.table],
      ["Itens pedidos", data.orderMetrics.table],
      ["Processamento e entregas", data.fulfillment.table],
      ["Canais", data.channels.table],
      ["Produtos", data.products.table],
    ] as const) {
      if (!table) continue;
      rows.push(
        [],
        [title],
        table.columns.map((c) => c.displayName),
        ...table.rows.map((r) => table.columns.map((c) => r[c.name])),
      );
    }
    const url = URL.createObjectURL(
      new Blob(
        ["\ufeff" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `analises-shopify-${data.window.start}-${data.window.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  const period = data
    ? `${shortDate(data.window.start)} a ${shortDate(data.window.end)}`
    : "";
  const kpis = [
    {
      key: "total_sales",
      icon: Wallet,
      tone: "blue",
      note: "Inclui frete e tributos",
    },
    {
      key: "gross_sales",
      icon: ChartNoAxesCombined,
      tone: "gold",
      note: "Antes de descontos e estornos",
    },
    {
      key: "orders",
      icon: ShoppingBag,
      tone: "rose",
      note: "Pedidos no período selecionado",
    },
    {
      key: "average_order_value",
      icon: ReceiptText,
      tone: "teal",
      note: "Ticket médio da Shopify",
    },
  ];
  return (
    <div className="analytics-dashboard">
      <div className="analytics-toolbar">
        <div className="analytics-period">
          <span className="analytics-eyebrow">
            <CalendarDays size={14} /> VISÃO DO NEGÓCIO
          </span>
          <strong>
            {busy
              ? "Consultando resultados…"
              : data
                ? period
                : "Análises da loja"}
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
            className="admin-button analytics-refresh"
            onClick={() => setRevision((n) => n + 1)}
            disabled={busy}
            aria-label="Atualizar análises"
          >
            <RefreshCw size={16} />
            <span>Atualizar</span>
          </button>
          <button
            className="admin-button analytics-export"
            onClick={download}
            disabled={!data || busy}
          >
            <Download size={16} /> Exportar
          </button>
        </div>
      </div>
      {busy && (
        <div className="admin-panel analytics-loading" role="status">
          <PitterSpinner label="Buscando os resultados da sua loja…" />
          <p>Preparando vendas, canais e comportamento de compra.</p>
        </div>
      )}
      {error && (
        <div className="admin-data-notice" role="alert">
          <div>
            <strong>Não foi possível consultar as análises</strong>
            <p>{error}</p>
            <a className="admin-text-link" href="/gestor/vendas/">
              Ver pedidos já importados
            </a>
          </div>
        </div>
      )}
      {data && (
        <>
          <section
            className="analytics-kpis"
            aria-label="Indicadores reais de vendas"
          >
            {kpis.map(({ key, icon: Icon, tone, note }) => {
              const current = value(data.totals, key),
                previous = value(data.previous.table, key);
              const change =
                current !== null && previous !== null && previous !== 0
                  ? ((current - previous) / Math.abs(previous)) * 100
                  : null;
              return (
                <article
                  className={`analytics-kpi analytics-kpi--${tone}`}
                  key={key}
                >
                  <div className="analytics-kpi-top">
                    <span>{names[key]}</span>
                    <span className="analytics-kpi-icon">
                      <Icon size={19} />
                    </span>
                  </div>
                  <strong>
                    {key === "orders" ? num(current) : money(current)}
                  </strong>
                  <div className="analytics-kpi-comparison">
                    {change !== null ? (
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
                          {num(change)}%
                        </span>
                        <small>vs. período anterior</small>
                      </>
                    ) : (
                      <small>Sem base para comparação</small>
                    )}
                  </div>
                  <p>{note}</p>
                </article>
              );
            })}
          </section>
          <section className="admin-panel analytics-panel analytics-order-operations">
            <header className="analytics-panel-heading">
              <div>
                <span className="analytics-eyebrow">OPERAÇÃO DOS PEDIDOS</span>
                <h2>Do pedido à entrega</h2>
                <p>
                  Indicadores oficiais da Shopify para o período selecionado.
                </p>
              </div>
              <span className="analytics-panel-icon">
                <Package size={20} />
              </span>
            </header>
            <div className="analytics-operations-grid">
              {[
                [
                  "Pedidos",
                  num(value(data.totals, "orders")),
                  "Pedidos registrados no relatório de vendas",
                ],
                [
                  "Itens pedidos",
                  num(value(data.orderMetrics.table, "quantity_ordered")),
                  "Quantidade pedida antes de estornos",
                ],
                [
                  "Estornos de vendas",
                  money(value(data.totals, "returns")),
                  "Estornos de vendas informados pela Shopify",
                ],
                [
                  "Pedidos processados",
                  num(value(data.fulfillment.table, "orders_fulfilled")),
                  "Pedidos com processamento registrado no período",
                ],
                [
                  "Pedidos entregues",
                  num(value(data.fulfillment.table, "orders_delivered")),
                  "Entregas confirmadas na Shopify",
                ],
                [
                  "Tempo até processamento",
                  value(
                    data.fulfillment.table,
                    "median_hours_order_to_fulfillment",
                  ) === null
                    ? "—"
                    : `${num(value(data.fulfillment.table, "median_hours_order_to_fulfillment"))} h`,
                  "Mediana entre o pedido e o processamento",
                ],
              ].map(([label, note, hint]) => (
                <div key={label} title={hint}>
                  <span>{label}</span>
                  <strong>{note}</strong>
                  <small>{hint}</small>
                </div>
              ))}
            </div>
            {(data.fulfillment.error || data.orderMetrics.error) && (
              <p className="analytics-session-note" role="status">
                Alguns indicadores operacionais não estão disponíveis nesta
                consulta. “—” indica ausência de dados, não zero.
              </p>
            )}
            <p className="analytics-session-note">
              Vendas e eventos de processamento/entrega usam suas respectivas
              datas na Shopify. Processado não significa entregue; o tempo é a
              mediana, não a média.
            </p>
          </section>
          <div className="analytics-main-grid">
            <section className="admin-panel analytics-panel analytics-revenue">
              <header className="analytics-panel-heading">
                <div>
                  <span className="analytics-eyebrow">EVOLUÇÃO</span>
                  <h2>O ritmo das suas vendas</h2>
                  <p>Acompanhe os resultados de cada dia.</p>
                </div>
                <span className="analytics-panel-icon">
                  <ChartNoAxesCombined size={20} />
                </span>
              </header>
              {data.trend.table?.rows.length ? (
                <RevenueChart
                  key={`${data.generatedAt}`}
                  table={data.trend.table}
                  money={money}
                  currency={data.currency}
                />
              ) : (
                <ChartEmpty
                  text={
                    data.trend.error || "Sem vendas diárias para este período."
                  }
                />
              )}
            </section>
            <section className="admin-panel analytics-panel analytics-composition">
              <header className="analytics-panel-heading">
                <div>
                  <span className="analytics-eyebrow">COMPOSIÇÃO</span>
                  <h2>Por dentro das vendas</h2>
                  <p>Do valor bruto ao total do período.</p>
                </div>
              </header>
              <dl className="analytics-financials">
                {Object.entries(names)
                  .filter(
                    ([key]) =>
                      ![
                        "orders",
                        "average_order_value",
                        "total_sales",
                      ].includes(key),
                  )
                  .map(([key, name]) => (
                    <div key={key}>
                      <dt>
                        <i
                          className={`analytics-financial-dot analytics-financial-dot--${key}`}
                        />
                        {name}
                      </dt>
                      <dd>{money(value(data.totals, key))}</dd>
                    </div>
                  ))}
              </dl>
              <div className="analytics-financial-total">
                <span>Total de vendas</span>
                <strong>{money(value(data.totals, "total_sales"))}</strong>
                <small>Conforme o relatório da Shopify</small>
              </div>
            </section>
          </div>
          <div className="analytics-rank-grid">
            {[
              {
                key: "channels" as const,
                title: "Onde os clientes compram",
                caption: "CANAIS DE VENDA",
                dimension: "sales_channel",
                icon: Store,
              },
              {
                key: "products" as const,
                title: "Produtos em destaque",
                caption: "RANKING POR VENDAS",
                dimension: "product_title",
                icon: Package,
              },
            ].map(({ key, title, caption, dimension, icon: Icon }) => {
              const section = data[key];
              return (
                <section className="admin-panel analytics-panel" key={key}>
                  <header className="analytics-panel-heading">
                    <div>
                      <span className="analytics-eyebrow">{caption}</span>
                      <h2>{title}</h2>
                      <p>Ordenados pelo valor de vendas no período.</p>
                    </div>
                    <span className="analytics-panel-icon">
                      <Icon size={20} />
                    </span>
                  </header>
                  {section.table?.rows.length ? (
                    <RankedBars
                      key={data.generatedAt}
                      table={section.table}
                      dimension={dimension}
                      money={money}
                    />
                  ) : (
                    <ChartEmpty
                      text={section.error || "Nenhum resultado no período."}
                    />
                  )}
                </section>
              );
            })}
          </div>
          <section className="admin-panel analytics-panel">
            <header className="analytics-panel-heading">
              <div>
                <span className="analytics-eyebrow">JORNADA DE COMPRA</span>
                <h2>Da visita à compra</h2>
                <p>Sessões e etapas de compra da loja online.</p>
              </div>
              <span className="analytics-panel-icon">
                <Globe size={20} />
              </span>
            </header>
            {data.sessions.table ? (
              <>
                <SessionJourney table={data.sessions.table} />
                <p className="analytics-session-note">
                  {num(value(data.sessions.table, "online_store_visitors"))}{" "}
                  visitantes no período · Cada etapa mostra sessões, não pessoas
                  únicas.
                </p>
              </>
            ) : (
              <ChartEmpty
                text={
                  data.sessions.error ||
                  "Comportamento indisponível para este período."
                }
              />
            )}
          </section>
          <footer className="analytics-source">
            <span>
              <i /> Shopify Analytics · Dados reais da loja
            </span>
            <p>
              Consultado em{" "}
              {new Date(data.generatedAt).toLocaleString("pt-BR", {
                timeZone: data.timezone,
              })}{" "}
              · {data.timezone}. A Shopify pode levar algum tempo para processar
              os relatórios. Comparação com o período anterior de mesma duração.
            </p>
          </footer>
        </>
      )}
    </div>
  );
}
