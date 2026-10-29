import { apiSession } from "../../../../server/auth/session";
import { salesClient } from "../../../../server/sales/config";
import {
  analyticsFailure,
  readShopifyAnalytics,
} from "../../../../server/sales/analytics";
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
  } catch (error) {
    const failure = analyticsFailure(error);
    console.error("Shopify Analytics:", failure.code);
    return Response.json(failure, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
