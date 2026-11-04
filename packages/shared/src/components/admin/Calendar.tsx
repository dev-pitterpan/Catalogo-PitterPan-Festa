"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, ArrowUpRight, Check } from "lucide-react";
import type { Campaign } from "../../server/admin/campaigns";
const labels: Record<string, string> = {
  planned: "Em planejamento",
  ready: "Pronta para campanha",
  archived: "Arquivada",
};
export default function Calendar({
  items,
  ready,
  canEdit,
}: {
  items: Campaign[];
  ready: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/campaigns/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      form.reset();
      setMessage("Campanha adicionada ao planejamento.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  async function status(id: string, value: string) {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/campaigns/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: value }),
      });
      if (!response.ok) throw new Error();
      setMessage("Planejamento atualizado.");
      router.refresh();
    } catch {
      setMessage("Não foi possível atualizar a campanha.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="admin-panel">
        <header>
          <div>
            <span className="admin-eyebrow">DA IDEIA À CELEBRAÇÃO</span>
            <h2>Agenda de campanhas</h2>
          </div>
          <CalendarDays size={22} />
        </header>
        {items.length ? (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Ocasião</th>
                  <th>Data</th>
                  <th>Situação</th>
                  <th>Catálogo</th>
                  {canEdit && <th>Planejamento</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.title}</strong>
                      <small>{item.notes}</small>
                    </td>
                    <td>
                      {new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "medium",
                        timeZone: "UTC",
                      }).format(new Date(item.event_date + "T12:00:00Z"))}
                    </td>
                    <td>
                      <span
                        className={`admin-badge ${item.status === "ready" ? "green" : "blue"}`}
                      >
                        {labels[item.status]}
                      </span>
                    </td>
                    <td>
                      {item.catalog_slug ? (
                        <Link
                          href={`/${item.catalog_slug}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Ver seleção <ArrowUpRight size={15} />
                        </Link>
                      ) : (
                        "Não vinculado"
                      )}
                    </td>
                    {canEdit && (
                      <td>
                        <select
                          aria-label={`Situação de ${item.title}`}
                          value={item.status}
                          disabled={busy}
                          onChange={(e) => status(item.id, e.target.value)}
                        >
                          <option value="planned">Em planejamento</option>
                          <option value="ready">Pronta</option>
                          <option value="archived">Arquivada</option>
                        </select>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty">
            <span>
              <CalendarDays size={26} />
            </span>
            <h3>Espaço para a próxima grande ideia</h3>
            <p>
              Cadastre suas campanhas e datas comerciais. Não adicionamos
              eventos ou resultados fictícios.
            </p>
          </div>
        )}
      </section>
      {canEdit && (
        <section className="admin-panel admin-team-create">
          <header>
            <h2>Planejar uma campanha</h2>
            <Check size={21} />
          </header>
          {!ready && (
            <p className="admin-form-info">
              Prepare o banco para salvar o calendário da equipe.
            </p>
          )}
          <form className="admin-settings-form" onSubmit={create}>
            <label>
              Ocasião ou campanha
              <input
                name="title"
                placeholder="Ex.: Halloween · coleção de máscaras"
                required
                minLength={3}
                maxLength={100}
                disabled={!ready || busy}
              />
            </label>
            <label>
              Data comercial
              <input
                name="event_date"
                type="date"
                required
                disabled={!ready || busy}
              />
            </label>
            <label>
              Identificador do catálogo (opcional)
              <input
                name="catalog_slug"
                placeholder="Ex.: halloween"
                pattern="[a-z0-9-]*"
                maxLength={200}
                disabled={!ready || busy}
              />
              <small>Use a parte final do link público do catálogo.</small>
            </label>
            <label>
              Observações
              <input
                name="notes"
                maxLength={1000}
                placeholder="Produtos, materiais ou preparação"
                disabled={!ready || busy}
              />
            </label>
            <button
              className="admin-button admin-button-primary"
              disabled={!ready || busy}
            >
              {busy ? "Salvando…" : "Adicionar campanha"}
            </button>
          </form>
        </section>
      )}
      <p role="status" className="admin-copy-status">
        {message}
      </p>
    </>
  );
}
