import { cookies } from "next/headers";
import { COOKIE_NAME } from "../../../../server/auth/crypto";
import { sameOrigin } from "../../../../server/auth/session";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Solicitação inválida." }, { status: 403 });
  (await cookies()).set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return Response.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
