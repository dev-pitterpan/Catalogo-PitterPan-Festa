import { existsSync } from "node:fs";
import { z } from "zod";
import { database } from "../src/server/database/client.ts";
if (existsSync(new URL("../.env", import.meta.url)))
  process.loadEnvFile(new URL("../.env", import.meta.url));
const db = database();
try {
  const argument = process.argv[2];
  const result = argument
    ? await db.query(
        "SELECT id,status,report FROM catalog_imports WHERE id=$1",
        [z.uuid().parse(argument)],
      )
    : await db.query(
        "SELECT id,status,report FROM catalog_imports ORDER BY started_at DESC LIMIT 1",
      );
  const run = result.rows[0];
  if (!run) throw new Error("Nenhuma importação encontrada.");
  const categories = await db.query(
    "SELECT category,count(*)::int AS variants FROM catalog_items WHERE import_id=$1 GROUP BY category ORDER BY category",
    [run.id],
  );
  const collections = await db.query(
    "SELECT DISTINCT data->>'id' AS id,data->>'title' AS title FROM catalog_raw WHERE import_id=$1 AND data->>'id' LIKE 'gid://shopify/Collection/%' ORDER BY title",
    [run.id],
  );
  console.log(
    JSON.stringify(
      { ...run, categories: categories.rows, collections: collections.rows },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(
    error instanceof z.ZodError
      ? "Identificador de importação inválido."
      : error instanceof Error
        ? error.message
        : "Falha ao consultar relatório.",
  );
  process.exitCode = 1;
} finally {
  await db.end();
}
