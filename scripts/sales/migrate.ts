import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { database } from "../../src/server/database/client.ts";
if (existsSync(".env")) process.loadEnvFile(".env");
const pool = database();
try {
  await pool.query(
    await readFile(
      new URL("../../src/server/sales/schema.sql", import.meta.url),
      "utf8",
    ),
  );
  console.log(
    "Estrutura exclusiva de vendas criada/verificada. Catálogos existentes preservados.",
  );
} finally {
  await pool.end();
}
