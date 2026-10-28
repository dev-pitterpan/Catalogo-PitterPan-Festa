import { readFile, writeFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { randomBytes } from "node:crypto";
const source = parseEnv(
  (await readFile(".env.shopify-test.local", "utf8")).replace(/^\uFEFF/, ""),
);
if (
  !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(
    source.SHOPIFY_STORE_DOMAIN || "",
  ) ||
  !source.SHOPIFY_CLIENT_ID?.trim() ||
  !source.SHOPIFY_CLIENT_SECRET?.trim()
)
  throw new Error(
    "Preencha o arquivo privado .env.shopify-test.local que já foi testado.",
  );
let text = "";
try {
  text = (await readFile(".env", "utf8")).replace(/^\uFEFF/, "");
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
const existing = parseEnv(text);
const additions: Record<string, string> = {
  SHOPIFY_SALES_STORE_DOMAIN: source.SHOPIFY_STORE_DOMAIN!,
  SHOPIFY_SALES_CLIENT_ID: source.SHOPIFY_CLIENT_ID,
  SHOPIFY_SALES_CLIENT_SECRET: source.SHOPIFY_CLIENT_SECRET,
  SHOPIFY_SALES_API_VERSION: source.SHOPIFY_API_VERSION || "2026-10",
  CRON_SECRET: existing.CRON_SECRET || randomBytes(32).toString("hex"),
};
for (const [key, value] of Object.entries(additions)) {
  if (existing[key]?.trim() && existing[key] !== value)
    throw new Error(
      `A variável ${key} já tem outro valor. Nenhuma alteração foi salva.`,
    );
  const line = `${key}=${JSON.stringify(value)}`;
  const pattern = new RegExp(`^(?:export\\s+)?${key}\\s*=.*$`, "gm");
  if (pattern.test(text)) text = text.replace(pattern, () => line);
  else text += `\n${line}\n`;
}
await writeFile(".env", text, { mode: 0o600 });
console.log(
  "Conexão de vendas configurada no .env sem alterar SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET ou o token do catálogo. Valores privados não foram exibidos.",
);
console.log(
  "DATABASE_URL deve apontar para o banco exclusivo deste catálogo. Depois: npm run sales:migrate e npm run sales:sync.",
);
