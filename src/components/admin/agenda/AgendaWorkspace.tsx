"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, Building2, NotebookPen, RefreshCw } from "lucide-react";
import PitterSpinner from "../PitterSpinner";
import { todayDate } from "../../../lib/admin/date-range";
import { monthDays } from "../../../lib/agenda/calendar";
import type { Workspace } from "../../../lib/agenda/types";
import type { Save } from "./shared";
import MeetingCalendar from "./MeetingCalendar";
import SupplierDirectory from "./SupplierDirectory";
import NotesWorkspace from "./NotesWorkspace";
const empty: Workspace = { suppliers: [], appointments: [], notes: [] };
export default function AgendaWorkspace() {
  const [tab, setTab] = useState("agenda"),
    [month, setMonth] = useState(todayDate().slice(0, 7));
  const [data, setData] = useState<Workspace>(empty),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const generation = useRef(0),
    saving = useRef(false);
  const load = useCallback(async () => {
    const seq = ++generation.current;
    const days = monthDays(month);
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/agenda/?${new URLSearchParams({ start: days[0], end: days[41] })}`,
        { cache: "no-store" },
      );
      const result = await response.json();
      if (!response.ok)
        throw Error(result.error || "Não foi possível carregar.");
      if (seq === generation.current) {
        setData(result);
        setError("");
      }
    } catch (error) {
      if (seq === generation.current)
        setError(error instanceof Error ? error.message : "Falha de conexão.");
    } finally {
      if (seq === generation.current) setLoading(false);
    }
  }, [month]);
  useEffect(() => {
    void load();
    return () => {
      generation.current++;
    };
  }, [load]);
  const save: Save = async (entity, value, id, revision) => {
    if (saving.current) return false;
    saving.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/agenda/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, data: value, id, revision }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Não foi possível salvar.");
      setMessage(
        entity === "import"
          ? `${result.added} fornecedores incluídos e ${result.updated} atualizados. Contatos preservados.`
          : "Informações salvas com sucesso.",
      );
      await load();
      return true;
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Falha de conexão. Tente novamente.",
      );
      return false;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  const tabs = [
    { id: "agenda", label: "Agenda", icon: CalendarDays },
    { id: "suppliers", label: "Fornecedores", icon: Building2 },
    { id: "notes", label: "Notas e tarefas", icon: NotebookPen },
  ];
  return (
    <div className="agenda-workspace">
      <div className="agenda-topline">
        <nav className="agenda-tabs" aria-label="Área de agenda e fornecedores">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              aria-current={tab === id ? "page" : undefined}
              disabled={busy}
              onClick={() => setTab(id)}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <button
          className="admin-text-link"
          disabled={loading || busy}
          onClick={() => void load()}
        >
          <RefreshCw size={15} /> Atualizar
        </button>
      </div>
      {error && (
        <div className="agenda-feedback is-error" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="agenda-feedback" role="status">
          {message}
        </div>
      )}
      {loading && (
        <div className="agenda-loading">
          <PitterSpinner label="Carregando sua agenda…" />
        </div>
      )}
      {!loading &&
        error &&
        !data.suppliers.length &&
        !data.appointments.length && (
          <p className="agenda-hint">
            Se o carregamento falhou, use Atualizar antes de cadastrar
            informações.
          </p>
        )}
      {!loading && tab === "agenda" && (
        <MeetingCalendar
          month={month}
          onMonth={setMonth}
          appointments={data.appointments}
          suppliers={data.suppliers}
          save={save}
          busy={busy}
        />
      )}{" "}
      {tab === "suppliers" && !loading && (
        <SupplierDirectory suppliers={data.suppliers} save={save} busy={busy} />
      )}{" "}
      {tab === "notes" && !loading && (
        <NotesWorkspace
          notes={data.notes}
          suppliers={data.suppliers}
          save={save}
          busy={busy}
        />
      )}
      <p className="agenda-footnote">
        Área compartilhada entre administradores, gerentes de compras e
        gestores. Os contatos são cadastrados aqui; esta área não se conecta ao
        banco do WinThor.
      </p>
    </div>
  );
}
