import {
  beginCatalog,
  catalogReady,
  downloadCatalog,
  normalizeCatalogPage,
  completeCatalog,
} from "../server/sync/catalog";
import { revalidateTag } from "next/cache";
import { database } from "../server/database/client";
import { progress, failJob } from "../server/sync/jobs";
import { syncSalesPage } from "../server/sales/sync";
import { getWorkflowMetadata, FatalError } from "workflow";
export async function begin(id: string) {
  "use step";
  const db = database();
  const claimed = await db.query(
    "UPDATE pitterpan_sync_jobs SET workflow_id=$2,status='running',updated_at=now() WHERE id=$1 AND status IN ('queued','running') AND (workflow_id IS NULL OR workflow_id=$2) RETURNING id",
    [id, getWorkflowMetadata().workflowRunId],
  );
  if (!claimed.rows.length)
    throw new FatalError("Execução encerrada ou já assumida.");
  await beginCatalog(id);
}
begin.maxRetries = 0;
export async function ready(id: string) {
  "use step";
  return catalogReady(id);
}
export async function download(id: string) {
  "use step";
  await downloadCatalog(id);
}
export async function products(id: string, cursor: number) {
  "use step";
  return normalizeCatalogPage(id, cursor);
}
export async function orders(id: string) {
  "use step";
  await progress(id, "orders");
  const result = await syncSalesPage();
  const count = await database().query<{ n: number }>(
    "SELECT count(*)::int AS n FROM pitterpan_sales_orders WHERE store=$2 AND imported_at>=(SELECT started_at FROM pitterpan_sync_jobs WHERE id=$1)",
    [id, process.env.SHOPIFY_SALES_STORE_DOMAIN],
  );
  await progress(id, "orders", { orders: count.rows[0]?.n || 0 });
  return result;
}
export async function publish(id: string) {
  "use step";
  try {
    await completeCatalog(id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (
      message.includes("Queda superior a 20%") ||
      message.includes("versão ativa mudou") ||
      message.includes("loja difere")
    ) {
      await failJob(
        id,
        message.includes("20%")
          ? "A atualização trouxe uma redução superior a 20% nos produtos ou em uma coleção. A publicação foi bloqueada para conferência; o catálogo atual foi mantido."
          : message.includes("versão ativa mudou")
            ? "Outro administrador publicou uma atualização durante o processo. Inicie novamente para usar a versão mais recente."
            : "A loja da importação difere do catálogo publicado. Confira as credenciais antes de sincronizar.",
      );
      throw new FatalError("Publicação bloqueada pela validação.");
    }
    throw error;
  }
  revalidateTag("shopify-catalog", { expire: 0 });
}
export async function finish(id: string) {
  "use step";
  await database().query(
    "UPDATE pitterpan_sync_jobs SET status='completed',phase='completed',updated_at=now(),finished_at=now() WHERE id=$1 AND status='running'",
    [id],
  );
}
export async function fail(id: string) {
  "use step";
  const owner = await database().query<{ workflow_id: string | null }>(
    "SELECT workflow_id FROM pitterpan_sync_jobs WHERE id=$1",
    [id],
  );
  if (
    owner.rows[0]?.workflow_id &&
    owner.rows[0].workflow_id !== getWorkflowMetadata().workflowRunId
  )
    return;
  await failJob(
    id,
    "Não foi possível concluir a atualização. Os dados disponíveis continuam acessíveis. Tente novamente; se persistir, peça ao administrador para conferir a integração.",
  );
  await database().query(
    "UPDATE catalog_imports SET status='failed' WHERE id=$1 AND status='loading'",
    [id],
  );
}
