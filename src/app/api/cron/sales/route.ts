import { timingSafeEqual } from "node:crypto";
import { salesReady } from "../../../../server/sales/config";
import { syncSalesPage } from "../../../../server/sales/sync";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32)
    return new Response("Agendamento não configurado.", { status: 503 });
  const actual = Buffer.from(request.headers.get("authorization") || ""),
    expected = Buffer.from(`Bearer ${secret}`);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return new Response("Não autorizado.", { status: 401 });
  if (!salesReady())
    return new Response("Vendas não configuradas.", { status: 503 });
  try {
    const result = await syncSalesPage();
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return new Response("Falha na atualização; repita para retomar.", {
      status: 503,
    });
  }
}
