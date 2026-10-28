import { apiSession } from "../../../../server/auth/session";
import {
  adminProducts,
  adminQuerySchema,
} from "../../../../server/admin/repository";
export async function GET(request: Request) {
  const auth = await apiSession();
  if (auth.error) return auth.error;
  const parsed = adminQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success)
    return Response.json({ error: "Filtros inválidos." }, { status: 400 });
  try {
    return Response.json(await adminProducts(parsed.data), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: "Não foi possível consultar os produtos." },
      { status: 503 },
    );
  }
}
