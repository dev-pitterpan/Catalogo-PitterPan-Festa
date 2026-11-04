"use client";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { SalesFilters } from "../../server/sales/filters";
import {
  searchOrderStatus,
  orderStatusSearchLabel,
} from "../../lib/admin/order-status-search";
export default function OrderStatusSearch({
  value,
  onChange,
}: {
  value: SalesFilters["status"];
  onChange: (value: SalesFilters["status"]) => void;
}) {
  const [draft, setDraft] = useState(() => orderStatusSearchLabel(value));
  const lastSent = useRef(value);
  useEffect(() => {
    if (value !== lastSent.current) setDraft(orderStatusSearchLabel(value));
    lastSent.current = value;
  }, [value]);
  const change = useRef(onChange);
  change.current = onChange;
  useEffect(() => {
    const timer = setTimeout(
      () => {
        const next = searchOrderStatus(draft);
        if (next !== lastSent.current) {
          lastSent.current = next;
          change.current(next);
        }
      },
      draft.trim() ? 250 : 0,
    );
    return () => clearTimeout(timer);
  }, [draft]);
  return (
    <>
      <div className="sales-status-search-field">
        <Search size={17} aria-hidden="true" />
        <input
          id="recent-orders-status"
          type="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Digite pago, expirado, cancelado, estornado…"
          autoComplete="off"
          aria-describedby="recent-orders-status-help"
        />
      </div>
      <small id="recent-orders-status-help" role="status">
        {value === "NO_MATCH"
          ? "Nenhuma situação corresponde à busca. Apague para ver todas."
          : value === "all"
            ? "Todas as situações. Digite para filtrar automaticamente."
            : `Filtro aplicado: ${orderStatusSearchLabel(value)}. Apague para ver todas as situações.`}
      </small>
    </>
  );
}
