import { spawn } from "node:child_process";
import { cp, mkdir } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { parseEnv } from "node:util";
import { localAuthEnvironment } from "./local-auth-env.ts";

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const [application, command] = process.argv.slice(2);
if (
  !["catalogo-digital", "gestao-comercial"].includes(application) ||
  !["dev", "build", "start"].includes(command)
) {
  throw new Error(
    "Use: node scripts/run-app.ts catalogo-digital|gestao-comercial dev|build|start",
  );
}
const directory = join(root, "apps", application);
// Materializa recursos compartilhados, sem links simbólicos (compatível com Windows).
// Também executado antes de start para instalações que recebem somente o build.
for (const resource of ["public", "config"]) {
  await mkdir(join(directory, resource), { recursive: true });
  await cp(join(root, resource), join(directory, resource), {
    recursive: true,
    force: true,
  });
}
// A aplicação tem suas próprias variáveis. O .env da raiz é apenas compatibilidade local.
const mode = command === "dev" ? "development" : "production";
const read = (path: string) =>
  existsSync(path) ? parseEnv(readFileSync(path, "utf8")) : {};
const applicationEnv = { ...read(join(root, ".env")) };
delete applicationEnv.PORT;
for (const filename of [
  ".env",
  `.env.${mode}`,
  ".env.local",
  `.env.${mode}.local`,
]) {
  Object.assign(applicationEnv, read(join(directory, filename)));
}
const environment = localAuthEnvironment(directory, mode, {
  ...applicationEnv,
  ...process.env,
});
const port =
  environment.PORT || (application === "catalogo-digital" ? "3000" : "3001");
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535)
  throw new Error("PORT inválida.");
const args = [require.resolve("next/dist/bin/next"), command];
if (command !== "build")
  args.push("--hostname", environment.HOST || "127.0.0.1", "--port", port);
const child = spawn(process.execPath, args, {
  cwd: directory,
  env: environment,
  stdio: "inherit",
});
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
