"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import PitterSpinner from "./PitterSpinner";
import { customerDiagnostic } from "./customerDiagnostic";
export default function OrderCustomerRefresh({
  orders,
  onUpdate,
}: {
  orders: Record<string, string>[];
  onUpdate: (rows: Record<string, string>[]) => void;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const attempted = useRef(new Set<string>()),
    active = useRef(false);
  const signature = orders.map((o) => o.id).join("|");
  const refresh = useCallback(
    async (ids: string[]) => {
      if (!ids.length || active.current) return;
      active.current = true;
      setBusy(true);
      setMessage("");
      ids.forEach((id) => attempted.current.add(id));
      try {
        const response = await fetch("/api/admin/sales/customers/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        const result = await response.json();
        if (!response.ok)
          throw Error(
            result.error || "Não foi possível consultar os clientes.",
          );
        onUpdate(result.orders);
        const counts = Object.values(result.diagnostics || {}).reduce<
          Record<string, number>
        >((all, code) => {
          const key = String(code);
          all[key] = (all[key] || 0) + 1;
          return all;
        }, {});
        setMessage(
          Object.entries(counts)
            .map(([code, count]) => `${count}: ${customerDiagnostic(code)}`)
            .join(" · ") || "Consulta concluída.",
        );
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Falha de conexão.",
        );
      } finally {
        active.current = false;
        setBusy(false);
      }
    },
    [onUpdate],
  );
  useEffect(() => {
    if (busy) return;
    const ids = signature
      .split("|")
      .filter(Boolean)
      .filter((id) => !attempted.current.has(id))
      .slice(-10);
    void refresh(ids);
  }, [signature, refresh, busy]);
  return (
    <div className="sales-customer-refresh">
      <button
        type="button"
        className="admin-text-link"
        disabled={busy || !orders.length}
        onClick={() => void refresh(orders.slice(-10).map((o) => o.id))}
      >
        {busy ? (
          <PitterSpinner label="Consultando clientes…" />
        ) : (
          <>
            <RefreshCw size={14} /> Atualizar clientes destes pedidos
          </>
        )}
      </button>
      {message && <small role="status">{message}</small>}
      <details>
        <summary>Como os pedidos são vinculados</summary>
        <small>
          Comparação pelo código Shopify, nunca apenas pelo nome. Resumo entre
          pedidos já identificados no histórico sincronizado, em todos os
          períodos e na mesma moeda. “Pendente calculado” = total menos recebido
          nos pedidos pendentes; não confirma dívida.
        </small>
      </details>
    </div>
  );
}
