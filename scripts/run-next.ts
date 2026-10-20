import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { z } from "zod";
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const envPath = fileURLToPath(new URL("../.env", import.meta.url));
if (existsSync(envPath)) loadEnvFile(envPath);
const command = process.argv[2];
if (command !== "dev" && command !== "start")
  throw new Error("Use dev ou start.");
const env = z
  .object({
    HOST: z.string().min(1).default("127.0.0.1"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  })
  .parse(process.env);
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
  { cwd: root, env: process.env, stdio: "inherit" },
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
