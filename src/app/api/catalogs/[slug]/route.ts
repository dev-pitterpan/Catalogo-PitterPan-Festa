import { getPageData } from "../../../../server/catalogs";
import { catalogQuerySchema } from "../../../../lib/catalog/query";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const parsed = catalogQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success)
    return Response.json({ error: "Filtros inválidos." }, { status: 400 });
  const started = performance.now();
  try {
    const result = await getPageData((await params).slug, parsed.data);
    if (!result.catalog)
      return Response.json(
        { error: "Coleção não encontrada." },
        { status: 404 },
      );
    return Response.json(result, {
      headers: {
        "Cache-Control": "no-store",
        "Server-Timing": `catalog;dur=${(performance.now() - started).toFixed(1)}`,
      },
    });
  } catch {
    console.error("catalog_query_failed", {
      elapsedMs: Math.round(performance.now() - started),
      source: process.env.CATALOG_DATA_SOURCE || "json",
    });
    return Response.json(
      { error: "Não foi possível consultar o catálogo. Tente novamente." },
      { status: 503 },
    );
  }
}
