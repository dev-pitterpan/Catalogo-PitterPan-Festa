import { Pool } from "pg";

const globalPool = globalThis as typeof globalThis & { catalogPool?: Pool };
/** Conexão pequena; use a URL com pooler do PostgreSQL na Vercel. TLS vem da URL. */
export function database() {
  if (!process.env.DATABASE_URL)
    throw new Error("Configure DATABASE_URL para usar o catálogo PostgreSQL.");
  return (globalPool.catalogPool ||= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 20_000,
    statement_timeout: 20_000,
  }));
}
export function usesDatabase() {
  const source = process.env.CATALOG_DATA_SOURCE || "json";
  if (!["json", "postgres"].includes(source))
    throw new Error("CATALOG_DATA_SOURCE deve ser json ou postgres.");
  return source === "postgres";
}
