import { existsSync } from "node:fs";
import { z } from "zod";
import { database } from "../src/server/database/client.ts";
import { publishSnapshot } from "../src/server/database/catalog-repository.ts";
if (existsSync(new URL("../.env", import.meta.url)))
  process.loadEnvFile(new URL("../.env", import.meta.url));
const run = z.uuid().parse(process.argv[2]);
const db = database();
const connection = await db.connect();
try {
  await publishSnapshot(
    connection,
    run,
    process.argv.includes("--allow-shrink"),
  );
  console.log(
    "Versão publicada. Novas consultas usarão a importação validada.",
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : "Publicação falhou.");
  process.exitCode = 1;
} finally {
  connection.release();
  await db.end();
}
