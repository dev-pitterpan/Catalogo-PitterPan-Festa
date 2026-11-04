export function shippingChargeLabel(
  amount: string | null | undefined,
  currency: string,
  checked: boolean,
  kind: string,
) {
  if (!checked) return "Frete a conferir";
  if (amount == null) return "Frete não informado";
  if (!/^-?\d+(\.\d{1,2})?$/.test(amount) || !Number.isFinite(Number(amount)))
    return "Frete a conferir";
  const value = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(Number(amount));
  if (Number(amount) === 0)
    return `${kind === "PICKUP" ? "Sem cobrança de frete" : "Frete grátis"} · ${value}`;
  return `Frete: ${value}`;
}
