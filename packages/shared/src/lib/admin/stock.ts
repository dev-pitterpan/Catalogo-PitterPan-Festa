export const stockFilters = [
  "all",
  "low",
  "above",
  "high",
  "out",
  "unknown",
] as const;
export type StockFilter = (typeof stockFilters)[number];
export function matchesStock(
  quantity: number | null,
  filter: StockFilter,
  low: number,
  high: number,
) {
  if (filter === "all") return true;
  if (filter === "unknown") return quantity === null;
  if (quantity === null) return false;
  if (filter === "low") return quantity > 0 && quantity <= low;
  if (filter === "above") return quantity > low;
  if (filter === "high") return quantity >= high;
  return quantity <= 0;
}
