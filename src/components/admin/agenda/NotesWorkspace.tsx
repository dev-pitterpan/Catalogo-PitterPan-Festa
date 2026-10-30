"use client";
import { useState, type FormEvent } from "react";
import { Plus, NotebookPen, CheckSquare } from "lucide-react";
import type { Note, Supplier } from "../../../lib/agenda/types";
import { SupplierPicker, type Save } from "./shared";
function NoteEditor({
  note,
  suppliers,
  save,
  busy,
}: {
  note?: Note;
  suppliers: Supplier[];
  save: Save;
  busy: boolean;
}) {
  const [supplier, setSupplier] = useState(note?.supplier_id || null);
  const [body, setBody] = useState(note?.body || "");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await save(
      "note",
      {
        title: new FormData(e.currentTarget).get("title"),
        supplier_id: supplier,
        body,
      },
      note?.id,
      note?.revision,
    );
  }
  const lines = body.split("\n");
  return (
    <section className="admin-panel agenda-editor">
      <header>
        <h2>
          <NotebookPen size={19} /> {note ? "Editar nota" : "Nova nota"}
        </h2>
      </header>
      <form onSubmit={submit} className="agenda-form">
        <fieldset disabled={busy}>
          <label>
            Título
            <input
              name="title"
              required
              minLength={2}
              maxLength={180}
              defaultValue={note?.title}
              placeholder="Pauta, negociação ou próximos passos"
            />
          </label>
          <SupplierPicker
            value={supplier}
            suppliers={suppliers}
            onChange={setSupplier}
          />
          <label>
            Anotações
            <textarea
              className="agenda-note-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              maxLength={20000}
              placeholder={
                "# Pontos da reunião\n\nCondições, novidades e decisões…\n\n- [ ] Pedir catálogo atualizado\n- [ ] Conferir prazo de entrega"
              }
            />
          </label>
          <button
            type="button"
            className="admin-text-link"
            onClick={() =>
              setBody((v) => `${v}${v ? "\n" : ""}- [ ] Nova tarefa`)
            }
          >
            <CheckSquare size={16} /> Adicionar tarefa
          </button>
          <div className="agenda-note-preview">
            {lines.map((line, index) => {
              const task = line.match(/^- \[([ xX])\] (.*)$/);
              return task ? (
                <label key={index}>
                  <input
                    type="checkbox"
                    checked={task[1].toLowerCase() === "x"}
                    onChange={() => {
                      lines[index] =
                        `- [${task[1] === " " ? "x" : " "}] ${task[2]}`;
                      setBody(lines.join("\n"));
                    }}
                  />
                  <span>{task[2]}</span>
                </label>
              ) : line.startsWith("# ") ? (
                <h3 key={index}>{line.slice(2)}</h3>
              ) : (
                <p key={index}>{line || "\u00a0"}</p>
              );
            })}
          </div>
          <p className="agenda-hint">
            As notas são compartilhadas com gestores. Salve para registrar
            textos e tarefas.
          </p>
          <button className="admin-button" disabled={busy}>
            {busy ? "Salvando…" : "Salvar nota"}
          </button>
        </fieldset>
      </form>
    </section>
  );
}
export default function NotesWorkspace({
  notes,
  suppliers,
  save,
  busy,
}: {
  notes: Note[];
  suppliers: Supplier[];
  save: Save;
  busy: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(20);
  const note = notes.find((n) => n.id === selected);
  const filtered = notes.filter((n) =>
    `${n.title} ${n.body} ${suppliers.find((s) => s.id === n.supplier_id)?.name || ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div className="agenda-directory-layout">
      <section className="admin-panel">
        <header>
          <h2>Bloco de notas</h2>
          <button className="admin-button" onClick={() => setSelected(null)}>
            <Plus size={16} /> Nova nota
          </button>
        </header>
        <label className="agenda-search">
          <input
            aria-label="Buscar notas"
            placeholder="Buscar nas notas e tarefas"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(20);
            }}
          />
        </label>
        <div className="agenda-note-list">
          {filtered.slice(0, limit).map((n) => (
            <button
              key={n.id}
              className={n.id === selected ? "is-selected" : ""}
              onClick={() => setSelected(n.id)}
            >
              <NotebookPen size={18} />
              <span>
                <strong>{n.title}</strong>
                <small>
                  {suppliers.find((s) => s.id === n.supplier_id)?.name ||
                    "Nota geral"}
                </small>
                <p>{n.body.slice(0, 100)}</p>
              </span>
            </button>
          ))}
          {!filtered.length && (
            <p className="agenda-empty">
              Suas pautas, decisões e tarefas ficam organizadas aqui.
            </p>
          )}
          {filtered.length > limit && (
            <button
              className="admin-button"
              onClick={() => setLimit((v) => v + 20)}
            >
              Carregar mais notas
            </button>
          )}
        </div>
      </section>
      <NoteEditor
        key={note ? `${note.id}-${note.revision}` : `new-${notes.length}`}
        note={note}
        suppliers={suppliers}
        save={save}
        busy={busy}
      />
    </div>
  );
}
