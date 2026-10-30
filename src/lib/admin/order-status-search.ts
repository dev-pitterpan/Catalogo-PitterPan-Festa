export const statusSearchEntries = [
  ["PAID", "Pago", ["pago", "pagos", "paga", "pagas"]],
  ["EXPIRED", "Expirado", ["expirado", "expirados", "expirada", "expiradas"]],
  [
    "CANCELLED",
    "Cancelado",
    ["cancelado", "cancelados", "cancelada", "canceladas"],
  ],
  [
    "REFUNDS",
    "Reembolsado",
    [
      "reembolsado",
      "reembolsados",
      "reembolso",
      "estornado",
      "estornados",
      "estorno",
    ],
  ],
  ["PENDING", "Pendente", ["pendente", "pendentes"]],
  ["AUTHORIZED", "Autorizado", ["autorizado", "autorizados"]],
  [
    "PARTIALLY_PAID",
    "Parcialmente pago",
    ["parcialmente pago", "pagamento parcial"],
  ],
  [
    "PARTIALLY_REFUNDED",
    "Reembolso parcial",
    ["reembolso parcial", "estorno parcial"],
  ],
  ["REFUNDED", "Reembolso total", ["reembolso total", "estorno total"]],
  ["VOIDED", "Anulado", ["anulado", "anulados"]],
  ["UNKNOWN", "Não informado", ["nao informado"]],
] as const;
export function searchOrderStatus(value: string) {
  const term = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!term || ["todos", "todas", "tudo"].includes(term)) return "all";
  return (
    statusSearchEntries.find(([, , words]) =>
      words.some((word) => word === term),
    )?.[0] ||
    statusSearchEntries.find(([, , words]) =>
      words.some((word) => word.startsWith(term)),
    )?.[0] ||
    "NO_MATCH"
  );
}
export function orderStatusSearchLabel(status: string) {
  return statusSearchEntries.find(([code]) => code === status)?.[1] || "";
}
