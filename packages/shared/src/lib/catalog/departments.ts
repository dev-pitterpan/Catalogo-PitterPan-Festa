import { families } from "./navigation.ts";
import { catalogVisual } from "./visual.ts";
import { normalizeText } from "./query.ts";
import type { CatalogSummary, Product } from "../../types/catalog.ts";

export const brandHandles = new Set([
  "bwb",
  "harald",
  "cromus",
  "sicao",
  "ponto-das-festas",
  "regina",
]);
const handlesOf = (label: string) =>
  families.find((family) => family.label === label)!.handles;
export const departments = [
  {
    slug: "festas-e-decoracao",
    name: "Festas e decoração",
    handles: handlesOf("Festas e decoração").filter(
      (h) => !["descartaveis", "embalagens-1"].includes(h),
    ),
  },
  {
    slug: "doces-e-guloseimas",
    name: "Doces e guloseimas",
    handles: handlesOf("Guloseimas e doces"),
  },
  {
    slug: "confeitaria",
    name: "Confeitaria",
    handles: handlesOf("Confeitaria"),
  },
  {
    slug: "embalagens-e-descartaveis",
    name: "Embalagens e descartáveis",
    handles: [...handlesOf("Embalagens"), "descartaveis", "embalagens-1"],
  },
  {
    slug: "artesanato-e-papelaria",
    name: "Artesanato e papelaria",
    handles: handlesOf("Artesanato e papelaria"),
  },
  { slug: "utilidades", name: "Utilidades", handles: handlesOf("Utilidades") },
  {
    slug: "datas-especiais",
    name: "Datas especiais",
    handles: families.slice(0, 6).flatMap((family) => family.handles),
  },
  {
    slug: "ofertas",
    name: "Ofertas",
    handles: [
      ...handlesOf("Ofertas"),
      "panettone-pullman-a-partir-de-2-r-19-99-cada",
    ],
  },
];
export const shoppingDepartments = departments.filter(
  ({ slug }) => slug !== "datas-especiais" && slug !== "ofertas",
);

const subcategories = {
  "festas-e-decoracao": [
    ["baloes", "Balões", "baloes-1"],
    ["temas-e-decoracao", "Temas e decoração", "temas", "decoracoes-1"],
    ["velas-e-forminhas", "Velas e forminhas", "velas", "forminhas"],
    ["fantasias-e-aderecos", "Fantasias e adereços", "fantasias", "aderecos"],
    [
      "lembrancinhas-e-brinquedos",
      "Lembrancinhas e brinquedos",
      "lembrancinhas",
      "brinquedos",
      "acrilicos",
    ],
  ],
  "doces-e-guloseimas": [
    ["balas-e-chicletes", "Balas e chicletes", "balas-1", "chicles"],
    [
      "pirulitos-e-marshmallows",
      "Pirulitos e marshmallows",
      "pirulitos",
      "marshmallows",
    ],
    [
      "chocolates-e-confeitos",
      "Chocolates e confeitos",
      "chocolates",
      "confeitos",
    ],
    [
      "salgadinhos-e-biscoitos",
      "Salgadinhos e biscoitos",
      "amendoins",
      "salgados",
      "biscoito",
    ],
  ],
  confeitaria: [
    [
      "ingredientes",
      "Ingredientes",
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
    ],
    [
      "formas-e-moldes",
      "Formas e moldes",
      "formas-para-chocolate",
      "formas-para-bolo",
    ],
    [
      "utensilios",
      "Utensílios",
      "utensilios-para-confeitar",
      "utensilios-para-confeitar-1",
      "cortadores",
      "palitos",
      "cake-boards",
    ],
    [
      "chocolates-e-coberturas",
      "Chocolates e coberturas",
      "chocolates-e-coberturas",
    ],
  ],
  "embalagens-e-descartaveis": [
    [
      "caixas-e-cestas",
      "Caixas, cestas e latas",
      "caixas-de-papel",
      "cesta",
      "latas",
      "acrilicos-embalagens",
    ],
    [
      "descartaveis-e-bandejas",
      "Descartáveis, pratos e bandejas",
      "descartaveis",
      "descartaveis-embalagens",
      "pratos-e-bandejas",
    ],
    [
      "sacolas-e-embrulhos",
      "Sacolas e embrulhos",
      "sacolas",
      "embrulhos",
      "embalagens-1",
    ],
    ["fitas-e-etiquetas", "Fitas e etiquetas", "fitas", "etiquetas"],
  ],
  "artesanato-e-papelaria": [
    ["papelaria", "Papelaria", "papelaria"],
    ["eva-tnt-e-isopor", "EVA, TNT e isopor", "eva", "tnt", "eps-isopor"],
    [
      "tintas-colas-e-pinceis",
      "Tintas, colas e pincéis",
      "tintas",
      "colas",
      "pinceis",
    ],
    ["aviamentos-e-glitter", "Aviamentos e glitter", "decoracoes", "glitters"],
  ],
};

export const shoppingSubcategories = Object.entries(subcategories).flatMap(
  ([parent, groups]) =>
    groups.map(([slug, name, ...handles]) => ({
      parent,
      slug: `${parent}-${slug}`,
      name,
      handles,
    })),
);

export const campaignMonths: Record<string, readonly number[]> = {
  carnaval: [1, 2, 3],
  "saint-patricks-day-copia-1": [3],
  pascoa: [3, 4],
  "festa-junina": [5, 6, 7],
  "4-de-julho": [7],
  "7-de-setembro": [8, 9],
  "setembro-amarelo": [9],
  "outubro-rosa": [10],
  "dia-das-criancas": [9, 10],
  halloween: [9, 10],
  "novembro-azul": [11],
  natal: [11, 12],
  reveillon: [12],
  "copa-do-mundo": [],
};

export function catalogCampaigns(catalogs: CatalogSummary[]) {
  return catalogs.filter(
    ({ slug }) =>
      Object.hasOwn(campaignMonths, slug) || slug === "datas-especiais",
  );
}

export function storefrontCollectionAliases(catalogs: CatalogSummary[]) {
  const known = new Set(catalogs.map(({ slug }) => slug));
  const aliases = shoppingSubcategories
    .filter(
      ({ slug, handles }) =>
        !known.has(slug) && handles.some((handle) => known.has(handle)),
    )
    .map(({ name, slug }) => ({ name, slug }));
  const renamed = catalogs.find(
    ({ slug, name }) =>
      slug === "copa-do-mundo" && normalizeText(name) === "7 de setembro",
  );
  if (renamed && !known.has("7-de-setembro"))
    aliases.push({ name: "7 de Setembro", slug: "7-de-setembro" });
  return aliases.map(({ name, slug }) => ({
    slug,
    name,
    description: `Explore ${name.toLocaleLowerCase("pt-BR")} na Pitter Pan.`,
    cardClass: "shopify-collection",
    accent: catalogVisual(slug).accent,
  }));
}

const unions: Record<string, string[]> = {
  natal: ["natal", "confeitarias-natal"],
  "utensilios-para-confeitar": [
    "utensilios-para-confeitar",
    "utensilios-para-confeitar-1",
  ],
  "utensilios-para-confeitar-1": [
    "utensilios-para-confeitar",
    "utensilios-para-confeitar-1",
  ],
};
export function departmentHandles(slug: string) {
  return (
    departments.find((department) => department.slug === slug)?.handles ||
    shoppingSubcategories.find((category) => category.slug === slug)?.handles ||
    unions[slug] || [slug]
  );
}
export function departmentSummaries(): CatalogSummary[] {
  return departments.map(({ slug, name }) => ({
    slug,
    name,
    description: `Explore ${name.toLocaleLowerCase("pt-BR")} na Pitter Pan.`,
    cardClass: "shopify-collection",
    accent: catalogVisual(slug).accent,
  }));
}
/** Public navigation is deliberately smaller than the compatibility manifest. */
export function storefrontNavigation(catalogs: CatalogSummary[]) {
  const primary = new Set([
    "todos",
    ...departments.map((department) => department.slug),
    ...shoppingSubcategories.map(({ slug }) => slug),
  ]);
  const seasonal = new Set(catalogCampaigns(catalogs).map(({ slug }) => slug));
  const hasSeptember = seasonal.has("7-de-setembro");
  return catalogs.filter(
    ({ slug, name }) =>
      (primary.has(slug) || seasonal.has(slug)) &&
      !(
        hasSeptember &&
        slug === "copa-do-mundo" &&
        normalizeText(name) === "7 de setembro"
      ),
  );
}
export function uniqueVariants(products: Product[]) {
  return [
    ...new Map(
      products.map((product) => [
        product.shopifyVariantId || product.id,
        product,
      ]),
    ).values(),
  ];
}
