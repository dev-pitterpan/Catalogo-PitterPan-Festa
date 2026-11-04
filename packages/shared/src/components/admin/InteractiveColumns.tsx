"use client";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, MoveUpRight } from "lucide-react";
import type { AnalyticsTable } from "../../server/sales/analytics";
import type { ReportColumn } from "../../lib/admin/shopify-reports";
import { numberValue, shortDate } from "./AnalyticsCharts";
export default function InteractiveColumns({
  table,
  metric,
  dimensions,
  series,
  format,
}: {
  table: AnalyticsTable;
  metric: ReportColumn;
  dimensions?: ReportColumn[];
  series?: boolean;
  format: (value: unknown) => string;
}) {
  const [page, setPage] = useState(0),
    [active, setActive] = useState<number | null>(null);
  useEffect(() => {
    setPage(0);
    setActive(null);
  }, [metric.key, table]);
  const rows = table.rows.slice(page * 10, page * 10 + 10),
    label = (row: AnalyticsTable["rows"][number]) =>
      series
        ? shortDate(row.day)
        : (dimensions || [])
            .map((d) => String(row[d.key] ?? "Não informado"))
            .join(" · ");
  const values = rows.map((r) => numberValue(r[metric.key])),
    max = Math.max(0, ...values.filter((v): v is number => v !== null)),
    min = Math.min(0, ...values.filter((v): v is number => v !== null));
  const extent = max - min || 1,
    baseline = min >= 0 ? 100 : max === 0 ? 10 : (100 * max) / extent,
    scale = max === 0 && min < 0 ? 90 / extent : 100 / extent;
  const current = active === null ? null : rows[active];
  return (
    <div className="pitter-depth-chart">
      <div className="pitter-depth-readout" aria-live="polite">
        <span>
          <i />
          {metric.label}
        </span>
        <strong>
          {current ? format(current[metric.key]) : "Explore as colunas"}
        </strong>
        <small>
          {current
            ? label(current)
            : "Passe o mouse, toque ou use Tab para ver cada resultado."}
        </small>
      </div>
      {!values.some((v) => v !== null) ? (
        <p className="analytics-empty">Indicador indisponível neste período.</p>
      ) : (
        <div className="pitter-depth-scroll">
          <div className="pitter-depth-canvas">
            <div className="pitter-depth-axis" aria-hidden="true">
              <span>{format(max)}</span>
              <span style={{ top: `${baseline}%` }}>0</span>
              {min < 0 && (
                <span className="pitter-depth-min">{format(min)}</span>
              )}
            </div>
            <div className="pitter-depth-stage">
              <div className="pitter-depth-grid" aria-hidden="true" />
              <div
                className="pitter-depth-baseline"
                style={{ top: `${baseline}%` }}
                aria-hidden="true"
              />
              {rows.map((row, i) => {
                const n = values[i],
                  height = Math.abs(n ?? 0) * scale;
                return (
                  <button
                    key={i}
                    className={`pitter-depth-column ${active === i ? "is-active" : ""} ${n === null ? "is-missing" : n === 0 ? "is-zero" : ""}`}
                    onPointerEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onClick={() => setActive(i)}
                    aria-label={`${label(row)}: ${format(n)}`}
                  >
                    <span
                      className={`pitter-depth-body pitter-depth-tone-${i % 4}`}
                      style={{
                        height: `${height}%`,
                        ...(n !== null && n < 0
                          ? { top: `${baseline}%` }
                          : { bottom: `${100 - baseline}%` }),
                      }}
                      aria-hidden="true"
                    />
                    <span className="pitter-depth-label">{label(row)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <div className="pitter-depth-pagination">
        <span>
          <MoveUpRight size={13} /> {series ? "Dias" : "Grupos"} {page * 10 + 1}
          –{Math.min(page * 10 + 10, table.rows.length)} de {table.rows.length}
        </span>
        <div>
          <button
            className="admin-button"
            disabled={page === 0}
            onClick={() => {
              setPage((n) => n - 1);
              setActive(null);
            }}
            aria-label="Colunas anteriores"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            className="admin-button"
            disabled={(page + 1) * 10 >= table.rows.length}
            onClick={() => {
              setPage((n) => n + 1);
              setActive(null);
            }}
            aria-label="Próximas colunas"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
