import { apiSession } from "../../../../server/auth/session";
import { database } from "../../../../server/database/client";
import { salesConfig, salesReady } from "../../../../server/sales/config";
import {
  destinationFilterSchema,
  readDestinations,
} from "../../../../server/sales/destinations";
export async function GET(request: Request) {
  const auth = await apiSession(["admin", "gestor"]);
  if (auth.error) return auth.error;
  const f = destinationFilterSchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!f.success)
    return Response.json({ error: "Filtros inválidos." }, { status: 400 });
  if (!salesReady())
    return Response.json(
      { error: "Configure a integração de vendas para consultar destinos." },
      { status: 503 },
    );
  try {
    return Response.json(
      await readDestinations(
        database(),
        salesConfig().SHOPIFY_SALES_STORE_DOMAIN,
        f.data,
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      {
        error:
          "Não foi possível consultar os destinos. Verifique o banco e a migração de vendas.",
      },
      { status: 503 },
    );
  }
}
