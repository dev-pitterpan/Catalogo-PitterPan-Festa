import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";
const scrypt = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      64,
      { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
export const roles = [
  "admin",
  "gerente_compras",
  "gestor",
  "atendimento",
] as const;
export type Role = (typeof roles)[number];
export const SESSION_SECONDS = 8 * 60 * 60;
export const COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Host-pitterpan-session"
    : "pitterpan-session";
const payloadSchema = z.object({
  sub: z.string().min(1),
  email: z.email(),
  name: z.string(),
  role: z.enum(roles),
  version: z.string(),
  iat: z.number().int(),
  exp: z.number().int(),
  nonce: z.string(),
  audience: z.literal("pitterpan-admin"),
});
export type Session = z.infer<typeof payloadSchema>;
export function authSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET || "";
  if (secret.length < 32)
    throw new Error("Acesso administrativo não configurado.");
  return secret;
}
/** Aceita hashes antigos e a forma segura para arquivos .env (sem expansão de $). */
export function normalizePasswordHash(hash: string) {
  return hash.startsWith("scrypt:") ? hash.replaceAll(":", "$") : hash;
}
export function environmentPasswordHash(hash: string) {
  return normalizePasswordHash(hash).replaceAll("$", ":");
}
export function isPasswordHash(hash: string) {
  return /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(
    normalizePasswordHash(hash),
  );
}
export function credentialVersion(hash: string, secret = authSecret()) {
  return createHmac("sha256", secret)
    .update(normalizePasswordHash(hash))
    .digest("base64url");
}
export async function hashPassword(password: string) {
  if (password.length < 12 || password.length > 128)
    throw new Error("Use uma senha entre 12 e 128 caracteres.");
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt);
  return `scrypt$${salt}$${key.toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string) {
  encoded = normalizePasswordHash(encoded);
  if (
    password.length > 128 ||
    !/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(encoded)
  )
    return false;
  const [, salt, expected] = encoded.split("$");
  const actual = await scrypt(password, salt);
  return timingSafeEqual(actual, Buffer.from(expected, "hex"));
}
export function signSession(
  user: Pick<Session, "sub" | "email" | "name" | "role" | "version">,
  secret = authSecret(),
  now = Date.now(),
) {
  const seconds = Math.floor(now / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      ...user,
      iat: seconds,
      exp: seconds + SESSION_SECONDS,
      nonce: randomBytes(16).toString("hex"),
      audience: "pitterpan-admin",
    }),
  ).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}
export function verifySession(
  token: string,
  secret = authSecret(),
  now = Date.now(),
): Session | null {
  try {
    if (token.length > 4096) return null;
    const parts = token.split(".");
    if (
      parts.length !== 2 ||
      !/^[A-Za-z0-9_-]+$/.test(parts[0]) ||
      !/^[A-Za-z0-9_-]{43}$/.test(parts[1])
    )
      return null;
    const signature = Buffer.from(parts[1], "base64url");
    const expected = createHmac("sha256", secret).update(parts[0]).digest();
    if (
      signature.length !== expected.length ||
      !timingSafeEqual(signature, expected)
    )
      return null;
    const parsed = payloadSchema.safeParse(
      JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")),
    );
    const seconds = Math.floor(now / 1000);
    if (
      !parsed.success ||
      parsed.data.exp <= seconds ||
      parsed.data.iat > seconds + 30 ||
      parsed.data.exp - parsed.data.iat !== SESSION_SECONDS
    )
      return null;
    return parsed.data;
  } catch {
    return null;
  }
}
export function safeDestination(value: unknown) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.includes("\\")
  )
    return "/gestor/";
  try {
    const url = new URL(value, "https://local.invalid");
    if (
      url.origin !== "https://local.invalid" ||
      !(url.pathname === "/gestor" || url.pathname.startsWith("/gestor/"))
    )
      return "/gestor/";
    return url.pathname + url.search;
  } catch {
    return "/gestor/";
  }
}
export function allowed(role: Role, permitted: readonly Role[]) {
  return (
    permitted.includes(role) ||
    (role === "gerente_compras" && permitted.includes("admin"))
  );
}
