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
// Adjacent transpositions count as one edit (e.g. expriados → expirados).
function typoDistance(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) =>
      i === 0 ? j : j === 0 ? i : 0,
    ),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1);
    }
  }
  return matrix[a.length][b.length];
}
export function searchOrderStatus(value: string) {
  const term = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!term || ["todos", "todas", "tudo"].includes(term)) return "all";
  if (term.length > 80) return "NO_MATCH";
  const direct =
    statusSearchEntries.find(([, , words]) =>
      words.some((word) => word === term),
    ) ||
    statusSearchEntries.find(([, , words]) =>
      words.some((word) => word.startsWith(term)),
    );
  if (direct) return direct[0];
  if (term.length < 4) return "NO_MATCH";
  const limit = term.length >= 7 ? 2 : 1;
  const candidates = statusSearchEntries
    .map(([code, , words]) => ({
      code,
      distance: Math.min(
        ...words.map((word) =>
          Math.abs(word.length - term.length) > limit
            ? limit + 1
            : typoDistance(term, word),
        ),
      ),
    }))
    .filter((candidate) => candidate.distance <= limit)
    .sort((a, b) => a.distance - b.distance);
  // Do not guess if different financial situations are equally close.
  if (!candidates.length || candidates[1]?.distance === candidates[0].distance)
    return "NO_MATCH";
  return candidates[0].code;
}
export function orderStatusSearchLabel(status: string) {
  return statusSearchEntries.find(([code]) => code === status)?.[1] || "";
}
