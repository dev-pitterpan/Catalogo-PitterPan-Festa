import { readJsonBody } from "../../body";
import { z } from "zod";
import { getSelectedProducts } from "../../../catalogs";
const schema = z.object({ ids: z.array(z.string().min(1).max(100)).max(100) });
export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    if (body.response) return body.response;
    const parsed = schema.safeParse(body.value);
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
