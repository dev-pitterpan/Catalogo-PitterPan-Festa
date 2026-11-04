import { families } from "./navigation.ts";
import { catalogVisual } from "./visual.ts";
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
  ]);
  const seasonal = new Set([
    "halloween",
    "natal",
    "pascoa",
    "festa-junina",
    "carnaval",
    "saint-patricks-day-copia-1",
    "copa-do-mundo",
    "4-de-julho",
    "setembro-amarelo",
    "outubro-rosa",
    "novembro-azul",
    "reveillon",
  ]);
  return catalogs.filter(
    (catalog) => primary.has(catalog.slug) || seasonal.has(catalog.slug),
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
