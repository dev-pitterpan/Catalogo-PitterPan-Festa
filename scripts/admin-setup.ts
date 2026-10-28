import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { hashPassword } from "../src/server/auth/crypto.ts";
if (!process.stdin.isTTY) {
  console.error("Execute npm run admin:setup em um terminal interativo.");
  process.exit(1);
}
const prompt = createInterface({
  input: process.stdin,
  output: process.stdout,
});
const email = (await prompt.question("E-mail do administrador: "))
  .trim()
  .toLowerCase();
const name =
  (await prompt.question("Nome para exibição: ")).trim() || "Administrador";
prompt.close();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("E-mail inválido.");
  process.exit(1);
}
process.stdout.write("Senha (12 a 128 caracteres; não será exibida): ");
const hiddenOutput = new Writable({
  write(_chunk, _encoding, callback) {
    callback();
  },
});
const secretPrompt = createInterface({
  input: process.stdin,
  output: hiddenOutput,
  terminal: true,
});
const password = await secretPrompt.question("");
process.stdout.write("\nConfirme a senha: ");
const confirm = await secretPrompt.question("");
secretPrompt.close();
process.stdout.write("\n");
if (password !== confirm) {
  console.error("As senhas não coincidem. Nenhuma alteração foi feita.");
  process.exit(1);
}
const hash = await hashPassword(password);
const path = new URL("../.env", import.meta.url);
let content = existsSync(path) ? await readFile(path, "utf8") : "";
const values = {
  ADMIN_EMAIL: email,
  ADMIN_NAME: name,
  ADMIN_PASSWORD_HASH: hash,
  ADMIN_SESSION_SECRET: randomBytes(48).toString("hex"),
};
for (const [key, value] of Object.entries(values)) {
  const line = `${key}=${JSON.stringify(value)}`;
  const regex = new RegExp(`^${key}=.*$`, "m");
  content = regex.test(content)
    ? content.replace(regex, () => line)
    : content.replace(/\s*$/, "") + "\n" + line + "\n";
}
await writeFile(path, content, { mode: 0o600 });
console.log(
  "Administrador configurado no .env local. Senha e chaves não foram exibidas.",
);
console.log(
  "Na Vercel, cadastre ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD_HASH e ADMIN_SESSION_SECRET em Environment Variables e faça um novo deploy.",
);
console.log(
  "Não envie o .env ao GitHub. Alterar estes valores revoga sessões da conta principal.",
);
