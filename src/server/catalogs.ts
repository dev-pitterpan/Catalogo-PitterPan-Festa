import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cache } from "react";
import { z } from "zod";
import { catalogSchema, configSchema, summarySchema } from "../schemas/catalog";
import type { CatalogPageData } from "../types/catalog";

// Leitura exclusiva do servidor.
async function readJson(relative: string): Promise<unknown> {
  const path = join(process.cwd(), "public", "data", relative);
  return JSON.parse(await readFile(path, "utf8"));
}

export const getManifest = cache(async () =>
  z.object({ catalogs: z.array(summarySchema) })
    .parse(await readJson("catalogs/manifest.json")).catalogs
);

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

export const getCatalog = cache(async (slug: string) => {
  // Aceita somente coleções cadastradas no manifesto.
  const manifest = await getManifest();
  if (!manifest.some(item => item.slug === slug)) return null;

  const catalog = catalogSchema.parse(
    await readJson(`catalogs/${slug}.json`)
  );
  if (catalog.slug !== slug) {
    throw new Error("Identificação do catálogo inválida.");
  }
  return catalog;
});

export async function getPageData(
  slug?: string
): Promise<CatalogPageData> {
  const catalogs = await getManifest();
  if (!slug) return { catalogs, catalog: null, config: null };

  const [catalog, config] = await Promise.all([
    getCatalog(slug),
    getConfig(),
  ]);
  return { catalogs, catalog, config };
}
