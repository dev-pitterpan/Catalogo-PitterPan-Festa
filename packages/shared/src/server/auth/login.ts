import { consumeLoginBucket } from "./limits";
import { database } from "../database/client";
import { credentialVersion, verifyPassword, type Role } from "./crypto";
import { authConfigured, opaqueKey } from "./session";
const buckets = new Map<string, { count: number; until: number }>();
/** Banco compartilha limite entre instâncias; memória é fallback sem banco configurado. */
export async function consumeLoginAttempt(email: string) {
  const key = opaqueKey(email.toLowerCase().trim());
  const window = Math.floor(Date.now() / 900000);
  if (process.env.DATABASE_URL) {
    try {
      return await consumeLoginBucket(database(), key, window);
    } catch (error) {
      if ((error as { code?: string }).code !== "42P01") throw error;
    }
  }
  const now = Date.now();
  for (const [key, value] of buckets)
    if (value.until <= now) buckets.delete(key);
  if (buckets.size >= 5000 && !buckets.has(key)) return false;
  const value = buckets.get(key);
  const entry =
    value && value.until > now ? value : { count: 0, until: now + 900000 };
  entry.count++;
  buckets.set(key, entry);
  return entry.count <= 8;
}
export async function authenticate(email: string, password: string) {
  if (!authConfigured()) return null;
  const normalized = email.toLowerCase().trim();
  let user:
    | {
        id: string;
        email: string;
        name: string;
        role: Role;
        password_hash: string;
        disabled?: boolean;
      }
    | undefined;
  if (normalized === process.env.ADMIN_EMAIL!.toLowerCase().trim())
    user = {
      id: "bootstrap",
      email: normalized,
      name: process.env.ADMIN_NAME || "Administrador",
      role: "admin",
      password_hash: process.env.ADMIN_PASSWORD_HASH!,
    };
  else if (process.env.DATABASE_URL) {
    try {
      user = (
        await database().query(
          "SELECT id,email,name,role,password_hash,disabled FROM pitterpan_admin_users WHERE email=$1",
          [normalized],
        )
      ).rows[0];
    } catch (error) {
      if ((error as { code?: string }).code !== "42P01") throw error;
    }
  }
  // Mesmo custo de verificação quando o usuário não existe.
  const correct = await verifyPassword(
    password,
    user?.password_hash || process.env.ADMIN_PASSWORD_HASH!,
  );
  if (!user || user.disabled || !correct) return null;
  return {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    version: credentialVersion(user.password_hash),
  };
}
