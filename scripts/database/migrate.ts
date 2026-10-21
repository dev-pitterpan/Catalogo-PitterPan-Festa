import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { database } from "../../src/server/database/client.ts";
if (existsSync(new URL("../../.env", import.meta.url)))
  process.loadEnvFile(new URL("../../.env", import.meta.url));
const db = database();
try {
  await db.query(
    await readFile(
      new URL("../../src/server/database/schema.sql", import.meta.url),
      "utf8",
    ),
  );
  console.log("Estrutura PostgreSQL criada/verificada.");
} finally {
  await db.end();
}
