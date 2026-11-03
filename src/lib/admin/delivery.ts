export const deliveryKinds = [
  "PICKUP",
  "MOTOBOY",
  "SEDEX",
  "PAC",
  "JADLOG",
  "LOCAL",
  "OTHER",
  "MIXED",
  "UNKNOWN",
] as const;
export const deliveryFilterKinds = deliveryKinds;
export type DeliveryKind = (typeof deliveryKinds)[number];
export const deliveryLabels: Record<DeliveryKind, string> = {
  PICKUP: "Retirada na loja",
  MOTOBOY: "Motoboy",
  SEDEX: "Sedex",
  PAC: "PAC",
  JADLOG: "Jadlog",
  LOCAL: "Entrega local",
  OTHER: "Outras entregas",
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
/** Names verified against Shopify shipping lines; never infer pickup from an unknown service. */
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
    if (
      /\b(retirada|retirar|pickup|pick[ -]?up)\b/.test(text) ||
      [line.title, line.code].some(
        (value) =>
          normalize(value || "").trim() === "matriz - pitter pan festas",
      )
    )
      matches.push("PICKUP");
    if (/\bpac\b/.test(text)) matches.push("PAC");
    if (/\bjadlog\b/.test(text)) matches.push("JADLOG");
    if (
      [line.title, line.code].some((value) =>
        /^local[ _-]*delivery$/i.test((value || "").trim()),
      ) ||
      /\bentrega local\b/.test(text)
    )
      matches.push("LOCAL");

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
