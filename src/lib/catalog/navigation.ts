import type { CatalogSummary } from "../../types/catalog.ts";
import { normalizeText } from "./query.ts";

// Explicit handles avoid misclassification (e.g. "decoracoes" is Aviamentos).
export const families = [
  {
    label: "Halloween",
    root: "halloween",
    handles: ["halloween"],
    words: /halloween/,
  },
  {
    label: "Natal e fim de ano",
    root: "natal",
    handles: ["natal", "confeitarias-natal", "reveillon", "fim-de-ano"],
    words: /natal|natalin|panettone|reveillon|fim de ano/,
  },
  { label: "Páscoa", root: "pascoa", handles: ["pascoa"], words: /pascoa/ },
  {
    label: "Festa Junina",
    root: "festa-junina",
    handles: ["festa-junina", "doces-festa-junina"],
    words: /junina|arraia/,
  },
  {
    label: "Dia das Crianças",
    root: "dia-das-criancas",
    handles: ["dia-das-criancas"],
    words: /dia das criancas/,
  },
  {
    label: "Outras datas e campanhas",
    root: "",
    handles: [
      "carnaval",
      "saint-patricks-day-copia-1",
      "copa-do-mundo",
      "4-de-julho",
      "setembro-amarelo",
      "outubro-rosa",
      "novembro-azul",
    ],
    words:
      /carnaval|patrick|setembro|outubro rosa|novembro azul|4 de julho|copa do mundo/,
  },
  {
    label: "Festas e decoração",
    root: "festas",
    handles: [
      "festas",
      "velas",
      "fantasias",
      "aderecos",
      "decoracoes-1",
      "descartaveis",
      "baloes-1",
      "brinquedos",
      "embalagens-1",
      "lembrancinhas",
      "temas",
      "acrilicos",
      "forminhas",
    ],
  },
  {
    label: "Guloseimas e doces",
    root: "guloseimas",
    handles: [
      "guloseimas",
      "doces",
      "balas-1",
      "marshmallows",
      "pirulitos",
      "chicles",
      "chocolates",
      "confeitos",
      "amendoins",
      "salgados",
      "biscoito",
    ],
  },
  {
    label: "Confeitaria",
    root: "confeitarias",
    handles: [
      "confeitarias",
      "formas-para-chocolate",
      "formas-para-bolo",
      "chocolates-e-coberturas",
      "acucares",
      "corantes",
      "aromas",
      "misturas",
      "sorveteria",
      "chantillys",
      "pastas-americana",
      "papel-arroz",
      "suspiros",
      "outros-insumos",
      "palitos",
      "utensilios-para-confeitar",
      "utensilios-para-confeitar-1",
      "cortadores",
      "cake-boards",
    ],
  },
  {
    label: "Embalagens",
    root: "embalagens",
    handles: [
      "embalagens",
      "acrilicos-embalagens",
      "caixas-de-papel",
      "cesta",
      "descartaveis-embalagens",
      "embrulhos",
      "etiquetas",
      "fitas",
      "latas",
      "sacolas",
      "pratos-e-bandejas",
    ],
  },
  {
    label: "Artesanato e papelaria",
    root: "artesanato",
    handles: [
      "artesanato",
      "decoracoes",
      "tnt",
      "papelaria",
      "tintas",
      "pinceis",
      "colas",
      "glitters",
      "eva",
      "eps-isopor",
    ],
  },
  { label: "Utilidades", root: "utilidades", handles: ["utilidades", "mix"] },
  {
    label: "Marcas",
    root: "",
    handles: ["bwb", "harald", "cromus", "sicao", "ponto-das-festas", "regina"],
  },
  {
    label: "Ofertas",
    root: "promocoes",
    handles: ["promocoes", "leve-3-pague-2"],
  },
];

export function collectionGroups(
  catalogs: CatalogSummary[],
  activeSlug: string,
  query = "",
) {
  const terms = normalizeText(query).split(" ").filter(Boolean);
  const buckets = [
    {
      label: "Catálogo completo",
      root: "todos",
      items: [] as CatalogSummary[],
    },
    ...families.map((family) => ({
      label: family.label,
      root: family.root,
      items: [] as CatalogSummary[],
    })),
    { label: "Outras coleções", root: "", items: [] as CatalogSummary[] },
  ];
  const seen = new Set<string>();
  for (const catalog of catalogs) {
    if (seen.has(catalog.slug)) continue;
    seen.add(catalog.slug);
    const family = families.findIndex(
      (item) =>
        item.handles.includes(catalog.slug) ||
        item.words?.test(normalizeText(catalog.name)),
    );
    const index =
      catalog.slug === "todos"
        ? 0
        : family < 0
          ? buckets.length - 1
          : family + 1;
    const bucket = buckets[index];
    const search = normalizeText(`${bucket.label} ${catalog.name}`);
    if (terms.every((term) => search.includes(term)))
      bucket.items.push(catalog);
  }
  for (const bucket of buckets)
    bucket.items.sort(
      (a, b) =>
        Number(b.slug === bucket.root) - Number(a.slug === bucket.root) ||
        a.name.localeCompare(b.name, "pt-BR"),
    );
  const activeIndex = buckets.findIndex((bucket) =>
    bucket.items.some((item) => item.slug === activeSlug),
  );
  if (activeIndex > 1) buckets.splice(1, 0, ...buckets.splice(activeIndex, 1));
  return buckets.filter((bucket) => bucket.items.length);
}
