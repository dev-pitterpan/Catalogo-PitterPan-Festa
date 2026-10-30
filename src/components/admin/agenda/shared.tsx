"use client";
import { useState } from "react";
import type { Supplier } from "../../../lib/agenda/types";
export type Save = (
  entity: "supplier" | "appointment" | "note" | "import",
  data: unknown,
  id?: string,
  revision?: number,
) => Promise<boolean>;
export function SupplierPicker({
  suppliers,
  value,
  onChange,
}: {
  suppliers: Supplier[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const selected = suppliers.find((s) => s.id === value);
  const matches = suppliers
    .filter((s) =>
      `${s.name} ${s.trade_name} ${s.code}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .slice(0, 20);
  return (
    <div
      className="agenda-supplier-picker"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <label>
        Fornecedor <small>(opcional)</small>
        <input
          value={
            open
              ? search
              : selected
                ? `${selected.code} · ${selected.name}`
                : ""
          }
          placeholder="Buscar por nome ou código"
          onFocus={() => {
            setSearch("");
            setOpen(true);
          }}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        />
      </label>
      {open && (
        <div className="agenda-picker-results">
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
          >
            Sem fornecedor vinculado
          </button>
          {matches.map((s) => (
            <button
              type="button"
              key={s.id}
              onClick={() => {
                onChange(s.id);
                setOpen(false);
              }}
            >
              {s.code} · {s.name}
            </button>
          ))}
          {!matches.length && <p>Nenhum fornecedor encontrado.</p>}
        </div>
      )}
    </div>
  );
}
export function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.4-4.1A8 8 0 1 1 20 11.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M8.2 7.5c-.8.4-.6 1.9.2 3.3 1 1.7 3.6 3.8 5.6 3.9 1.3.1 2-.8 1.8-1.5l-2-1-1 .9c-1.4-.5-2.7-1.7-3.2-3l.6-.9-.8-1.7Z"
        fill="currentColor"
      />
    </svg>
  );
}
