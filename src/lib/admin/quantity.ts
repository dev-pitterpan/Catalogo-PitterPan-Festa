/** Compact labels only; quantities remain exact in storage and calculations. */
const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const exact = new Intl.NumberFormat("pt-BR");
function quantity(value: string | number): number | bigint {
  return typeof value === "string" && /^\d+$/.test(value)
    ? BigInt(value)
    : Number(value);
}
export function compactQuantity(value: string | number) {
  return compact
    .formatToParts(quantity(value))
    .map((part) =>
      part.type === "compact" && part.value === "K"
        ? "k"
        : part.type === "decimal"
          ? ","
          : part.value,
    )
    .join("");
}
export function exactQuantity(value: string | number) {
  return exact.format(quantity(value));
}
