import { localAuthEnvironment } from "./local-auth-env.ts";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { z } from "zod";
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const envPath = fileURLToPath(new URL("../.env", import.meta.url));
// Let Next load application variables itself, including updates made to .env.
// Somente o hash da senha é normalizado; alterações de senha exigem reiniciar o servidor.
const localEnv = existsSync(envPath)
  ? parseEnv(readFileSync(envPath, "utf8"))
  : {};
const command = process.argv[2];
if (command !== "dev" && command !== "start")
  throw new Error("Use dev ou start.");
const env = z
  .object({
    HOST: z.string().min(1).default("127.0.0.1"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  })
  .parse({ ...process.env, ...localEnv });
console.log(
  `Fonte do catálogo (.env): ${localEnv.CATALOG_DATA_SOURCE || process.env.CATALOG_DATA_SOURCE || "json"}`,
);
// O mesmo comando funciona em Windows e Linux, sem sintaxe de shell específica.
const child = spawn(
  process.execPath,
  [
    require.resolve("next/dist/bin/next"),
    command,
    "--hostname",
    env.HOST,
    "--port",
    String(env.PORT),
  ],
  {
    cwd: root,
    env: localAuthEnvironment(
      root,
      process.env.NODE_ENV ||
        (command === "dev" ? "development" : "production"),
    ),
    stdio: "inherit",
  },
);
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code || 0;
});
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
