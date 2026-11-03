import type { SalesOrder } from "./model.ts";
/** Shipping charged after discounts, before refunds. Missing metadata never means free. */
export function shippingCharge(lines: SalesOrder["shippingLines"]) {
  if (!lines || lines.pageInfo.hasNextPage)
    return { amount: null, checked: false };
  const active = lines.nodes.filter((line) => !line.isRemoved);
  if (!active.length) return { amount: null, checked: true };
  if (active.some((line) => !line.discountedPriceSet))
    return { amount: null, checked: false };
  let cents = 0n;
  for (const line of active) {
    const value = line.discountedPriceSet!.shopMoney.amount;
    const negative = value.startsWith("-");
    const [whole, fraction = ""] = value.replace(/^-/u, "").split(".");
    cents +=
      (negative ? -1n : 1n) *
      (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0")));
  }
  const absolute = cents < 0n ? -cents : cents;
  return {
    amount: `${cents < 0n ? "-" : ""}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`,
    checked: true,
  };
}
