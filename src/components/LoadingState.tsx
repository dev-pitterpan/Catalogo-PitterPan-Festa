"use client";

import { useEffect, useId, useState, type CSSProperties } from "react";

const logo = "/assets/images/brand/pitter-pan-logo.svg";
const assemblyOrder = [5, 6, 9, 10, 1, 2, 4, 7, 8, 11, 13, 14, 0, 3, 12, 15];
// Shared, symmetric edges make neighboring tabs fit with no missing image areas.
function edge(
  x: number,
  y: number,
  dx: number,
  dy: number,
  curved: boolean,
  sign: number,
) {
  if (!curved) return `L${x + dx} ${y + dy}`;
  const nx = (dy / 40) * 9 * sign;
  const ny = (-dx / 40) * 9 * sign;
  return `L${x + dx * 0.34} ${y + dy * 0.34}C${x + dx * 0.15 + nx} ${y + dy * 0.15 + ny} ${x + dx * 0.85 + nx} ${y + dy * 0.85 + ny} ${x + dx * 0.66} ${y + dy * 0.66}L${x + dx} ${y + dy}`;
}
const pieces = Array.from({ length: 16 }, (_, index) => {
  const row = Math.floor(index / 4),
    column = index % 4;
  const x = column * 40,
    y = row * 40;
  const sign = (row + column) % 2 ? 1 : -1;
  const path = `M${x} ${y}${edge(x, y, 40, 0, row > 0, sign)}${edge(x + 40, y, 0, 40, column < 3, sign)}${edge(x + 40, y + 40, -40, 0, row < 3, sign)}${edge(x, y + 40, 0, -40, column > 0, sign)}Z`;
  return {
    name: `piece-${index}`,
    path,
    style: {
      "--piece-x": `${(column - 1.5) * 18}px`,
      "--piece-y": `${(row - 1.5) * 18}px`,
      "--piece-angle": `${sign * (5 + (index % 4))}deg`,
      "--piece-delay": `${assemblyOrder.indexOf(index) * 0.04}s`,
      animationDelay: `${assemblyOrder.indexOf(index) * 0.14}s`,
    } as CSSProperties,
  };
});

export default function Loading({
  ready = false,
  onComplete,
}: {
  ready?: boolean;
  onComplete?: () => void;
}) {
  const id = useId().replaceAll(":", "");
  const [finishing, setFinishing] = useState(false);
  useEffect(() => {
    if (!ready) return;
    const frame = requestAnimationFrame(() => setFinishing(true));
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = setTimeout(() => onComplete?.(), reduced ? 0 : 1500);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [ready, onComplete]);
  return (
    <main
      className={`catalog-loader${finishing ? " catalog-loader--ready" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="catalog-loader__art" aria-hidden="true">
        <span className="catalog-loader__ripple catalog-loader__ripple--one" />
        <span className="catalog-loader__ripple catalog-loader__ripple--two" />
        <span className="catalog-loader__orbit" />
        <svg
          className="catalog-loader__puzzle"
          viewBox="0 0 160 160"
          focusable="false"
        >
          <defs>
            {pieces.map((piece) => (
              <clipPath id={`${id}-${piece.name}`} key={piece.name}>
                <path d={piece.path} />
              </clipPath>
            ))}
          </defs>
          {pieces.map((piece) => (
            <g
              key={piece.name}
              className="catalog-loader__piece"
              style={piece.style}
            >
              <image
                href={logo}
                width="160"
                height="160"
                clipPath={`url(#${id}-${piece.name})`}
              />
            </g>
          ))}
        </svg>
      </div>
      <p className="catalog-loader__brand">Pitter Pan Festas</p>
      <h1 className="catalog-loader__title">
        Montando seu catálogo<span aria-hidden="true">…</span>
      </h1>
      <p className="catalog-loader__message">
        Estamos organizando os produtos para você.
      </p>
    </main>
  );
}
