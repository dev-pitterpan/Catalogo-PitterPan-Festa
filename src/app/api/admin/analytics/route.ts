import { apiSession } from "../../../../server/auth/session";
import { salesClient } from "../../../../server/sales/config";
import { readShopifyAnalytics } from "../../../../server/sales/analytics";
export const maxDuration = 60;
export async function GET(request: Request) {
  const auth = await apiSession(["admin", "gestor"]);
  if (auth.error) return auth.error;
  const days = Number(new URL(request.url).searchParams.get("days") || 30);
  if (![1, 7, 30, 60].includes(days))
    return Response.json({ error: "Período inválido." }, { status: 400 });
  try {
    return Response.json(await readShopifyAnalytics(salesClient(), days), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      {
        error:
          "Não foi possível consultar o Shopify Analytics. Confira as credenciais do app de vendas, a permissão read_reports e o acesso a dados protegidos exigido pela Shopify. Nenhuma métrica foi estimada.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
