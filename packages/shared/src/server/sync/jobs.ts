import { randomUUID } from "node:crypto";
import { database } from "../database/client.ts";
import type { SqlClient } from "../database/catalog-repository.ts";
export const jobSchema = `CREATE TABLE IF NOT EXISTS pitterpan_sync_jobs (
 id uuid PRIMARY KEY, status text NOT NULL DEFAULT 'queued', phase text NOT NULL DEFAULT 'queued',
 actor text NOT NULL, workflow_id text, base_import uuid, variants integer NOT NULL DEFAULT 0,
 records integer NOT NULL DEFAULT 0, orders integer NOT NULL DEFAULT 0, error text,
 started_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS pitterpan_sync_one_active ON pitterpan_sync_jobs ((true)) WHERE status IN ('queued','running');`;
export async function ensureJobs(db: SqlClient = database()) {
  for (const statement of jobSchema.split(";").filter((s) => s.trim()))
    await db.query(statement);
}
export async function reserveJob(
  db: SqlClient,
  actor: string,
  id = randomUUID(),
) {
  const result = await db.query<{ id: string }>(
    `INSERT INTO pitterpan_sync_jobs(id,actor,base_import)
  VALUES($1,$2,(SELECT active_import FROM catalog_state WHERE singleton=true)) ON CONFLICT DO NOTHING RETURNING id`,
    [id, actor],
  );
  return result.rows[0]?.id || null;
}
export async function syncStatus(db: SqlClient = database()) {
  const job = await db.query(
    `SELECT id,status,phase,variants,records,orders,error,started_at,updated_at,finished_at FROM pitterpan_sync_jobs ORDER BY started_at DESC LIMIT 1`,
  );
  const last = await db.query(
    `SELECT completed_at FROM catalog_imports WHERE status='active' LIMIT 1`,
  );
  return {
    job: job.rows[0] || null,
    lastUpdated: last.rows[0]?.completed_at || null,
  };
}
export async function progress(
  id: string,
  phase: string,
  counts: { records?: number; variants?: number; orders?: number } = {},
) {
  const result = await database().query(
    `UPDATE pitterpan_sync_jobs SET status='running',phase=$2,records=COALESCE($3,records),variants=COALESCE($4,variants),orders=COALESCE($5,orders),updated_at=now() WHERE id=$1 AND status IN ('queued','running') RETURNING id`,
    [
      id,
      phase,
      counts.records ?? null,
      counts.variants ?? null,
      counts.orders ?? null,
    ],
  );
  if (!result.rows.length) throw new Error("Execução encerrada.");
}
export async function failJob(id: string, message: string) {
  await database().query(
    `UPDATE pitterpan_sync_jobs SET status='failed',error=$2,updated_at=now(),finished_at=now() WHERE id=$1 AND status IN ('queued','running')`,
    [id, message],
  );
}
