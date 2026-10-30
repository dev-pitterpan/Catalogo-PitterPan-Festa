"use client";
import AdminSelect from "./AdminSelect";
import type { SalesFilters } from "../../server/sales/filters";
const options = [
  { value: "NO_MATCH", label: "Nenhuma situação encontrada" },
  { value: "all", label: "Todas as situações" },
  { value: "PAID", label: "Pagos" },
  { value: "EXPIRED", label: "Expirados" },
  { value: "CANCELLED", label: "Cancelados" },
  { value: "REFUNDS", label: "Reembolsados · total ou parcial" },
  { value: "PENDING", label: "Pendentes" },
  { value: "AUTHORIZED", label: "Autorizados" },
  { value: "PARTIALLY_PAID", label: "Parcialmente pagos" },
  { value: "PARTIALLY_REFUNDED", label: "Somente reembolso parcial" },
  { value: "REFUNDED", label: "Somente reembolso total" },
  { value: "VOIDED", label: "Anulados" },
  { value: "UNKNOWN", label: "Não informado" },
];
export default function SalesStatusSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: SalesFilters["status"];
  onChange: (status: SalesFilters["status"]) => void;
}) {
  return (
    <AdminSelect
      id={id}
      label="Situação dos pedidos"
      value={value}
      options={options}
      onValueChange={(value) => onChange(value as SalesFilters["status"])}
    />
  );
}
