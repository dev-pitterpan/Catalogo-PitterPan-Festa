import { readFile, writeFile, appendFile } from "node:fs/promises";

const templatePath = new URL("../.env.example", import.meta.url);
const envPath = new URL("../.env", import.meta.url);
const template = await readFile(templatePath, "utf8");
let existing: string;
try {
  existing = await readFile(envPath, "utf8");
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  await writeFile(envPath, template, { flag: "wx", mode: 0o600 });
  console.log(".env criado. Preencha suas credenciais localmente.");
  process.exit(0);
}

// Preserva os valores existentes e acrescenta somente chaves ausentes.
// Não imprime credenciais nem modifica o arquivo de exemplo.
const keys = new Set(
  [...existing.matchAll(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/gm)].map(
    (match) => match[1],
  ),
);
const missing: string[] = [];
let comments: string[] = [];
for (const line of template.split(/\r?\n/)) {
  if (!line.trim() || line.trimStart().startsWith("#")) {
    comments.push(line);
    continue;
  }
  const key = line.match(/^([A-Z][A-Z0-9_]*)=/)?.[1];
  if (key && !keys.has(key)) {
    missing.push(...comments, line);
    keys.add(key);
  }
  comments = [];
}
if (missing.length) {
  await appendFile(
    envPath,
    "\n# Variáveis acrescentadas pelo env:setup\n" + missing.join("\n") + "\n",
  );
  console.log(".env atualizado sem substituir os valores existentes.");
} else {
  console.log(".env já contém todas as variáveis do modelo.");
}
