"use client";
import { useState, useEffect, useRef } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import AdminSelect from "../AdminSelect";
import { monthDays, monthShift } from "../../../lib/agenda/calendar";
export function AgendaDateField({
  name,
  label,
  initial,
  disabled = false,
}: {
  name: string;
  label: string;
  initial: string;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(initial),
    [open, setOpen] = useState(false),
    [month, setMonth] = useState(initial.slice(0, 7));
  const trigger = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({
    left: 16,
    top: 80,
    maxHeight: 400,
  });
  useEffect(() => {
    if (!open) return;
    function place() {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(290, window.innerWidth - 32),
        height = Math.min(350, window.innerHeight - 32);
      const top =
        window.innerHeight - rect.bottom > height + 16
          ? rect.bottom + 6
          : Math.max(
              16,
              Math.min(rect.top - height - 6, window.innerHeight - height - 16),
            );
      setPosition({
        left: Math.max(16, Math.min(rect.left, window.innerWidth - width - 16)),
        top,
        maxHeight: window.innerHeight - top - 16,
      });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);
  return (
    <div
      className="agenda-date-field"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <label htmlFor={`${name}-date-trigger`}>{label}</label>
      <input type="hidden" name={name} value={value} />
      <button
        ref={trigger}
        id={`${name}-date-trigger`}
        type="button"
        className="agenda-date-trigger"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <CalendarDays size={16} />
        {value.split("-").reverse().join("/")}
      </button>
      {open && (
        <div
          className="agenda-date-dialog"
          style={{
            position: "fixed",
            left: position.left,
            top: position.top,
            right: "auto",
            maxHeight: position.maxHeight,
            overflowY: "auto",
          }}
          role="dialog"
          aria-label={`Escolher ${label.toLowerCase()}`}
        >
          <header>
            <button
              type="button"
              className="agenda-icon-button"
              aria-label="Mês anterior"
              onClick={() => setMonth(monthShift(month, -1))}
            >
              <ChevronLeft size={16} />
            </button>
            <strong>
              {new Intl.DateTimeFormat("pt-BR", {
                month: "short",
                year: "numeric",
                timeZone: "UTC",
              }).format(new Date(`${month}-01T12:00:00Z`))}
            </strong>
            <button
              type="button"
              className="agenda-icon-button"
              aria-label="Próximo mês"
              onClick={() => setMonth(monthShift(month, 1))}
            >
              <ChevronRight size={16} />
            </button>
          </header>
          <div className="agenda-date-grid">
            {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
            {monthDays(month).map((day) => (
              <button
                type="button"
                key={day}
                className={`${day === value ? "is-selected" : ""} ${day.startsWith(month) ? "" : "is-other"}`}
                aria-label={day.split("-").reverse().join("/")}
                aria-pressed={day === value}
                onClick={() => {
                  setValue(day);
                  setOpen(false);
                  document.getElementById(`${name}-date-trigger`)?.focus();
                }}
              >
                {Number(day.slice(-2))}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
export function AgendaTimeField({
  name,
  label,
  initial,
  disabled = false,
}: {
  name: string;
  label: string;
  initial: string;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(initial);
  const [hour, minute] = value.split(":");
  return (
    <div className="agenda-time-field">
      <span>{label}</span>
      <input type="hidden" name={name} value={value} />
      <div>
        <AdminSelect
          label={`${label}: hora`}
          value={hour}
          onValueChange={(h) => setValue(`${h}:${minute}`)}
          disabled={disabled}
          options={Array.from({ length: 24 }, (_, h) => ({
            value: String(h).padStart(2, "0"),
            label: String(h).padStart(2, "0"),
          }))}
        />
        <span>:</span>
        <AdminSelect
          label={`${label}: minutos`}
          value={minute}
          onValueChange={(m) => setValue(`${hour}:${m}`)}
          disabled={disabled}
          options={Array.from({ length: 60 }, (_, m) => ({
            value: String(m).padStart(2, "0"),
            label: String(m).padStart(2, "0"),
          }))}
        />
      </div>
    </div>
  );
}
