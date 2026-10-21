import { z } from "zod";
import { getSelectedProducts } from "../../../server/catalogs";
const schema = z.object({ ids: z.array(z.string().min(1).max(100)).max(100) });
export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      return Response.json({ error: "Seleção inválida" }, { status: 400 });
    return Response.json(
      { products: await getSelectedProducts(parsed.data.ids) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Não foi possível atualizar os preços." },
      { status: 503 },
    );
  }
}
