"use client";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Occasion } from "../../../lib/agenda/occasions";
import { occasionTheme } from "../../../lib/agenda/occasion-theme";
import { occasionLabels } from "./OccasionEditor";
export default function OccasionChip({
  item,
  onEdit,
}: {
  item: Occasion;
  onEdit: () => void;
}) {
  const theme = occasionTheme(item),
    id = useId();
  const ref = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  function show() {
    if (!ref.current) return;
    const box = ref.current.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 24);
    setPosition({
      left: Math.max(12, Math.min(box.left, window.innerWidth - width - 12)),
      top:
        box.bottom + 10 + 240 > window.innerHeight
          ? Math.max(12, box.top - 250)
          : box.bottom + 10,
    });
  }
  useEffect(() => {
    if (!position) return;
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setPosition(null);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPosition(null);
    };
    const scroll = () => setPosition(null);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", scroll);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", scroll);
    };
  }, [position]);
  return (
    <>
      <button
        ref={ref}
        type="button"
        className={`agenda-occasion ${item.kind} ${item.hidden ? "is-hidden" : ""}`}
        aria-describedby={position ? id : undefined}
        aria-label={`${item.title}. ${occasionLabels[item.kind]}. Ver detalhes e editar.`}
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") show();
        }}
        onPointerLeave={(event) => {
          if (event.pointerType !== "touch") setPosition(null);
        }}
        onFocus={(event) => {
          if (event.currentTarget.matches(":focus-visible")) show();
        }}
        onBlur={() => setPosition(null)}
        onClick={(event) => {
          if (
            event.detail > 0 &&
            window.matchMedia("(hover: none)").matches &&
            !position
          ) {
            show();
            return;
          }
          setPosition(null);
          onEdit();
        }}
      >
        <span className="agenda-occasion-character" aria-hidden="true">
          {theme.symbol}
        </span>
        <span className="agenda-occasion-name">{item.title}</span>
      </button>
      {position &&
        createPortal(
          <div
            role="tooltip"
            id={id}
            className="agenda-occasion-tooltip"
            style={position}
          >
            <div className="agenda-occasion-tooltip-heading">
              <span aria-hidden="true">{theme.symbol}</span>
              <strong>{item.title}</strong>
            </div>
            <span>
              {new Date(`${item.event_date}T12:00:00-03:00`).toLocaleDateString(
                "pt-BR",
                { day: "numeric", month: "long", year: "numeric" },
              )}{" "}
              · {occasionLabels[item.kind]}
            </span>
            {item.notes && (
              <p>
                {item.notes.slice(0, 320)}
                {item.notes.length > 320 ? "…" : ""}
              </p>
            )}
            {item.hidden && <small>Data oculta no calendário principal.</small>}
            <small>Clique para editar. No celular, toque novamente.</small>
          </div>,
          document.body,
        )}
    </>
  );
}
