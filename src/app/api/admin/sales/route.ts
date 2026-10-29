import { apiSession, sameOrigin } from "../../../../server/auth/session";
import { database } from "../../../../server/database/client";
import { salesReady, salesConfig } from "../../../../server/sales/config";
import {
  salesFilterSchema,
  decodeOrderCursor,
} from "../../../../server/sales/filters";
import {
  readSalesOrders,
  readSales,
} from "../../../../server/sales/repository";
import { syncSalesPage } from "../../../../server/sales/sync";
export const runtime = "nodejs";
export const maxDuration = 300;
const unavailable = () =>
  Response.json(
    {
      error:
        "Configure a conexão de vendas e execute a migração exclusiva do módulo.",
    },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
export async function GET(request: Request) {
  const auth = await apiSession(["admin", "gestor"]);
  if (auth.error) return auth.error;
  if (!salesReady()) return unavailable();
  const url = new URL(request.url),
    days = Number(url.searchParams.get("days") || 30),
    after = url.searchParams.get("after") || undefined;
  if (
    !Number.isInteger(days) ||
    ![7, 30, 60].includes(days) ||
    (after && !/^\d{1,18}$/.test(after))
  )
    return Response.json({ error: "Filtro inválido." }, { status: 400 });
  const parsed = salesFilterSchema.safeParse({
    start: url.searchParams.get("start") || "",
    end: url.searchParams.get("end") || "",
    status: url.searchParams.get("status") || "all",
    delivery: url.searchParams.get("delivery") || "all",
    category: url.searchParams.get("category") || "",
  });
  const orderCursor = url.searchParams.get("orderCursor") || undefined;
  if (
    !parsed.success ||
    (url.searchParams.has("view") && url.searchParams.get("view") !== "orders")
  )
    return Response.json({ error: "Filtro inválido." }, { status: 400 });
  try {
    decodeOrderCursor(orderCursor);
  } catch {
    return Response.json({ error: "Cursor inválido." }, { status: 400 });
  }
  try {
    const db = await database().connect();
    try {
      await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const data =
        url.searchParams.get("view") === "orders"
          ? await readSalesOrders(
              db,
              salesConfig().SHOPIFY_SALES_STORE_DOMAIN,
              days,
              parsed.data,
              orderCursor,
            )
          : await readSales(
              db,
              salesConfig().SHOPIFY_SALES_STORE_DOMAIN,
              days,
              after,
              parsed.data,
            );
      await db.query("COMMIT");
      return Response.json(data, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    } finally {
      db.release();
    }
  } catch {
    return unavailable();
  }
}
export async function POST(request: Request) {
  const auth = await apiSession(["admin", "gestor"]);
  if (auth.error) return auth.error;
  if (!sameOrigin(request))
    return Response.json({ error: "Origem inválida." }, { status: 403 });
  if (!salesReady()) return unavailable();
  try {
    const result = await syncSalesPage();
    return Response.json(result, {
      status: result.busy ? 409 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      {
        error:
          "Atualização interrompida. Dados já lidos foram preservados. Confira banco, permissões de pedidos e versão da API; tente novamente para retomar.",
      },
      { status: 503 },
    );
  }
}
