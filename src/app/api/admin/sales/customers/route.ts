import { z } from "zod";
import { apiSession, sameOrigin } from "../../../../../server/auth/session";
import { database } from "../../../../../server/database/client";
import { salesReady, salesClient } from "../../../../../server/sales/config";
import {
  ensureOrderCustomers,
  refreshOrderCustomers,
} from "../../../../../server/sales/customers";
export const maxDuration = 300;
export async function POST(request: Request) {
  const auth = await apiSession(["admin", "gestor"]);
  if (auth.error) return auth.error;
  if (!sameOrigin(request))
    return Response.json({ error: "Solicitação inválida." }, { status: 403 });
  const input = z
    .object({
      ids: z
        .array(z.string().regex(/^gid:\/\/shopify\/Order\/[0-9]+$/))
        .min(1)
        .max(10),
    })
    .safeParse(await request.json().catch(() => null));
  if (!input.success)
    return Response.json({ error: "Escolha até 10 pedidos." }, { status: 400 });
  if (!salesReady())
    return Response.json(
      { error: "Conexão de vendas indisponível." },
      { status: 503 },
    );
  try {
    const db = await database().connect();
    try {
      await ensureOrderCustomers(db);
      const api = salesClient();
      return Response.json(
        await refreshOrderCustomers(db, api, api.domain, [
          ...new Set(input.data.ids),
        ]),
        { headers: { "Cache-Control": "no-store" } },
      );
    } finally {
      db.release();
    }
  } catch {
    return Response.json(
      {
        error:
          "Não foi possível consultar os clientes. Confira a conexão e o acesso do aplicativo aos dados de clientes na Shopify.",
      },
      { status: 503 },
    );
  }
}
