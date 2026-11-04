// A chave permanece igual à versão antiga para reaproveitar a seleção na mesma origem.
import { z } from "zod";
import { productSchema } from "../schemas/catalog.ts";
import type { QuoteItem, SiteConfig } from "../types/catalog";
export const MAX_CART_ITEMS = 100;
export const MAX_QUANTITY = 999;
export const STORAGE_KEY = "pitterpan_quote_selection_v1";
export const totalQuantity = (items: QuoteItem[]) =>
  items.reduce((sum, item) => sum + item.quantity, 0);
export function loadSelection(storage: Pick<Storage, "getItem">): QuoteItem[] {
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(saved)) return [];
    const schema = productSchema.extend({
      id: z.string().min(1).max(100),
      name: z.string().default("Produto"),
      description: z.string().default(""),
      image: z.string().default(""),
      catalog: z.string().default("Catálogo"),
      catalogSlug: z.string().default(""),
      quantity: z.number().int().min(1).max(MAX_QUANTITY),
    });
    const items = new Map<string, QuoteItem>();
    for (const raw of saved) {
      if (!raw || typeof raw !== "object") continue;
      const result = schema.safeParse({
        ...raw,
        quantity: Math.min(
          MAX_QUANTITY,
          Math.max(1, parseInt(String(raw.quantity), 10) || 1),
        ),
      });
      if (!result.success) continue;
      const item = result.data;
      const key = item.shopifyVariantId
        ? `variant-${item.shopifyVariantId}`
        : item.id;
      const existing = items.get(key);
      if (existing)
        existing.quantity = Math.min(
          MAX_QUANTITY,
          existing.quantity + item.quantity,
        );
      else items.set(key, item);
    }
    return [...items.values()];
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
      lines.push(`Código: ${item.sku || item.id}`);
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
