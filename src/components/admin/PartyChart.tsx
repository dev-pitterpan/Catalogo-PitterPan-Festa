"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Pause, Play, RotateCcw, Sparkles } from "lucide-react";

type Category = { name: string; count: number };
const colors = [
  "#354ba7",
  "#efbd37",
  "#e65b69",
  "#608aca",
  "#9b79ca",
  "#48a695",
];
const number = (n: number) => new Intl.NumberFormat("pt-BR").format(n);

/** Decorative vector puppet: no canvas, external assets or animation runtime. */
export function PartyHelper() {
  return (
    <svg
      className="party-helper"
      viewBox="0 0 100 112"
      fill="none"
      aria-hidden="true"
    >
      <ellipse cx="49" cy="105" rx="26" ry="5" fill="#253a78" opacity=".12" />
      <g className="party-helper-body">
        <path d="M37 74L32 99H44L49 79L55 99H68L59 73" fill="#293d8c" />
        <path
          d="M31 97H44V104H27Q25 99 31 97M56 97H68L74 103H56Z"
          fill="#172653"
        />
        <path d="M33 49Q48 42 62 50L65 78Q49 84 31 76Z" fill="#405bc1" />
        <path d="M42 48L49 62L57 48" fill="#FFD51A" />
        <path
          d="M34 53L24 67L9 61"
          stroke="#eab58c"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M59 54L48 68L22 65"
          stroke="#f4c5a0"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <circle cx="48" cy="30" r="18" fill="#f4c5a0" />
        <path
          d="M31 27Q28 8 48 9Q69 10 66 28Q61 18 57 19Q46 28 31 27"
          fill="#24356c"
        />
        <path d="M28 20L47 0L66 20Z" fill="#FFD51A" />
        <path
          d="M37 13L44 16M49 5L54 9"
          stroke="#F21F26"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="42" cy="31" r="1.7" fill="#27376c" />
        <circle cx="55" cy="31" r="1.7" fill="#27376c" />
        <path
          d="M44 39Q49 43 54 38"
          stroke="#b46e59"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

export default function PartyChart({ categories }: { categories: Category[] }) {
  const [sort, setSort] = useState("largest");
  const [paused, setPaused] = useState(false);
  const [scene, setScene] = useState(0);
  const [running, setRunning] = useState(true);
  const signature = JSON.stringify(categories);
  const previous = useRef(signature);
  // Only animate on arrival, explicit replay, sorting or actual data changes.
  useEffect(() => {
    if (previous.current !== signature) {
      previous.current = signature;
      setScene((n) => n + 1);
      setRunning(true);
    }
  }, [signature]);
  useEffect(() => {
    if (!running || paused) return;
    const timer = window.setTimeout(() => setRunning(false), 2800);
    return () => window.clearTimeout(timer);
  }, [scene, running, paused]);
  const rows = [...categories].sort((a, b) =>
    sort === "name" ? a.name.localeCompare(b.name, "pt-BR") : b.count - a.count,
  );
  const max = Math.max(1, ...rows.map((c) => c.count));
  const replay = () => {
    setScene((n) => n + 1);
    setRunning(true);
  };
  return (
    <div
      className={`party-chart${paused ? " is-paused" : ""}${running ? " is-running" : ""}`}
    >
      <div className="party-chart-toolbar">
        <label>
          Organizar por{" "}
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              replay();
            }}
          >
            <option value="largest">Maior quantidade</option>
            <option value="name">Nome da categoria</option>
          </select>
        </label>
        <div>
          <button
            type="button"
            onClick={replay}
            aria-label="Repetir animação do gráfico"
            title="Repetir animação"
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            onClick={() => setPaused((v) => !v)}
            aria-pressed={paused}
            aria-label={
              paused
                ? "Retomar animações do gráfico"
                : "Pausar animações do gráfico"
            }
            title={paused ? "Retomar" : "Pausar"}
          >
            {paused ? <Play size={16} /> : <Pause size={16} />}
          </button>
        </div>
      </div>
      {rows.length ? (
        <div
          key={scene}
          className="party-chart-rows"
          role="list"
          aria-label="Quantidade de variantes por categoria"
        >
          {rows.map((c, i) => (
            <div
              className="party-chart-row"
              role="listitem"
              key={c.name}
              style={
                {
                  "--bar-size": `${(c.count / max) * 100}%`,
                  "--bar-color": colors[i % colors.length],
                  "--bar-delay": `${Math.min(i, 5) * 70}ms`,
                } as CSSProperties
              }
            >
              <div className="party-chart-label">
                <span>{c.name}</span>
                <strong>{number(c.count)}</strong>
              </div>
              <div className="party-chart-track">
                <div className="party-chart-bar" />
                {i === 0 && c.count > 0 && (
                  <div className="party-chart-runner">
                    <span className="party-chart-rope" />
                    <PartyHelper />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="party-chart-empty">
          <PartyHelper />
          <strong>Preparando o palco para seus produtos</strong>
          <p>As categorias aparecem após a primeira importação publicada.</p>
        </div>
      )}
      <p className="party-chart-caption">
        <Sparkles size={14} />
        Cada categoria faz parte da festa. Quantidades em variantes.
      </p>
    </div>
  );
}
