import { z } from "zod";
import { cookies } from "next/headers";
import { authConfigured, sameOrigin } from "../../../../server/auth/session";
import {
  authenticate,
  consumeLoginAttempt,
} from "../../../../server/auth/login";
import {
  COOKIE_NAME,
  SESSION_SECONDS,
  safeDestination,
  signSession,
} from "../../../../server/auth/crypto";
const schema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(128),
  next: z.string().optional(),
  remember: z.boolean().default(true),
});
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Solicitação inválida." }, { status: 403 });
  if (!authConfigured())
    return Response.json(
      { error: "O acesso administrativo ainda não foi ativado." },
      { status: 503 },
    );
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: "Confira o e-mail e a senha." },
      { status: 400 },
    );
  try {
    if (!(await consumeLoginAttempt(parsed.data.email)))
      return Response.json(
        { error: "Muitas tentativas. Aguarde 15 minutos e tente novamente." },
        { status: 429, headers: { "Retry-After": "900" } },
      );
    const user = await authenticate(parsed.data.email, parsed.data.password);
    if (!user)
      return Response.json(
        { error: "E-mail ou senha inválidos." },
        { status: 401 },
      );
    (await cookies()).set(COOKIE_NAME, signSession(user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      ...(parsed.data.remember ? { maxAge: SESSION_SECONDS } : {}),
    });
    return Response.json(
      { next: safeDestination(parsed.data.next) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Não foi possível entrar agora. Tente novamente." },
      { status: 503 },
    );
  }
}
