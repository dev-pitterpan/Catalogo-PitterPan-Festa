// A chave permanece igual à versão antiga para reaproveitar a seleção na mesma origem.
import type { QuoteItem, SiteConfig } from "../types/catalog";
export const STORAGE_KEY = "pitterpan_quote_selection_v1";
export const totalQuantity = (items: QuoteItem[]) =>
  items.reduce((sum, item) => sum + item.quantity, 0);
export function loadSelection(storage: Pick<Storage, "getItem">): QuoteItem[] {
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved)
      ? saved
          .filter(
            (item: unknown): item is QuoteItem =>
              !!item &&
              typeof item === "object" &&
              "id" in item &&
              typeof item.id === "string",
          )
          .map((item) => ({
            ...item,
            quantity: Math.max(1, parseInt(String(item.quantity), 10) || 1),
          }))
      : [];
  } catch {
    return [];
  }
}
export function whatsappUrl(selected: QuoteItem[], siteConfig: SiteConfig) {
  const grouped = selected.reduce(
    (acc, item) => {
      const key = item.catalog || "Catálogo";
      (acc[key] ||= []).push(item);
      return acc;
    },
    {} as Record<string, QuoteItem[]>,
  );

  const brandWebsite = String(siteConfig?.brand?.website || "").replace(
    /\/+$/,
    "",
  );
  const totalUnits = totalQuantity(selected);
  const uniqueProducts = selected.length;
  const collectionCount = Object.keys(grouped).length;

  const separator = "━━━━━━━━━━━━━━━━━━";
  const lines = [
    "Olá, Pitter Pan Festas! 👋",
    "",
    "*SOLICITAÇÃO DE ORÇAMENTO*",
    "",
    "Gostaria de solicitar um orçamento para os itens abaixo.",
    "",
  ];

  Object.entries(grouped).forEach(([catalogName, items]) => {
    const collectionUnits = totalQuantity(items);

    lines.push(separator);
    lines.push(`*${catalogName.toLocaleUpperCase("pt-BR")}*`);
    lines.push(separator);
    lines.push("");

    items.forEach((item, index) => {
      const quantity = Math.max(
        1,
        Number.parseInt(String(item.quantity), 10) || 1,
      );
      const itemSiteUrl = String(item.siteUrl || "").trim();
      const normalizedItemUrl = itemSiteUrl.replace(/\/+$/, "");
      const hasSpecificProductUrl = Boolean(
        normalizedItemUrl &&
        (!brandWebsite || normalizedItemUrl !== brandWebsite),
      );

      lines.push(`*${index + 1}. ${item.name}*`);
      lines.push(`Código: ${item.id}`);
      lines.push(`Quantidade: ${quantity}`);
      if (item.category) lines.push(`Categoria: ${item.category}`);
      if (hasSpecificProductUrl) lines.push(`Ver no site: ${itemSiteUrl}`);
      lines.push("");
    });

    lines.push(
      `Subtotal da coleção: *${collectionUnits} ${collectionUnits === 1 ? "item" : "itens"}*`,
    );
    lines.push("");
  });

  lines.push(separator);
  lines.push("*RESUMO DO ORÇAMENTO*");
  lines.push(separator);
  lines.push("");
  lines.push(`Produtos diferentes: *${uniqueProducts}*`);
  lines.push(
    `Quantidade total: *${totalUnits} ${totalUnits === 1 ? "item" : "itens"}*`,
  );
  lines.push(`Coleções: *${collectionCount}*`);
  lines.push("");
  lines.push(
    "Gostaria de saber a disponibilidade e receber mais informações sobre o orçamento.",
  );
  lines.push("");
  lines.push("Obrigado! 😊");

  const url = `https://wa.me/${siteConfig.whatsapp.number}?text=${encodeURIComponent(lines.join("\n"))}`;
  return url;
}
