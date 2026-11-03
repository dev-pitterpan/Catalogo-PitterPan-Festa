"use client";
import { useEffect, useId, useRef, useState } from "react";
import { ClipboardList, RefreshCw, X } from "lucide-react";
import {
  fulfillmentLabels,
  fulfillmentDescriptions,
} from "../../lib/admin/fulfillment";
import type { readFulfillmentDetails } from "../../server/sales/fulfillment-details";
import PitterSpinner from "./PitterSpinner";
type Data = Awaited<ReturnType<typeof readFulfillmentDetails>>;
const number = (n: number) => n.toLocaleString("pt-BR");
export default function OrderFulfillmentDetails({
  id,
  name,
  storedStatus,
}: {
  id: string;
  name: string;
  storedStatus?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    titleId = useId(),
    noteId = useId();
  const [open, setOpen] = useState(false),
    [revision, setRevision] = useState(0),
    [data, setData] = useState<Data | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setData(null);
    setError("");
    void fetch(`/api/admin/sales/fulfillment/?${new URLSearchParams({ id })}`, {
      cache: "no-store",
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(55000)]),
    })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok)
          throw new Error(body.error || "Não foi possível conferir os itens.");
        if (!controller.signal.aborted) setData(body);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Consulta indisponível.");
      });
    return () => controller.abort();
  }, [id, open, revision]);
  const close = () => dialog.current?.close();
  return (
    <>
      <button
        type="button"
        className="admin-button fulfillment-details-trigger"
        onClick={() => {
          dialog.current?.showModal();
          setOpen(true);
        }}
        aria-label={`Conferir itens de atendimento do pedido ${name}`}
      >
        <ClipboardList size={14} /> Conferir itens
      </button>
      <dialog
        ref={dialog}
        className="fulfillment-dialog"
        aria-labelledby={titleId}
        aria-describedby={noteId}
        onClose={() => setOpen(false)}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="fulfillment-dialog-heading">
          <div>
            <span className="admin-eyebrow">ATENDIMENTO DO PEDIDO</span>
            <h2 id={titleId}>{data?.name || name}</h2>
          </div>
          <button
            type="button"
            className="admin-button"
            aria-label="Fechar conferência de itens"
            onClick={close}
          >
            <X size={18} />
          </button>
        </header>
        <p id={noteId} className="fulfillment-dialog-note">
          Quantidades consultadas na Shopify. Atendimento é independente do
          pagamento e não comprova entrega ao cliente.
        </p>
        {error ? (
          <div className="admin-data-notice" role="alert">
            {error}
            <button
              className="admin-button"
              type="button"
              onClick={() => setRevision((r) => r + 1)}
            >
              Tentar novamente
            </button>
          </div>
        ) : !data ? (
          <PitterSpinner label="Conferindo produtos e quantidades na Shopify…" />
        ) : (
          <>
            {storedStatus && data.status !== storedStatus && (
              <p className="admin-data-notice">
                O atendimento foi atualizado na Shopify. Esta conferência mostra
                o estado atual; sincronize a lista para atualizar o resumo.
              </p>
            )}
            <div className="fulfillment-dialog-state">
              <strong>
                {data.cancelledAt
                  ? "Pedido cancelado"
                  : fulfillmentLabels[data.status] || data.status}
              </strong>
              <p>
                {data.cancelledAt
                  ? "Os dados abaixo mostram o histórico de atendimento do pedido cancelado."
                  : fulfillmentDescriptions[data.status] ||
                    "Confira os registros de atendimento por produto."}
              </p>
            </div>
            <div className="fulfillment-dialog-totals">
              {[
                ["Unidades no pedido original", data.totals.ordered],
                ["Unidades atendidas", data.totals.fulfilled],
                ["Unidades a atender", data.totals.pending],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <span>{label}</span>
                  <strong>{number(Number(value))}</strong>
                </div>
              ))}
            </div>
            <div
              className="fulfillment-dialog-table"
              role="region"
              aria-label="Produtos e quantidades do atendimento"
              tabIndex={0}
            >
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Pedido original</th>
                    <th>Atendido</th>
                    <th>A atender</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                        <small>SKU {item.sku || "não informado"}</small>
                        {item.current !== item.ordered && (
                          <small>
                            Quantidade atual do pedido: {number(item.current)}
                          </small>
                        )}
                        {item.nonFulfillable > 0 && (
                          <small>
                            {number(item.nonFulfillable)} un. fora do saldo de
                            atendimento
                          </small>
                        )}
                        <span
                          className={`admin-badge ${item.pending > 0 ? "blue" : item.fulfilled > 0 ? "green" : ""}`}
                        >
                          {item.pending > 0
                            ? item.fulfilled > 0
                              ? "Parcialmente atendido"
                              : "A atender"
                            : item.fulfilled > 0
                              ? "Atendido"
                              : "Sem saldo a atender"}
                        </span>
                      </td>
                      <td>{number(item.ordered)}</td>
                      <td>
                        <strong>{number(item.fulfilled)}</strong>
                      </td>
                      <td>{number(item.pending)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.items.length && (
                <p className="fulfillment-dialog-note">
                  Nenhum produto informado neste pedido.
                </p>
              )}
            </div>
            <p className="fulfillment-dialog-note">
              “Atendido” conta somente registros concluídos com sucesso.
              Cancelamentos ou falhas de atendimento não entram nessa
              quantidade. Unidades atendidas e depois reembolsadas podem
              permanecer no histórico; o saldo a atender vem diretamente da
              Shopify.
            </p>
            <footer className="fulfillment-dialog-footer">
              <small>
                Consultado em{" "}
                {new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                  timeZone: "America/Sao_Paulo",
                }).format(new Date(data.checkedAt))}{" "}
                · Brasília
              </small>
              <button
                type="button"
                className="admin-button"
                onClick={() => setRevision((r) => r + 1)}
              >
                <RefreshCw size={14} /> Atualizar conferência
              </button>
            </footer>
          </>
        )}
      </dialog>
    </>
  );
}
