import {
  readShopifyReport,
  readShopifyOverview,
} from "../../../../server/sales/reports";
import { reportById } from "../../../../lib/admin/shopify-reports";
import { dateRangeSchema } from "../../../../lib/admin/date-range";
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
  const params = new URL(request.url).searchParams;
  const range = dateRangeSchema.safeParse({
    start: params.get("start") || "",
    end: params.get("end") || "",
  });
  if (!range.success)
    return Response.json({ error: "Período inválido." }, { status: 400 });
  const days = Number(params.get("days") || 30);
  if (![1, 7, 30, 60].includes(days))
    return Response.json({ error: "Período inválido." }, { status: 400 });
  const report = params.get("report");
  if (report && !reportById(report))
    return Response.json({ error: "Relatório inválido." }, { status: 400 });
  try {
    if (params.get("overview") === "1" && !report)
      return Response.json(
        await readShopifyOverview(salesClient(), days, range.data),
        { headers: { "Cache-Control": "no-store" } },
      );
    if (report)
      return Response.json(
        await readShopifyReport(salesClient(), report, days, range.data),
        { headers: { "Cache-Control": "no-store" } },
      );
    return Response.json(
      await readShopifyAnalytics(salesClient(), days, new Date(), range.data),
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    const failure = analyticsFailure(error);
    console.error("Shopify Analytics:", failure.code);
    return Response.json(failure, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
