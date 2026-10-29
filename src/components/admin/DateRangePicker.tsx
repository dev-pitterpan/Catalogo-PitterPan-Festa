"use client";
import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Check } from "lucide-react";
import {
  dateRangeSchema,
  shiftDate,
  todayDate,
  type DateRange,
} from "../../lib/admin/date-range";
const display = (day: string) =>
  day ? day.split("-").reverse().join("/") : "";
export default function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
}) {
  const id = useId(),
    root = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    today = todayDate();
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState<DateRange>(value),
    [choosingEnd, setChoosingEnd] = useState(false),
    [month, setMonth] = useState(today.slice(0, 7) + "-01");
  useEffect(() => {
    if (!open) return;
    function dismiss(e: PointerEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);
  const changeMonth = (amount: number) => {
    const d = new Date(`${month}T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + amount);
    setMonth(d.toISOString().slice(0, 10));
  };
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  const valid =
    !!draft.start && !!draft.end && dateRangeSchema.safeParse(draft).success;
  return (
    <div
      className="admin-date-range"
      ref={root}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          close();
        }
      }}
    >
      <button
        type="button"
        className={`admin-button admin-date-trigger ${value.start ? "is-active" : ""}`}
        ref={trigger}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          if (!open) {
            setDraft(value);
            setChoosingEnd(false);
            const start = value.start || shiftDate(today, -29);
            const d = new Date(`${start.slice(0, 7)}-01T12:00:00Z`);
            setMonth(d.toISOString().slice(0, 10));
          }
          setOpen(!open);
        }}
      >
        <CalendarDays size={16} />
        {value.start
          ? `${display(value.start)} — ${display(value.end)}`
          : "Escolher datas"}
      </button>
      {open && (
        <div
          className="admin-date-popover"
          id={id}
          role="dialog"
          aria-label="Selecionar intervalo de datas"
        >
          <div className="admin-date-heading">
            <strong>
              {choosingEnd
                ? "Selecione a data final"
                : "Selecione a data inicial"}
            </strong>
            <span>Até 366 dias por consulta</span>
          </div>
          <div className="admin-date-inputs">
            <label>
              Data inicial
              <input
                type="date"
                value={draft.start}
                max={today}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, start: e.target.value }))
                }
              />
            </label>
            <span>até</span>
            <label>
              Data final
              <input
                type="date"
                value={draft.end}
                min={draft.start || undefined}
                max={today}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, end: e.target.value }))
                }
              />
            </label>
          </div>
          <div className="admin-date-months">
            <button
              className="admin-date-nav admin-date-nav--previous"
              type="button"
              aria-label="Mês anterior"
              onClick={() => changeMonth(-1)}
            >
              <ChevronLeft size={17} />
            </button>
            <button
              className="admin-date-nav admin-date-nav--next"
              type="button"
              aria-label="Próximo mês"
              onClick={() => changeMonth(1)}
            >
              <ChevronRight size={17} />
            </button>
            {[0, 1].map((offset) => {
              const date = new Date(`${month}T12:00:00Z`);
              date.setUTCMonth(date.getUTCMonth() + offset);
              const first = date.toISOString().slice(0, 10);
              const startDay = (date.getUTCDay() + 6) % 7;
              const count = new Date(
                Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
              ).getUTCDate();
              return (
                <section key={offset}>
                  <h3>
                    {new Intl.DateTimeFormat("pt-BR", {
                      month: "long",
                      year: "numeric",
                      timeZone: "UTC",
                    }).format(date)}
                  </h3>
                  <div className="admin-calendar-grid">
                    {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(
                      (d) => (
                        <span key={d}>{d}</span>
                      ),
                    )}
                    {Array.from({ length: startDay }, (_, i) => (
                      <span key={`blank${i}`} />
                    ))}
                    {Array.from({ length: count }, (_, i) => {
                      const day = shiftDate(first, i),
                        edge = day === draft.start || day === draft.end,
                        inside =
                          draft.start &&
                          draft.end &&
                          day > draft.start &&
                          day < draft.end;
                      return (
                        <button
                          type="button"
                          key={day}
                          disabled={day > today}
                          className={`${edge ? "is-edge" : ""} ${inside ? "is-between" : ""} ${day === today ? "is-today" : ""}`}
                          aria-label={display(day)}
                          aria-pressed={edge || !!inside}
                          onClick={() => {
                            if (!choosingEnd || day < draft.start) {
                              setDraft({ start: day, end: "" });
                              setChoosingEnd(true);
                            } else {
                              setDraft((d) => ({ ...d, end: day }));
                              setChoosingEnd(false);
                            }
                          }}
                        >
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
          {draft.start && draft.end && !valid && (
            <p className="admin-date-error" role="alert">
              Escolha um intervalo válido de até 366 dias.
            </p>
          )}
          <footer>
            <button
              className="admin-text-link"
              type="button"
              onClick={() => {
                onChange({ start: "", end: "" });
                close();
              }}
            >
              Usar período rápido
            </button>
            <div>
              <button className="admin-button" type="button" onClick={close}>
                Cancelar
              </button>
              <button
                className="admin-button admin-button-primary"
                type="button"
                disabled={!valid}
                onClick={() => {
                  if (valid) {
                    onChange(draft);
                    close();
                  }
                }}
              >
                <Check size={14} />
                Aplicar
              </button>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}
