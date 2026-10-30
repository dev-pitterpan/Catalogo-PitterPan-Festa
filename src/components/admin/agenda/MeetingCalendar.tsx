"use client";
import OccasionChip from "./OccasionChip";
import { occasionTheme } from "../../../lib/agenda/occasion-theme";
import type { Occasion } from "../../../lib/agenda/occasions";
import OccasionEditor, { occasionLabels } from "./OccasionEditor";
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
  dates,
  suppliers,
  save,
  busy,
}: {
  month: string;
  onMonth: (m: string) => void;
  appointments: Appointment[];
  dates: Occasion[];
  suppliers: Supplier[];
  save: Save;
  busy: boolean;
}) {
  const today = todayDate();
  const [day, setDay] = useState(
    month === today.slice(0, 7) ? today : `${month}-01`,
  );
  const [editor, setEditor] = useState<Appointment | "new" | null>(null);
  const [dateEditor, setDateEditor] = useState<Occasion | "new" | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const visibleDates = dates.filter((date) => showHidden || !date.hidden);
  const dayDates = visibleDates.filter((date) => date.event_date === day);
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
              <CalendarDays size={20} /> Agenda e datas importantes
            </h2>
          </div>
          <button
            className="admin-button"
            onClick={() => {
              setDateEditor(null);
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
                setDateEditor(null);
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
                setDateEditor(null);
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
              setDateEditor(null);
            }}
          >
            Hoje
          </button>
          <span>Clique no dia para agendar · horário de Brasília</span>
        </div>
        <div className="agenda-calendar-legend">
          <span>
            <i className="holiday" /> Feriados
          </span>
          <span>
            <i className="commercial" /> Datas comerciais
          </span>
          <span>
            <i className="observance" /> Comemorativas e referências
          </span>
          <button
            type="button"
            className="admin-text-link"
            onClick={() => {
              setEditor(null);
              setDateEditor("new");
            }}
          >
            + Adicionar data
          </button>
          <label className="agenda-checkbox">
            <input
              type="checkbox"
              checked={showHidden}
              onChange={(event) => setShowHidden(event.target.checked)}
            />{" "}
            Ver ocultas
          </label>
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
                      setDateEditor(null);
                      setEditor("new");
                    }}
                  >
                    {Number(date.slice(-2))}
                    <Plus size={12} />
                  </button>
                  {visibleDates
                    .filter((item) => item.event_date === date)
                    .slice(0, 2)
                    .map((item) => (
                      <OccasionChip
                        key={item.id}
                        item={item}
                        onEdit={() => {
                          setDay(date);
                          setEditor(null);
                          setDateEditor(item);
                        }}
                      />
                    ))}
                  {rows.slice(0, 2).map((a) => (
                    <button
                      key={a.id}
                      className={`agenda-event ${a.status}`}
                      onClick={() => {
                        setDay(date);
                        setDateEditor(null);
                        setEditor(a);
                      }}
                      title={a.title}
                    >
                      <span>{localTime(a.starts_at)}</span>
                      {a.title}
                    </button>
                  ))}
                  {(rows.length > 2 ||
                    visibleDates.filter((item) => item.event_date === date)
                      .length > 2) && (
                    <button
                      className="agenda-more"
                      onClick={() => {
                        setDay(date);
                        setEditor(null);
                        setDateEditor(null);
                      }}
                    >
                      Ver informações do dia
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
              {dayEvents.length} compromissos · {dayDates.length} datas
            </span>
          </header>
          {!dayEvents.length && !dayDates.length && (
            <div className="agenda-empty">
              Dia livre para novas conversas.
              <button
                className="admin-text-link"
                onClick={() => {
                  setDateEditor(null);
                  setEditor("new");
                }}
              >
                Agendar neste dia →
              </button>
            </div>
          )}
          {dayDates.map((item) => (
            <div className="agenda-date-detail" key={item.id}>
              <span className={`agenda-occasion-label ${item.kind}`}>
                {occasionLabels[item.kind]}
                {item.revision > 0 ? " · Planejamento personalizado" : ""}
              </span>
              <button
                type="button"
                className="agenda-date-title"
                onClick={() => {
                  setEditor(null);
                  setDateEditor(item);
                }}
              >
                <span className="agenda-date-character" aria-hidden="true">
                  {occasionTheme(item).symbol}
                </span>{" "}
                {item.title}
              </button>
              <p>
                {item.notes ||
                  "Adicione informações e próximos passos para esta data."}
              </p>
              <button
                type="button"
                className="admin-text-link"
                onClick={() => {
                  setEditor(null);
                  setDateEditor(item);
                }}
              >
                Editar planejamento
              </button>
            </div>
          ))}
          {dayEvents.map((a) => (
            <div className="agenda-day-row" key={a.id}>
              <button
                onClick={() => {
                  setDateEditor(null);
                  setEditor(a);
                }}
              >
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
                  href={`/gestor/reunioes/${a.id}/`}
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
        {dateEditor && (
          <OccasionEditor
            key={
              dateEditor === "new"
                ? `new-date-${day}`
                : `${dateEditor.id}-${dateEditor.revision}`
            }
            occasion={dateEditor === "new" ? undefined : dateEditor}
            day={day}
            save={save}
            busy={busy}
            onClose={() => setDateEditor(null)}
          />
        )}
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
