"use client";
import { useState, type FormEvent } from "react";
import { PartyPopper, X } from "lucide-react";
import type { Occasion } from "../../../lib/agenda/occasions";
import AdminSelect from "../AdminSelect";
import { AgendaDateField } from "./DateTimeFields";
import type { Save } from "./shared";
export const occasionLabels = {
  holiday: "Feriado",
  commercial: "Data comercial",
  observance: "Data comemorativa",
  optional: "Referência de expediente",
};
export default function OccasionEditor({
  occasion,
  day,
  save,
  busy,
  onClose,
}: {
  occasion?: Occasion;
  day: string;
  save: Save;
  busy: boolean;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<Occasion["kind"]>(
    occasion?.kind || "commercial",
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (
      await save(
        "date",
        {
          id: occasion?.id,
          title: data.title,
          event_date: data.event_date,
          notes: data.notes,
          kind,
          hidden: data.hidden === "on",
        },
        undefined,
        occasion?.revision,
      )
    )
      onClose();
  }
  return (
    <section className="admin-panel agenda-editor">
      <header>
        <h2>
          <PartyPopper size={19} /> Planejamento da data
        </h2>
        <button
          type="button"
          className="agenda-icon-button"
          onClick={onClose}
          aria-label="Fechar planejamento"
        >
          <X size={18} />
        </button>
      </header>
      {occasion?.reference_title && (
        <div className="agenda-reference-note">
          <strong>Referência: {occasion.reference_title}</strong>
          <span>{occasion.reference_date?.split("-").reverse().join("/")}</span>
          <p>
            Você edita o planejamento interno. A data de referência permanece
            registrada para consulta.
          </p>
          {occasion.source && (
            <a href={occasion.source} target="_blank" rel="noopener noreferrer">
              Consultar referência oficial ↗
            </a>
          )}
        </div>
      )}
      <form className="agenda-form" onSubmit={submit}>
        <fieldset disabled={busy}>
          <label>
            Título
            <input
              name="title"
              required
              minLength={2}
              maxLength={180}
              defaultValue={occasion?.title}
              placeholder="Ex.: campanha, feira ou aniversário da loja"
            />
          </label>
          <AgendaDateField
            name="event_date"
            label="Data do planejamento"
            initial={occasion?.event_date || day}
            disabled={busy}
          />
          <label>
            Categoria
            <AdminSelect
              label="Categoria da data"
              value={kind}
              onValueChange={(value) => setKind(value as Occasion["kind"])}
              disabled={busy}
              options={Object.entries(occasionLabels).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </label>
          <label>
            Informações, ações e observações
            <textarea
              name="notes"
              rows={6}
              maxLength={6000}
              defaultValue={occasion?.notes}
              placeholder="Produtos, fornecedores, campanha e próximos passos…"
            />
          </label>
          <label className="agenda-checkbox">
            <input
              type="checkbox"
              name="hidden"
              defaultChecked={occasion?.hidden}
            />{" "}
            Ocultar na visualização principal
          </label>
          <p className="agenda-hint">
            As informações salvas aparecem no dia do calendário. Feriados locais
            e expediente devem ser confirmados para cada loja.
          </p>
          <button className="admin-button" disabled={busy}>
            {busy ? "Salvando…" : "Salvar planejamento"}
          </button>
        </fieldset>
      </form>
    </section>
  );
}
