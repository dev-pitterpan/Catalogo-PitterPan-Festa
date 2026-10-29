import { start, getRun } from "workflow/api";
import { apiSession, sameOrigin } from "../../../../server/auth/session";
import { database } from "../../../../server/database/client";
import { ShopifyClient } from "../../../../server/shopify/client";
import { salesReady } from "../../../../server/sales/config";
import {
  ensureJobs,
  reserveJob,
  syncStatus,
  failJob,
} from "../../../../server/sync/jobs";
import { shopifySync } from "../../../../workflows/shopify-sync";
export const maxDuration = 60;
const headers = { "Cache-Control": "no-store" };
export async function GET() {
  const auth = await apiSession(["admin"]);
  if (auth.error) return auth.error;
  try {
    await ensureJobs();
    await database().query(
      "UPDATE pitterpan_sync_jobs SET status='failed',error='A execução excedeu o tempo de acompanhamento. Inicie novamente.',finished_at=now(),updated_at=now() WHERE status IN ('queued','running') AND (started_at<now()-interval '3 hours' OR (workflow_id IS NULL AND started_at<now()-interval '10 minutes'))",
    );
    const status = await syncStatus();
    if (
      status.job &&
      ["queued", "running"].includes(String(status.job.status))
    ) {
      const run = (
        await database().query<{ workflow_id: string | null }>(
          "SELECT workflow_id FROM pitterpan_sync_jobs WHERE id=$1",
          [status.job.id],
        )
      ).rows[0]?.workflow_id;
      if (run) {
        const state = await getRun(run).status;
        if (["failed", "cancelled", "canceled"].includes(state)) {
          await failJob(
            String(status.job.id),
            "A execução foi interrompida. Você pode iniciar uma nova sincronização.",
          );
          return Response.json(await syncStatus(), { headers });
        }
      }
    }
    return Response.json(status, { headers });
  } catch {
    return Response.json(
      {
        error:
          "Não foi possível consultar a sincronização. Confira a conexão com o banco.",
      },
      { status: 503, headers },
    );
  }
}
export async function POST(request: Request) {
  const auth = await apiSession(["admin"]);
  if (auth.error) return auth.error;
  if (!sameOrigin(request))
    return Response.json(
      { error: "Origem não autorizada." },
      { status: 403, headers },
    );
  if (!salesReady())
    return Response.json(
      {
        error:
          "Configure a integração de pedidos e o banco antes de sincronizar.",
      },
      { status: 503, headers },
    );
  try {
    new ShopifyClient();
  } catch {
    return Response.json(
      { error: "Configure a integração de produtos da Shopify." },
      { status: 503, headers },
    );
  }
  if (process.env.VERCEL && !process.env.VERCEL_DEPLOYMENT_ID)
    return Response.json(
      {
        error:
          "Ative as variáveis de sistema na Vercel e publique novamente para executar em segundo plano.",
      },
      { status: 503, headers },
    );
  let id: string | null = null;
  let dispatched = false;
  try {
    await ensureJobs();
    id = await reserveJob(database(), auth.session.email);
    if (!id) return Response.json(await syncStatus(), { status: 202, headers });
    const run = await start(shopifySync, [id]);
    dispatched = true;
    await database().query(
      "UPDATE pitterpan_sync_jobs SET workflow_id=$2 WHERE id=$1 AND workflow_id IS NULL",
      [id, run.runId],
    );
    return Response.json(await syncStatus(), { status: 202, headers });
  } catch {
    if (id && !dispatched)
      await database()
        .query(
          "UPDATE pitterpan_sync_jobs SET status='failed',error='Não foi possível iniciar a sincronização. Tente novamente.',updated_at=now(),finished_at=now() WHERE id=$1 AND status='queued' AND workflow_id IS NULL",
          [id],
        )
        .catch(() => {});
    return Response.json(
      {
        error:
          "Não foi possível iniciar a atualização. Confira as integrações e tente novamente.",
      },
      { status: 503, headers },
    );
  }
}
