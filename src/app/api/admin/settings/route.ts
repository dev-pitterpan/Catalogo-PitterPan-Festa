import { z } from "zod";
import { apiSession, sameOrigin } from "../../../../server/auth/session";
import { database } from "../../../../server/database/client";
export const schema = z
  .object({
    low: z.number().int().min(0).max(100000),
    high: z.number().int().max(1000000),
  })
  .refine((v) => v.high > v.low);
export async function POST(request: Request) {
  const auth = await apiSession(["admin"]);
  if (auth.error) return auth.error;
  if (!sameOrigin(request))
    return Response.json({ error: "Solicitação inválida." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      {
        error:
          "Use limites inteiros. Estoque alto precisa ser maior que estoque baixo.",
      },
      { status: 400 },
    );
  if (!process.env.DATABASE_URL)
    return Response.json(
      { error: "Prepare o banco para salvar preferências." },
      { status: 503 },
    );
  const connection = await database()
    .connect()
    .catch(() => null);
  if (!connection)
    return Response.json({ error: "Banco indisponível." }, { status: 503 });
  try {
    await connection.query("BEGIN");
    await connection.query(
      "UPDATE pitterpan_admin_settings SET low_stock=$1,high_stock=$2 WHERE singleton=true",
      [parsed.data.low, parsed.data.high],
    );
    await connection.query(
      "INSERT INTO pitterpan_admin_events(actor,action,details) VALUES($1,'settings.updated',$2)",
      [auth.session.email, JSON.stringify(parsed.data)],
    );
    await connection.query("COMMIT");
    return Response.json({ ok: true });
  } catch {
    await connection.query("ROLLBACK").catch(() => {});
    return Response.json(
      { error: "Não foi possível salvar as preferências." },
      { status: 503 },
    );
  } finally {
    connection.release();
  }
}
