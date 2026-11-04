"use client";
import { AgendaDateField, AgendaTimeField } from "./DateTimeFields";
import { useState, type FormEvent } from "react";
import MeetingActions from "./video/MeetingActions";
import { CalendarPlus, X } from "lucide-react";
import AdminSelect from "../AdminSelect";
import { localDay, localTime } from "../../../lib/agenda/calendar";
import type { Appointment, Supplier } from "../../../lib/agenda/types";
import { SupplierPicker, type Save } from "./shared";
export default function AppointmentEditor({
  appointment,
  day,
  suppliers,
  save,
  onClose,
  busy,
}: {
  appointment?: Appointment;
  day: string;
  suppliers: Supplier[];
  save: Save;
  onClose: () => void;
  busy: boolean;
}) {
  const [videoUrl, setVideoUrl] = useState(appointment?.video_url || "");
  const [savedVideoUrl, setSavedVideoUrl] = useState(
    appointment?.video_url || "",
  );
  const [revision, setRevision] = useState(appointment?.revision);
  const [supplier, setSupplier] = useState(appointment?.supplier_id || null);
  const [status, setStatus] = useState(appointment?.status || "scheduled");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const ok = await save(
      "appointment",
      {
        title: data.title,
        supplier_id: supplier,
        starts_at: `${data.day}T${data.start}:00-03:00`,
        ends_at: `${data.end_day}T${data.end}:00-03:00`,
        status,
        location: data.location,
        video_url: data.video_url,
        description: data.description,
      },
      appointment?.id,
      revision,
    );
    if (ok) onClose();
  }
  return (
    <section className="admin-panel agenda-editor">
      <header>
        <h2>
          <CalendarPlus size={18} />{" "}
          {appointment ? "Detalhes da reunião" : "Novo compromisso"}
        </h2>
        <button
          type="button"
          className="agenda-icon-button"
          onClick={onClose}
          aria-label="Fechar detalhes"
        >
          <X size={18} />
        </button>
      </header>
      <form onSubmit={submit} className="agenda-form">
        <fieldset disabled={busy}>
          <label>
            Assunto
            <input
              name="title"
              required
              minLength={2}
              maxLength={180}
              defaultValue={appointment?.title}
              placeholder="Ex.: novidades e condições de compra"
            />
          </label>
          <SupplierPicker
            suppliers={suppliers}
            value={supplier}
            onChange={setSupplier}
          />
          <div className="agenda-field-pair">
            <AgendaDateField
              name="day"
              label="Data inicial"
              initial={appointment ? localDay(appointment.starts_at) : day}
              disabled={busy}
            />
            <AgendaTimeField
              name="start"
              label="Horário"
              initial={appointment ? localTime(appointment.starts_at) : "09:00"}
              disabled={busy}
            />
          </div>
          <div className="agenda-field-pair">
            <AgendaDateField
              name="end_day"
              label="Data final"
              initial={appointment ? localDay(appointment.ends_at) : day}
              disabled={busy}
            />
            <AgendaTimeField
              name="end"
              label="Até"
              initial={appointment ? localTime(appointment.ends_at) : "10:00"}
              disabled={busy}
            />
          </div>
          <p className="agenda-hint">
            Horário de Brasília · o responsável é quem cria o compromisso.
          </p>
          <label>
            Situação
            <AdminSelect
              label="Situação do compromisso"
              value={status}
              onValueChange={(v) => setStatus(v as Appointment["status"])}
              disabled={busy}
              options={[
                { value: "scheduled", label: "Agendado" },
                { value: "completed", label: "Concluído" },
                { value: "cancelled", label: "Cancelado" },
              ]}
            />
          </label>
          <label>
            Local
            <input
              name="location"
              defaultValue={appointment?.location}
              maxLength={250}
              placeholder="Loja, sala ou reunião online"
            />
          </label>
          <label>
            Link da videochamada
            <input
              type="url"
              name="video_url"
              value={videoUrl}
              onChange={(event) => setVideoUrl(event.target.value)}
              placeholder="https://…"
              maxLength={2000}
            />
          </label>
          <MeetingActions
            appointment={
              appointment
                ? {
                    ...appointment,
                    revision: revision!,
                    video_url: savedVideoUrl,
                  }
                : undefined
            }
            supplier={suppliers.find(
              (item) => item.id === appointment?.supplier_id,
            )}
            busy={busy}
            onCreated={(url, nextRevision) => {
              setVideoUrl(url);
              setSavedVideoUrl(url);
              setRevision(nextRevision);
            }}
          />
          <label>
            Pauta e observações
            <textarea
              name="description"
              defaultValue={appointment?.description}
              rows={4}
              maxLength={6000}
            />
          </label>
          {appointment && (
            <p className="agenda-hint">Responsável: {appointment.owner}</p>
          )}
          <button className="admin-button" disabled={busy}>
            {busy ? "Salvando…" : "Salvar compromisso"}
          </button>
        </fieldset>
      </form>
    </section>
  );
}
