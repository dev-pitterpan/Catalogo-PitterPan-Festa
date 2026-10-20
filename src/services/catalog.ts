import { z } from "zod";
import { summarySchema, catalogSchema, configSchema } from "../schemas/catalog";

// Esta camada concentra o acesso aos dados; o futuro backend substituirá apenas estas chamadas.
async function readJson(path: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(path, { signal });
  if (!response.ok)
    throw new Error(`Não foi possível carregar ${path} (${response.status}).`);
  return response.json();
}
export async function loadManifest(signal?: AbortSignal) {
  return z
    .object({ catalogs: z.array(summarySchema) })
    .parse(await readJson("/data/catalogs/manifest.json", signal)).catalogs;
}
export async function loadCatalog(slug: string, signal?: AbortSignal) {
  const data = catalogSchema.parse(
    await readJson(`/data/catalogs/${encodeURIComponent(slug)}.json`, signal),
  );
  if (data.slug !== slug)
    throw new Error("Identificação do catálogo inválida.");
  return data;
}
export async function loadConfig(signal?: AbortSignal) {
  const config = configSchema.parse(
    await readJson("/data/config/site.json", signal),
  );
  // O domínio pode variar por ambiente sem alterar os dados versionados do catálogo.
  const publicBaseUrl = process.env.NEXT_PUBLIC_CATALOG_URL?.trim();
  if (publicBaseUrl)
    return configSchema.parse({
      ...config,
      catalog: { ...config.catalog, publicBaseUrl },
    });
  return config;
}
