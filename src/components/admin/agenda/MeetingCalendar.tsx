"use client";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  Video,
} from "lucide-react";
import {
  monthDays,
  monthShift,
  localTime,
  overlapsDay,
} from "../../../lib/agenda/calendar";
import { todayDate } from "../../../lib/admin/date-range";
import type { Appointment, Supplier } from "../../../lib/agenda/types";
import AppointmentEditor from "./AppointmentEditor";
import type { Save } from "./shared";
export default function MeetingCalendar({
  month,
  onMonth,
  appointments,
  suppliers,
  save,
  busy,
}: {
  month: string;
  onMonth: (m: string) => void;
  appointments: Appointment[];
  suppliers: Supplier[];
  save: Save;
  busy: boolean;
}) {
  const today = todayDate();
  const [day, setDay] = useState(
    month === today.slice(0, 7) ? today : `${month}-01`,
  );
  const [editor, setEditor] = useState<Appointment | "new" | null>(null);
  const days = monthDays(month);
  const events = appointments.filter((a) => a.status !== "cancelled");
  const dayEvents = appointments.filter((a) =>
    overlapsDay(a.starts_at, a.ends_at, day),
  );
  return (
    <>
      <section className="admin-panel agenda-calendar-panel">
        <header>
          <div>
            <span className="admin-eyebrow">
              ORGANIZE AS PRÓXIMAS CONVERSAS
            </span>
            <h2>
              <CalendarDays size={20} /> Agenda de fornecedores
            </h2>
          </div>
          <button
            className="admin-button"
            onClick={() => {
              setEditor("new");
              if (!day.startsWith(month)) setDay(`${month}-01`);
            }}
          >
            <Plus size={16} /> Agendar
          </button>
        </header>
        <div className="agenda-calendar-toolbar">
          <div>
            <button
              aria-label="Mês anterior"
              className="agenda-icon-button"
              onClick={() => {
                onMonth(monthShift(month, -1));
                setEditor(null);
              }}
            >
              <ChevronLeft size={19} />
            </button>
            <h3>
              {new Intl.DateTimeFormat("pt-BR", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              }).format(new Date(`${month}-01T12:00:00Z`))}
            </h3>
            <button
              aria-label="Próximo mês"
              className="agenda-icon-button"
              onClick={() => {
                onMonth(monthShift(month, 1));
                setEditor(null);
              }}
            >
              <ChevronRight size={19} />
            </button>
          </div>
          <button
            className="admin-text-link"
            onClick={() => {
              onMonth(today.slice(0, 7));
              setDay(today);
              setEditor(null);
            }}
          >
            Hoje
          </button>
          <span>Clique no dia para agendar · horário de Brasília</span>
        </div>
        <div className="agenda-calendar-scroll">
          <div className="agenda-weekdays">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="agenda-month-grid">
            {days.map((date) => {
              const rows = events.filter((a) =>
                overlapsDay(a.starts_at, a.ends_at, date),
              );
              return (
                <div
                  key={date}
                  className={`agenda-day ${date.startsWith(month) ? "" : "is-other"} ${day === date ? "is-selected" : ""}`}
                >
                  <button
                    className={`agenda-day-number ${date === today ? "is-today" : ""}`}
                    aria-label={`Agendar em ${date.split("-").reverse().join("/")}. ${rows.length} compromissos.`}
                    onClick={() => {
                      setDay(date);
                      setEditor("new");
                    }}
                  >
                    {Number(date.slice(-2))}
                    <Plus size={12} />
                  </button>
                  {rows.slice(0, 2).map((a) => (
                    <button
                      key={a.id}
                      className={`agenda-event ${a.status}`}
                      onClick={() => {
                        setDay(date);
                        setEditor(a);
                      }}
                      title={a.title}
                    >
                      <span>{localTime(a.starts_at)}</span>
                      {a.title}
                    </button>
                  ))}
                  {rows.length > 2 && (
                    <button
                      className="agenda-more"
                      onClick={() => {
                        setDay(date);
                        setEditor(null);
                      }}
                    >
                      +{rows.length - 2} compromissos
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <div className="agenda-detail-layout">
        <section className="admin-panel">
          <header>
            <h2>{day.split("-").reverse().join("/")}</h2>
            <span className="admin-subtle">
              {dayEvents.length} compromissos
            </span>
          </header>
          {!dayEvents.length && (
            <div className="agenda-empty">
              Dia livre para novas conversas.
              <button
                className="admin-text-link"
                onClick={() => setEditor("new")}
              >
                Agendar neste dia →
              </button>
            </div>
          )}
          {dayEvents.map((a) => (
            <div className="agenda-day-row" key={a.id}>
              <button onClick={() => setEditor(a)}>
                <strong>
                  {localTime(a.starts_at)} – {localTime(a.ends_at)}
                </strong>
                <span>{a.title}</span>
                <small>
                  {suppliers.find((s) => s.id === a.supplier_id)?.name ||
                    "Sem fornecedor"}{" "}
                  ·{" "}
                  {a.status === "scheduled"
                    ? "Agendado"
                    : a.status === "completed"
                      ? "Concluído"
                      : "Cancelado"}
                </small>
              </button>
              {a.video_url && (
                <a
                  className="agenda-icon-button"
                  href={a.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Abrir reunião: ${a.title}`}
                >
                  <Video size={18} />
                </a>
              )}
            </div>
          ))}
        </section>
        {editor && (
          <AppointmentEditor
            key={
              editor === "new"
                ? `new-${day}`
                : `${editor.id}-${editor.revision}`
            }
            appointment={editor === "new" ? undefined : editor}
            day={day}
            suppliers={suppliers}
            save={save}
            busy={busy}
            onClose={() => setEditor(null)}
          />
        )}
      </div>
    </>
  );
}
