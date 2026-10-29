"use client";
import { useEffect, useState } from "react";
import { Download, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { csvCell } from "../../lib/admin/csv";
import { reportById, type ReportColumn } from "../../lib/admin/shopify-reports";
import type { readShopifyReport } from "../../server/sales/reports";
import {
  RevenueChart,
  SessionJourney,
  numberValue,
  shortDate,
} from "./AnalyticsCharts";
import PitterSpinner from "./PitterSpinner";
import AdminSelect from "./AdminSelect";
type Data = Awaited<ReturnType<typeof readShopifyReport>>;
export function formatReportValue(
  value: unknown,
  column: ReportColumn,
  currency: string,
) {
  if (value === null || value === undefined || value === "") return "—";
  if (column.key === "day") return shortDate(value);
  if (!column.format) return String(value);
  const n = numberValue(value);
  if (n === null) return "—";
  if (column.format === "money")
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
    }).format(n);
  return (
    n.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) +
    (column.format === "percent" ? "%" : column.format === "hours" ? " h" : "")
  );
}
export default function ShopifyReportDetail({
  id,
  params,
}: {
  id: string;
  params: string;
}) {
  const report = reportById(id)!;
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [metric, setMetric] = useState(report.metrics[0].key),
    [limit, setLimit] = useState(10);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    setBusy(true);
    setLimit(10);
    void fetch(`/api/admin/analytics/?${params}&report=${id}`, {
      cache: "no-store",
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(55000)]),
    })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok)
          throw new Error(
            body.error || "Não foi possível consultar este relatório.",
          );
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
  }, [id, params]);
  const selected =
    report.metrics.find((m) => m.key === metric) || report.metrics[0];
  const columns = [
    ...(report.series
      ? [{ key: "day", label: "Data" }]
      : report.dimensions || []),
    ...report.metrics,
  ];
  const format = (v: unknown, c: ReportColumn = selected) =>
    formatReportValue(v, c, data?.currency || "BRL");
  function download() {
    if (!data) return;
    const rows: unknown[][] = [
      ["Relatório", report.title],
      ["Fonte", "Shopify Analytics"],
      ["Período", data.window.start, data.window.end],
      ["Fuso", data.timezone],
      [],
      columns.map((c) => c.label),
      ...data.table.rows.map((r) => columns.map((c) => r[c.key])),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["\ufeff" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `shopify-${id}-${data.window.start}-${data.window.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  const aggregate = data?.totals?.rows[0],
    previous = data?.previousTotals?.rows[0];
  const max = Math.max(
    1,
    ...(data?.table.rows || []).map((r) =>
      Math.abs(numberValue(r[selected.key]) || 0),
    ),
  );
  return (
    <section
      className="admin-panel analytics-panel shopify-report-detail"
      aria-busy={busy}
    >
      <header className="analytics-panel-heading">
        <div>
          <span className="analytics-eyebrow">RELATÓRIO SHOPIFY</span>
          <h2>{report.title}</h2>
          <p>{report.description}</p>
        </div>
        <button
          className="admin-button"
          onClick={download}
          disabled={!data || busy}
        >
          <Download size={15} /> Exportar
        </button>
      </header>
      {busy && (
        <div className="analytics-loading" role="status">
          <PitterSpinner label="Consultando este relatório na Shopify…" />
        </div>
      )}
      {error && (
        <p className="admin-data-notice" role="alert">
          {error} Os demais relatórios continuam disponíveis.
        </p>
      )}
      {data && (
        <>
          <div className="shopify-report-metrics">
            {report.metrics.map((m) => {
              const current = numberValue(aggregate?.[m.key]),
                before = numberValue(previous?.[m.key]);
              const change =
                current !== null && before !== null && before !== 0
                  ? ((current - before) / Math.abs(before)) * 100
                  : null;
              return (
                <button
                  type="button"
                  key={m.key}
                  className={selected.key === m.key ? "is-selected" : ""}
                  onClick={() => setMetric(m.key)}
                  aria-pressed={selected.key === m.key}
                >
                  <span>{m.label}</span>
                  <strong>{format(aggregate?.[m.key], m)}</strong>
                  <small>
                    {change === null ? (
                      "Sem comparação disponível"
                    ) : (
                      <>
                        {change < 0 ? (
                          <ArrowDownRight size={12} />
                        ) : (
                          <ArrowUpRight size={12} />
                        )}{" "}
                        {change > 0 ? "+" : ""}
                        {change.toLocaleString("pt-BR", {
                          maximumFractionDigits: 1,
                        })}
                        % vs. anterior
                      </>
                    )}
                  </small>
                </button>
              );
            })}
          </div>
          {!!data.table.rows.length ? (
            <>
              <div className="shopify-chart-toolbar">
                <span>
                  Visualizando: <strong>{selected.label}</strong>
                </span>
                <AdminSelect
                  label="Métrica do gráfico"
                  value={selected.key}
                  onValueChange={setMetric}
                  options={report.metrics.map((m) => ({
                    value: m.key,
                    label: m.label,
                  }))}
                />
              </div>
              {report.id === "conversion-funnel" ? (
                <SessionJourney table={data.table} />
              ) : report.series ? (
                <RevenueChart
                  table={data.table}
                  money={(v) => format(v)}
                  currency={data.currency}
                  showTable={false}
                  metricKey={selected.key}
                  metricLabel={selected.label}
                  axisLabel={
                    selected.format === "money"
                      ? `Valores em ${data.currency}`
                      : selected.label
                  }
                />
              ) : report.dimensions?.length ? (
                <ol className="analytics-ranking shopify-report-bars">
                  {data.table.rows.slice(0, limit).map((row, i) => {
                    const label = report
                        .dimensions!.map((d) =>
                          String(row[d.key] ?? "Não informado"),
                        )
                        .join(" · "),
                      n = numberValue(row[selected.key]);
                    return (
                      <li key={i}>
                        <span className="analytics-rank-number">{i + 1}</span>
                        <div>
                          <div className="analytics-rank-caption">
                            <span title={label}>{label}</span>
                            <strong>{format(n)}</strong>
                          </div>
                          <div
                            className="analytics-bar-track"
                            aria-hidden="true"
                          >
                            <span
                              className={
                                n !== null && n < 0 ? "is-negative" : ""
                              }
                              style={{
                                width: `${(Math.abs(n || 0) / max) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="analytics-session-note">
                  Selecione um indicador acima e confira o detalhamento na
                  tabela.
                </p>
              )}
              <details className="analytics-daily-values">
                <summary>Conferir os dados do relatório</summary>
                <div className="analytics-table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        {columns.map((c) => (
                          <th key={c.key}>{c.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.table.rows.slice(0, limit).map((r, i) => (
                        <tr key={i}>
                          {columns.map((c) => (
                            <td key={c.key}>{format(r[c.key], c)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
              {limit < data.table.rows.length && (
                <button
                  className="analytics-expand"
                  onClick={() => setLimit((n) => n + 10)}
                >
                  Carregar mais 10 resultados ·{" "}
                  {Math.min(limit, data.table.rows.length)} de{" "}
                  {data.table.rows.length}
                </button>
              )}
              {report.dimensions?.length && data.table.rows.length === 50 && (
                <p className="analytics-session-note">
                  Exibindo os 50 primeiros grupos. Os indicadores do período são
                  consultados separadamente e incluem todos os resultados.
                </p>
              )}
            </>
          ) : (
            <div className="analytics-empty">Sem dados para este período.</div>
          )}
          {report.note && <p className="shopify-report-note">{report.note}</p>}
          {report.metrics.some((m) => m.ratio) && (
            <p className="analytics-session-note">
              As taxas exibidas usam as contagens retornadas pela Shopify e as
              fórmulas dos indicadores; não são médias das taxas diárias.
            </p>
          )}
          <footer className="analytics-source">
            <span>
              <i /> Shopify Analytics · {shortDate(data.window.start)} a{" "}
              {shortDate(data.window.end)}
            </span>
            <p>
              Consultado em{" "}
              {new Date(data.generatedAt).toLocaleString("pt-BR", {
                timeZone: data.timezone,
              })}{" "}
              · {data.timezone}. Comparação:{" "}
              {shortDate(data.window.previousStart)} a{" "}
              {shortDate(data.window.previousEnd)}.
              {!data.comparisonAvailable && " Comparação indisponível."}
            </p>
          </footer>
        </>
      )}
    </section>
  );
}
