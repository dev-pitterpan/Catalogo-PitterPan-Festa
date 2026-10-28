import { existsSync } from "node:fs";
import { database } from "../../src/server/database/client.ts";
import { salesConfig } from "../../src/server/sales/config.ts";
if (existsSync(".env")) process.loadEnvFile(".env");
const db = database();
try {
  const result = await db.query(
    "UPDATE pitterpan_sales_inbox SET attempts=0,retry_at=now() WHERE store=$1 AND done_at IS NULL AND attempts>=10 RETURNING delivery_id",
    [salesConfig().SHOPIFY_SALES_STORE_DOMAIN],
  );
  console.log(
    `${result.rows.length} eventos recolocados na fila. Execute sales:sync após corrigir a causa da falha.`,
  );
} finally {
  await db.end();
}
