"use client";

import Link from "next/link";
import { useState } from "react";
import type { AdminSummary } from "../../server/admin/repository";

const number = (value: number) => value.toLocaleString("pt-BR");
export default function StockOverview({
  summary,
  low,
}: {
  summary: AdminSummary | null;
  low: number;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  if (!summary)
    return (
      <p className="admin-inline-note">
        O resumo do estoque ficará disponível após a importação.
      </p>
    );
  const segments = [
    {
      label: "Acima do estoque baixo",
      value: Math.max(
        0,
        summary.variants - summary.low - summary.out - summary.unknown,
      ),
      color: "#354ba7",
      href: "/gestor/estoque/",
    },
    {
      label: "Estoque baixo",
      value: summary.low,
      color: "#efbd37",
      href: "/gestor/estoque/?stock=low",
    },
    {
      label: "Sem estoque",
      value: summary.out,
      color: "#e65b69",
      href: "/gestor/estoque/?stock=out",
    },
    {
      label: "Não informado",
      value: summary.unknown,
      color: "#a8bacd",
      href: "/gestor/estoque/?stock=unknown",
    },
  ];
  const total = summary.variants;
  const current = selected === null ? null : segments[selected];
  let offset = 0;
  return (
    <>
      <div className="overview-stock-chart">
        <div className="overview-stock-ring">
          <svg
            viewBox="0 0 240 240"
            role="group"
            aria-label="Distribuição das variantes por situação do estoque"
          >
            <circle
              cx="120"
              cy="120"
              r="86"
              fill="none"
              stroke="#edf2f8"
              strokeWidth="28"
            />
            {segments.map((segment, index) => {
              const share = total ? (segment.value / total) * 100 : 0;
              const start = offset;
              offset += share;
              return (
                share > 0 && (
                  <circle
                    key={segment.label}
                    cx="120"
                    cy="120"
                    r="86"
                    fill="none"
                    stroke={segment.color}
                    strokeWidth={selected === index ? 34 : 28}
                    pathLength="100"
                    strokeDasharray={`${Math.max(0, share - 0.7)} ${100 - Math.max(0, share - 0.7)}`}
                    strokeDashoffset={-start}
                    transform="rotate(-90 120 120)"
                    tabIndex={0}
                    role="button"
                    aria-label={`${segment.label}: ${number(segment.value)} variantes`}
                    aria-pressed={selected === index}
                    onPointerEnter={() => setSelected(index)}
                    onFocus={() => setSelected(index)}
                    onClick={() => setSelected(index)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelected(index);
                      }
                    }}
                  />
                )
              );
            })}
          </svg>
          <div aria-live="polite">
            {current && <small>{current.label}</small>}
            <strong>{number(current?.value ?? total)}</strong>
            <span>
              {current
                ? `${total ? ((current.value / total) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : 0}% do total`
                : "variantes"}
            </span>
          </div>
        </div>
        <div className="overview-stock-legend">
          {segments.map((segment, index) => (
            <button
              type="button"
              key={segment.label}
              aria-pressed={selected === index}
              onPointerEnter={() => setSelected(index)}
              onFocus={() => setSelected(index)}
              onClick={() => setSelected(index)}
            >
              <i style={{ background: segment.color }} />
              <span>{segment.label}</span>
              <b>{number(segment.value)}</b>
            </button>
          ))}
        </div>
      </div>
      {selected !== null && (
        <button
          type="button"
          className="admin-text-link overview-stock-reset"
          onClick={() => setSelected(null)}
        >
          Ver total de variantes
        </button>
      )}
      <p className="admin-inline-note">
        Baixo: de 1 a {low} unidades por variante. Quantidades da última
        publicação do catálogo.
      </p>
      <Link
        className="admin-text-link"
        href={current?.href || "/gestor/estoque/"}
      >
        {current && selected !== 0
          ? `Conferir: ${current.label.toLowerCase()}`
          : "Explorar estoque completo"}{" "}
        →
      </Link>
    </>
  );
}
