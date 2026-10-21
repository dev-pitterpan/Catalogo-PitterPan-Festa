import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cache } from "react";
import { database, usesDatabase } from "./database/client";
import { findPage } from "./database/catalog-repository";
import {
  PAGE_SIZE,
  catalogQuerySchema,
  type CatalogQuery,
} from "../lib/catalog/query";
import { moneyToMinor } from "../lib/money";
import { productSearchScore } from "../lib/search";
import { z } from "zod";
import { catalogSchema, configSchema, summarySchema } from "../schemas/catalog";
import type { CatalogPageData } from "../types/catalog";

// Leitura exclusiva do servidor.
async function readJson(relative: string): Promise<unknown> {
  const path = join(process.cwd(), "public", "data", relative);
  return JSON.parse(await readFile(path, "utf8"));
}

export const getManifest = cache(async () => {
  const catalogs = z
    .object({ catalogs: z.array(summarySchema) })
    .parse(await readJson("catalogs/manifest.json")).catalogs;
  if (usesDatabase())
    catalogs.push({
      name: "Todos os produtos",
      slug: "todos",
      cardClass: "all-products",
      description: "Explore o catálogo completo da Pitter Pan.",
      accent: "#279aff",
    });
  return catalogs;
});

export const getConfig = cache(async () => {
  const config = configSchema.parse(await readJson("config/site.json"));
  const publicBaseUrl = process.env.NEXT_PUBLIC_CATALOG_URL?.trim();

  return publicBaseUrl
    ? configSchema.parse({
        ...config,
        catalog: { ...config.catalog, publicBaseUrl },
      })
    : config;
});

export async function getCatalog(
  slug: string,
  input: Partial<CatalogQuery> = {},
) {
  const query = catalogQuerySchema.parse(input);
  const manifest = await getManifest();
  if (!manifest.some((item) => item.slug === slug)) return null;
  const catalog =
    slug === "todos"
      ? {
          name: "Todos os produtos",
          slug: "todos",
          eyebrow: "Catálogo completo",
          description: "Encontre os produtos da Pitter Pan Festas.",
          banner: "/assets/images/brand/catalog-banner.svg",
          products: [],
        }
      : catalogSchema.parse(await readJson(`catalogs/${slug}.json`));
  if (catalog.slug !== slug)
    throw new Error("Identificação do catálogo inválida.");
  if (usesDatabase())
    return { ...catalog, ...(await findPage(database(), slug, query)) };
  const categories = [
    ...new Set(
      catalog.products
        .map((item) => item.category)
        .filter((name): name is string => !!name),
    ),
  ]
    .sort()
    .map((name) => ({
      name,
      count: catalog.products.filter((item) => item.category === name).length,
    }));
  const filtered = catalog.products
    .map((product) => ({
      product,
      score: productSearchScore(product, query.q, catalog.name),
    }))
    .filter(
      ({ product, score }) =>
        score > 0 &&
        (!query.category || product.category === query.category) &&
        (!query.vendor || product.vendor === query.vendor),
    )
    .sort((a, b) => {
      if (query.sort !== "name") {
        if (a.product.price === undefined)
          return b.product.price === undefined ? 0 : 1;
        if (b.product.price === undefined) return -1;
        const difference =
          moneyToMinor(a.product.price) - moneyToMinor(b.product.price);
        return query.sort === "price-asc" ? difference : -difference;
      }
      return (
        b.score - a.score ||
        a.product.name.localeCompare(b.product.name, "pt-BR")
      );
    })
    .map(({ product }) => product);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(pages, query.page);
  return {
    ...catalog,
    products: filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total: filtered.length,
      pages,
      categories,
      vendors: [
        ...new Set(
          catalog.products
            .map((item) => item.vendor)
            .filter((value): value is string => !!value),
        ),
      ],
    },
  };
}

export async function getPageData(
  slug?: string,
  query: Partial<CatalogQuery> = {},
): Promise<CatalogPageData> {
  const catalogs = await getManifest();
  if (!slug) return { catalogs, catalog: null, config: null };

  const [catalog, config] = await Promise.all([
    getCatalog(slug, query),
    getConfig(),
  ]);
  return { catalogs, catalog, config };
}

/** Checkout consulta somente os códigos selecionados, sem depender da página exibida. */
export async function getSelectedProducts(ids: string[]) {
  if (usesDatabase()) {
    const { findByIds } = await import("./database/catalog-repository");
    return findByIds(database(), ids);
  }
  const manifest = await getManifest();
  const catalogs = await Promise.all(
    manifest.map(async ({ slug }) =>
      catalogSchema.parse(await readJson(`catalogs/${slug}.json`)),
    ),
  );
  return catalogs.flatMap((catalog) =>
    catalog.products.filter((product) => ids.includes(product.id)),
  );
}
