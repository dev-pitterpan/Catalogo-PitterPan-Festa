import { z } from "zod";
import { database, usesDatabase } from "../../../../server/database/client";
import { categoryPage } from "../../../../server/database/category-repository";
import { getCatalog, getManifest } from "../../../../server/catalogs";
const schema = z.object({
  q: z.string().max(100).default(""),
  department: z.string().max(100).default(""),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const parsed = schema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success)
    return Response.json({ error: "Filtros inválidos" }, { status: 400 });
  try {
    if (!(await getManifest()).some((item) => item.slug === slug))
      return Response.json({ error: "Coleção não encontrada" }, { status: 404 });
    if (usesDatabase())
      return Response.json(
        await categoryPage(
          database(),
          slug,
          parsed.data.q,
          parsed.data.department,
          parsed.data.page,
        ),
      );
    const catalog = await getCatalog(slug);
    const categories = (catalog?.pagination.categories || []).filter((item) =>
      item.name.toLowerCase().includes(parsed.data.q.toLowerCase()),
    );
    return Response.json({
      departments: [
        {
          id: "outros",
          label: "Categorias",
          count: catalog?.pagination.total || 0,
        },
      ],
      categories: categories.slice(
        (parsed.data.page - 1) * 30,
        parsed.data.page * 30,
      ),
      page: parsed.data.page,
      pages: Math.max(1, Math.ceil(categories.length / 30)),
      total: categories.length,
    });
  } catch {
    return Response.json(
      { error: "Categorias indisponíveis." },
      { status: 503 },
    );
  }
}
