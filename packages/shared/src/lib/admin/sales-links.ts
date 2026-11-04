export const salesSectionIds = [
  "recent-orders",
  "sold-products",
  "sales-operations",
] as const;
export function salesSectionFromHash(hash: string) {
  return salesSectionIds.find((id) => hash === `#${id}`);
}
/** Links retain business filters and discard polling cursors and view-only metadata. */
export const salesLinkKeys = [
  "days",
  "start",
  "end",
  "status",
  "fulfillment",
  "category",
  "delivery",
] as const;
export function salesLink(
  source: URLSearchParams,
  overrides: Partial<Record<(typeof salesLinkKeys)[number], string>> = {},
  target?: (typeof salesSectionIds)[number],
) {
  const params = new URLSearchParams();
  for (const key of salesLinkKeys) {
    const value = overrides[key] ?? source.get(key);
    if (value && value !== "all") params.set(key, value);
  }
  return `/gestor/vendas/${params.size ? `?${params}` : ""}${target ? `#${target}` : ""}`;
}

/** Card labels and destinations are one contract, reused directly by the overview. */
export function salesOverviewCards(source: URLSearchParams) {
  return [
    {
      key: "received" as const,
      label: "Recebido confirmado",
      href: salesLink(source),
    },
    {
      key: "net" as const,
      label: "Líquido após reembolsos",
      href: "/gestor/analises/",
    },
    {
      key: "refunds" as const,
      label: "Reembolsos",
      href: salesLink(source, { status: "REFUNDS" }, "recent-orders"),
    },
    {
      key: "awaiting" as const,
      label: "Atendimento em aberto",
      href: salesLink(source, { fulfillment: "AWAITING" }, "recent-orders"),
    },
  ];
}
