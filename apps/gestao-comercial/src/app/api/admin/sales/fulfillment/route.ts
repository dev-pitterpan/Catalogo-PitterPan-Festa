import { z } from "zod";
import { apiSession } from "@shared/server/auth/session";
import { database } from "@shared/server/database/client";
import {
  salesClient,
  salesConfig,
  salesReady,
} from "@shared/server/sales/config";
import { readFulfillmentDetails } from "@shared/server/sales/fulfillment-details";
export const maxDuration = 60;
const headers = { "Cache-Control": "no-store" };
export async function GET(request: Request) {
  const auth = await apiSession(["admin", "gestor"]);
  if (auth.error) return auth.error;
  const id = z
    .string()
    .max(100)
    .regex(/^gid:\/\/shopify\/Order\/[0-9]+$/)
    .safeParse(new URL(request.url).searchParams.get("id"));
  if (!id.success)
    return Response.json(
      { error: "Pedido inválido." },
      { status: 400, headers },
    );
  if (!salesReady())
    return Response.json(
      { error: "Conexão de vendas indisponível." },
      { status: 503, headers },
    );
  try {
    const exists = await database().query(
      "SELECT 1 FROM pitterpan_sales_orders WHERE store=$1 AND id=$2 AND NOT test",
      [salesConfig().SHOPIFY_SALES_STORE_DOMAIN, id.data],
    );
    if (!exists.rows.length)
      return Response.json(
        { error: "Pedido não encontrado no histórico sincronizado." },
        { status: 404, headers },
      );
    return Response.json(await readFulfillmentDetails(salesClient(), id.data), {
      headers,
    });
  } catch {
    return Response.json(
      {
        error:
          "Não foi possível conferir os itens agora. O pedido pode ter sido atualizado; tente novamente e confira o acesso do app aos pedidos.",
      },
      { status: 503, headers },
    );
  }
}
