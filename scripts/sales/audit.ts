import { existsSync } from "node:fs";
import { database } from "../../packages/shared/src/server/database/client.ts";
import { salesClient } from "../../packages/shared/src/server/sales/config.ts";
import { auditSalesSnapshot } from "../../packages/shared/src/server/sales/audit.ts";
import {
  todayDate,
  shiftDate,
} from "../../packages/shared/src/lib/admin/date-range.ts";
if (existsSync(".env")) process.loadEnvFile(".env");
const end = process.argv[3] || todayDate(),
  start = process.argv[2] || shiftDate(end, -59);
const pool = database();
let db;
try {
  const client = salesClient();
  db = await pool.connect();
  await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const report = await auditSalesSnapshot(
    db,
    client,
    client.domain,
    start,
    end,
  );
  await db.query("COMMIT");
  console.log(JSON.stringify(report, null, 2));
  if (!report.consistent) process.exitCode = 1;
} catch {
  if (db) await db.query("ROLLBACK").catch(() => {});
  console.error(
    "Não foi possível concluir a auditoria. Confira conexão, permissões e período. Nenhum dado foi alterado.",
  );
  process.exitCode = 1;
} finally {
  db?.release();
  await pool.end();
}
