import { createHmac } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { database } from "../database/client";
import {
  allowed,
  authSecret,
  COOKIE_NAME,
  credentialVersion,
  verifySession,
  type Role,
} from "./crypto";
export function authConfigured() {
  return (
    !!process.env.ADMIN_EMAIL &&
    /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(
      process.env.ADMIN_PASSWORD_HASH || "",
    ) &&
    (process.env.ADMIN_SESSION_SECRET?.length || 0) >= 32
  );
}
/** A assinatura não basta: alteração da senha/conta revoga sessões existentes. */
export const currentSession = cache(async () => {
  if (!authConfigured()) return null;
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = verifySession(token);
  if (!session) return null;
  if (session.sub === "bootstrap") {
    if (
      session.email !== process.env.ADMIN_EMAIL?.toLowerCase().trim() ||
      session.version !== credentialVersion(process.env.ADMIN_PASSWORD_HASH!)
    )
      return null;
    return { ...session, role: "admin" as const };
  }
  if (!process.env.DATABASE_URL) return null;
  try {
    const { rows } = await database().query<{
      email: string;
      name: string;
      role: Role;
      password_hash: string;
      disabled: boolean;
    }>(
      "SELECT email,name,role,password_hash,disabled FROM pitterpan_admin_users WHERE id=$1",
      [session.sub],
    );
    const user = rows[0];
    if (
      !user ||
      user.disabled ||
      credentialVersion(user.password_hash) !== session.version
    )
      return null;
    return { ...session, email: user.email, name: user.name, role: user.role };
  } catch {
    return null;
  }
});
export async function requireSession(
  permitted: readonly Role[] = ["admin", "gestor", "atendimento"],
) {
  const session = await currentSession();
  if (!session) redirect("/login/");
  if (!allowed(session.role, permitted)) redirect("/gestor/");
  return session;
}
export async function apiSession(
  permitted: readonly Role[] = ["admin", "gestor", "atendimento"],
) {
  const session = await currentSession();
  if (!session)
    return {
      error: Response.json(
        { error: "Entre na sua conta para continuar." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      ),
    };
  if (!allowed(session.role, permitted))
    return {
      error: Response.json(
        { error: "Você não tem permissão para esta ação." },
        { status: 403 },
      ),
    };
  return { session };
}
export function sameOrigin(request: Request) {
  try {
    const origin = new URL(request.headers.get("origin") || "");
    const url = new URL(request.url);
    const host = request.headers.get("host") || url.host;
    const protocol =
      (
        request.headers.get("x-forwarded-proto") ||
        url.protocol.replace(":", "")
      )
        .split(",")[0]
        .trim() + ":";
    return origin.host === host && origin.protocol === protocol;
  } catch {
    return false;
  }
}
export function opaqueKey(value: string) {
  // Dados de rede não são gravados em texto puro na limitação de tentativas.
  return createHmac("sha256", authSecret()).update(value).digest("hex");
}
