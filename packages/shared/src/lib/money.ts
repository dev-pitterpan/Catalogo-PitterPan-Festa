/** Decimal da API → centavos inteiros; não usa ponto flutuante para somar o carrinho. */
export function moneyToMinor(value: string): number {
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(value)) throw new Error("Preço inválido.");
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
export function formatMoney(value: string, currency = "BRL") {
  return formatMinor(moneyToMinor(value), currency);
}
export function formatMinor(value: number, currency = "BRL") {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error("Total inválido.");
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(
    value / 100,
  );
}
