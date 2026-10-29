"use client";
import { useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import AdminSelect from "./AdminSelect";
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
    void fetch(`/api/admin/analytics/?days=${days}`, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(55000)]),
      cache: "no-store",
    })
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
  }, [days, revision]);
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
  const trend = data?.trend.table?.rows || [];
  const points = trend.map((row) => numeric(row.total_sales));
  const low = Math.min(0, ...points.filter((p): p is number => p !== null));
  const high = Math.max(0, ...points.filter((p): p is number => p !== null));
  const span = high - low || 1;
  const xy = points.map((p, i) =>
    p === null
      ? null
      : [
          40 + (i * 620) / Math.max(1, points.length - 1),
          220 - ((p - low) * 180) / span,
        ],
  );
  const paths: string[] = [];
  let segment = "";
  for (const p of xy) {
    if (p) segment += `${segment ? "L" : "M"}${p[0]},${p[1]}`;
    else if (segment) {
      paths.push(segment);
      segment = "";
    }
  }
  if (segment) paths.push(segment);
  const sessionCount = value(data?.sessions.table, "sessions"),
    completed = value(data?.sessions.table, "sessions_that_completed_checkout");
  return (
    <>
      <div className="insights-filters">
        <AdminSelect
          label="Período das análises"
          value={days}
          onValueChange={setDays}
          options={[
            { value: "1", label: "Hoje" },
            { value: "7", label: "Últimos 7 dias" },
            { value: "30", label: "Últimos 30 dias" },
            { value: "60", label: "Últimos 60 dias" },
          ]}
        />
        <button
          className="admin-button"
          onClick={() => setRevision((n) => n + 1)}
          disabled={busy}
        >
          <RefreshCw size={16} />
          Atualizar
        </button>
        <button
          className="admin-button"
          onClick={download}
          disabled={!data || busy}
        >
          <Download size={16} />
          Exportar relatório
        </button>
      </div>
      {busy && (
        <div className="admin-panel">
          <PitterSpinner label="Consultando Shopify Analytics…" />
        </div>
      )}
      {error && (
        <div className="admin-data-notice" role="alert">
          <div>
            <strong>As análises ainda não puderam ser consultadas</strong>
            <p>{error}</p>
            <a className="admin-text-link" href="/gestor/vendas/">
              Ver pedidos já importados
            </a>
          </div>
        </div>
      )}
      {data && (
        <>
          <p className="sales-definition">
            Fonte: Shopify Analytics · {data.window.start} a {data.window.end} ·
            Fuso {data.timezone}. Consultado em{" "}
            {new Date(data.generatedAt).toLocaleString("pt-BR")}. Os relatórios
            podem ter atraso de processamento na Shopify. A comparação usa o
            período anterior de mesma duração.
          </p>
          <section
            className="admin-stats"
            aria-label="Indicadores reais de vendas"
          >
            {[
              "gross_sales",
              "total_sales",
              "orders",
              "average_order_value",
            ].map((key) => {
              const current = value(data.totals, key),
                previous = value(data.previous.table, key);
              return (
                <div className="admin-stat admin-stat--blue" key={key}>
                  <span>{names[key]}</span>
                  <strong>
                    {key === "orders" ? num(current) : money(current)}
                  </strong>
                  <small>
                    {current !== null && previous !== null && previous !== 0
                      ? `${num(((current - previous) / Math.abs(previous)) * 100)}% em relação ao período anterior`
                      : "Comparação indisponível ou base anterior igual a zero"}
                  </small>
                </div>
              );
            })}
          </section>
          <div className="insights-map-grid">
            <section className="admin-panel">
              <header>
                <h2>Total de vendas ao longo do tempo</h2>
              </header>
              {trend.length ? (
                <>
                  <svg
                    viewBox="0 0 700 270"
                    className="analytics-trend"
                    role="img"
                    aria-label="Vendas diárias reais da Shopify"
                  >
                    <line
                      x1="40"
                      y1={220 - ((0 - low) * 180) / span}
                      x2="660"
                      y2={220 - ((0 - low) * 180) / span}
                      stroke="#dce3f2"
                    />
                    {paths.map((d, i) => (
                      <path
                        key={i}
                        d={d}
                        fill="none"
                        stroke="#405bc1"
                        strokeWidth="3"
                      />
                    ))}
                    {xy.map(
                      (p, i) =>
                        p && (
                          <circle
                            key={i}
                            cx={p[0]}
                            cy={p[1]}
                            r="3"
                            fill="#405bc1"
                          >
                            <title>
                              {String(trend[i].day)}: {money(points[i])}
                            </title>
                          </circle>
                        ),
                    )}
                    <text x="40" y="255">
                      {String(trend[0]?.day || "")}
                    </text>
                    <text x="660" y="255" textAnchor="end">
                      {String(trend.at(-1)?.day || "")}
                    </text>
                    <text x="40" y="25">
                      {money(high)}
                    </text>
                  </svg>
                  <details>
                    <summary>Conferir os valores por dia</summary>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Vendas</th>
                          <th>Pedidos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trend.map((row, i) => (
                          <tr key={i}>
                            <td>{String(row.day)}</td>
                            <td>{money(numeric(row.total_sales))}</td>
                            <td>{num(numeric(row.orders))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                </>
              ) : (
                <p>
                  {data.trend.error ||
                    "Nenhuma série retornada para o período."}
                </p>
              )}
            </section>
            <section className="admin-panel">
              <header>
                <h2>Discriminação das vendas</h2>
              </header>
              <dl className="analytics-breakdown">
                {Object.entries(names)
                  .filter(
                    ([key]) => !["orders", "average_order_value"].includes(key),
                  )
                  .map(([key, name]) => (
                    <div key={key}>
                      <dt>{name}</dt>
                      <dd>{money(value(data.totals, key))}</dd>
                    </div>
                  ))}
              </dl>
            </section>
          </div>
          <div className="insights-map-grid">
            {[
              ["channels", "Vendas por canal", "sales_channel"],
              ["products", "Vendas por produto", "product_title"],
            ].map(([key, title, dimension]) => {
              const section = data[key as "channels" | "products"];
              return (
                <section className="admin-panel" key={key}>
                  <header>
                    <h2>{title}</h2>
                  </header>
                  {section.table?.rows.length ? (
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>
                            {dimension === "sales_channel"
                              ? "Canal"
                              : "Produto"}
                          </th>
                          <th>Vendas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.table.rows.map((r, i) => (
                          <tr key={i}>
                            <td>{String(r[dimension] ?? "Não informado")}</td>
                            <td>{money(numeric(r.total_sales))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p>{section.error || "Nenhum resultado no período."}</p>
                  )}
                </section>
              );
            })}
          </div>
          <section className="admin-panel">
            <header>
              <h2>Comportamento da loja online</h2>
            </header>
            {data.sessions.table ? (
              <div className="admin-mini-stats">
                {[
                  ["Sessões", num(sessionCount)],
                  [
                    "Visitantes",
                    num(value(data.sessions.table, "online_store_visitors")),
                  ],
                  ["Sessões com compra", num(completed)],
                  [
                    "Conversão de sessões",
                    sessionCount && completed !== null
                      ? `${num((completed / sessionCount) * 100)}%`
                      : "—",
                  ],
                ].map(([label, v]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{v}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p>{data.sessions.error}</p>
            )}
          </section>
        </>
      )}
    </>
  );
}
