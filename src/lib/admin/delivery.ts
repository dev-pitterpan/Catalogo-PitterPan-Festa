export const deliveryKinds = [
  "PICKUP",
  "MOTOBOY",
  "SEDEX",
  "OTHER",
  "MIXED",
  "UNKNOWN",
] as const;
export type DeliveryKind = (typeof deliveryKinds)[number];
export const deliveryLabels: Record<DeliveryKind, string> = {
  PICKUP: "Retirada na loja",
  MOTOBOY: "Motoboy",
  SEDEX: "Sedex",
  OTHER: "Outro",
  MIXED: "Modalidades múltiplas",
  UNKNOWN: "Não identificado",
};
type ShippingLine = {
  title: string;
  code?: string | null;
  source?: string | null;
  deliveryCategory?: string | null;
  isRemoved?: boolean;
};
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/_/g, " ");
/** Explicit service names only: a free or local rate does not prove pickup/motorcycle. */
export function classifyDelivery(lines: ShippingLine[]): {
  kind: DeliveryKind;
  label: string;
} {
  const active = lines.filter((line) => !line.isRemoved);
  const kinds = active.map((line): DeliveryKind => {
    const text = normalize(
      [line.title, line.code, line.deliveryCategory].filter(Boolean).join(" "),
    );
    const matches: DeliveryKind[] = [];
    if (/\b(retirada|retirar|pickup|pick[ -]?up)\b/.test(text))
      matches.push("PICKUP");
    if (/\b(motoboy|moto[ -]?boy|moto|motocicleta)\b/.test(text))
      matches.push("MOTOBOY");
    if (/\bsedex(?:\s*1[02])?\b/.test(text)) matches.push("SEDEX");
    return matches.length > 1 ? "UNKNOWN" : matches[0] || "OTHER";
  });
  const distinct = [...new Set(kinds)];
  return {
    kind: distinct.length > 1 ? "MIXED" : distinct[0] || "UNKNOWN",
    label: active
      .map((line) => line.title)
      .join(" · ")
      .slice(0, 500),
  };
}
