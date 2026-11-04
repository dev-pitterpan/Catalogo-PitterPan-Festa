"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import PitterSpinner from "./PitterSpinner";
type Job = {
  id: string;
  status: string;
  phase: string;
  variants: number;
  records: number;
  orders: number;
  error: string | null;
  updated_at: string;
};
type Status = { job: Job | null; lastUpdated: string | null };
const phases = [
  ["export", "Preparando na Shopify"],
  ["download", "Recebendo os dados"],
  ["products", "Atualizando produtos e estoque"],
  ["orders", "Conferindo pedidos"],
  ["publish", "Publicando a atualização"],
];
const date = (s: string | null) =>
  s
    ? new Date(s).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
    : "Nenhuma atualização publicada";
export default function SyncControl() {
  const router = useRouter(),
    [data, setData] = useState<Status | null>(null),
    [error, setError] = useState(""),
    [sending, setSending] = useState(false);
  const completed = useRef("");
  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch("/api/admin/sync/", {
          cache: "no-store",
          signal,
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        if (signal?.aborted) return;
        setData(body);
        setError("");
        if (
          body.job?.status === "completed" &&
          completed.current &&
          completed.current !== body.job.id
        ) {
          completed.current = body.job.id;
          router.refresh();
        }
        if (body.job?.status !== "completed") completed.current = "pending";
      } catch (e) {
        if (!signal?.aborted)
          setError(
            e instanceof Error
              ? e.message
              : "Não foi possível consultar o andamento.",
          );
      }
    },
    [router],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  const busy = !!data?.job && ["queued", "running"].includes(data.job.status);
  useEffect(() => {
    if (!busy) return;
    const controller = new AbortController();
    const timer = setInterval(() => {
      void load(controller.signal);
    }, 5000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [busy, load]);
  async function start() {
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/admin/sync/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        signal: AbortSignal.timeout(60000),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setData(body);
      completed.current = "pending";
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Falha ao iniciar. Consulte o andamento antes de tentar novamente.",
      );
      void load();
    } finally {
      setSending(false);
    }
  }
  const index = phases.findIndex(([key]) => key === data?.job?.phase);
  return (
    <section
      className="admin-panel sync-control"
      aria-label="Sincronizar com a Shopify"
    >
      <div className="sync-control-heading">
        <span className="sync-control-icon">
          <RefreshCw size={25} />
        </span>
        <div>
          <span className="admin-eyebrow">INTEGRAÇÃO SHOPIFY</span>
          <h2>Deixe os dados em dia.</h2>
          <p>Atualize produtos, preços, estoque e pedidos com um clique.</p>
        </div>
        <button
          className="admin-button primary"
          onClick={start}
          disabled={sending || busy}
        >
          {sending || busy ? (
            <PitterSpinner label={sending ? "Iniciando…" : "Sincronizando…"} />
          ) : (
            <>
              <RefreshCw size={16} /> Sincronizar agora
            </>
          )}
        </button>
      </div>
      <div className="sync-last-update">
        <CheckCircle2 size={16} />
        <span>
          Última publicação do catálogo:{" "}
          <strong>{date(data?.lastUpdated || null)}</strong>
        </span>
      </div>
      {busy && (
        <div className="sync-progress" aria-live="polite">
          <PitterSpinner
            label={
              index >= 0
                ? phases[index][1]
                : "Aguardando o início da atualização…"
            }
          />
          <ol>
            {phases.map(([key, label], i) => (
              <li
                key={key}
                className={
                  i === index ? "is-current" : i < index ? "is-done" : ""
                }
              >
                <span>{i < index ? <CheckCircle2 size={14} /> : i + 1}</span>
                {label}
                {i === index && <ArrowRight size={14} />}
              </li>
            ))}
          </ol>
          <p>
            {(data?.job?.variants || 0) > 0 &&
              `${data!.job!.variants.toLocaleString("pt-BR")} variantes preparadas. `}
            Você pode sair desta página: a sincronização continua em segundo
            plano.
          </p>
        </div>
      )}
      {data?.job?.status === "completed" && (
        <p className="sync-success" role="status">
          <CheckCircle2 size={17} /> Sincronização concluída. Produtos, estoque
          e pedidos foram atualizados.
        </p>
      )}
      {(error || data?.job?.status === "failed") && (
        <p className="admin-data-notice" role="alert">
          <AlertCircle size={18} />
          {error || data?.job?.error}
        </p>
      )}
      <p className="admin-footnote">
        Os dados atuais continuam disponíveis durante a atualização. Esta ação
        atualiza o gestor; não altera os produtos na Shopify. As Análises
        consultam a Shopify ao abrir ou atualizar um relatório.
      </p>
    </section>
  );
}
