import { randomUUID } from "node:crypto";
import { apiSession, sameOrigin } from "../../../../server/auth/session";
import { hashPassword } from "../../../../server/auth/crypto";
import { database } from "../../../../server/database/client";
import {
  listUsers,
  userCreateSchema,
  userUpdateSchema,
} from "../../../../server/admin/users";
export async function GET() {
  const auth = await apiSession(["admin"]);
  if (auth.error) return auth.error;
  return Response.json(await listUsers(), {
    headers: { "Cache-Control": "no-store" },
  });
}
export async function POST(request: Request) {
  const auth = await apiSession(["admin"]);
  if (auth.error) return auth.error;
  if (!sameOrigin(request))
    return Response.json({ error: "Solicitação inválida." }, { status: 403 });
  const parsed = userCreateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      {
        error: "Confira os dados. A senha deve ter entre 12 e 128 caracteres.",
      },
      { status: 400 },
    );
  if (parsed.data.email === process.env.ADMIN_EMAIL?.toLowerCase().trim())
    return Response.json(
      { error: "Este e-mail já tem acesso administrativo." },
      { status: 409 },
    );
  if (!process.env.DATABASE_URL)
    return Response.json(
      { error: "Prepare o banco antes de cadastrar a equipe." },
      { status: 503 },
    );
  const connection = await database()
    .connect()
    .catch(() => null);
  if (!connection)
    return Response.json({ error: "Banco indisponível." }, { status: 503 });
  try {
    const hash = await hashPassword(parsed.data.password);
    await connection.query("BEGIN");
    const { rows } = await connection.query(
      "INSERT INTO pitterpan_admin_users(id,name,email,role,password_hash) SELECT $1,$2,$3,$4,$5 WHERE (SELECT count(*) FROM pitterpan_admin_users)<50 RETURNING id",
      [
        randomUUID(),
        parsed.data.name,
        parsed.data.email,
        parsed.data.role,
        hash,
      ],
    );
    if (!rows.length) throw new Error("limit");
    await connection.query(
      "INSERT INTO pitterpan_admin_events(actor,action,details) VALUES($1,'user.created',$2)",
      [
        auth.session.email,
        JSON.stringify({ id: rows[0].id, role: parsed.data.role }),
      ],
    );
    await connection.query("COMMIT");
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    await connection.query("ROLLBACK").catch(() => {});
    return Response.json(
      {
        error:
          (error as { code?: string }).code === "23505"
            ? "Este e-mail já está cadastrado."
            : "Não foi possível cadastrar. Confira a preparação do banco e o limite de 50 contas.",
      },
      { status: 409 },
    );
  } finally {
    connection.release();
  }
}
export async function PATCH(request: Request) {
  const auth = await apiSession(["admin"]);
  if (auth.error) return auth.error;
  if (!sameOrigin(request))
    return Response.json({ error: "Solicitação inválida." }, { status: 403 });
  const parsed = userUpdateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json({ error: "Dados inválidos." }, { status: 400 });
  if (parsed.data.id === auth.session.sub)
    return Response.json(
      { error: "Você não pode alterar seu próprio acesso por esta tela." },
      { status: 400 },
    );
  if (!process.env.DATABASE_URL)
    return Response.json(
      { error: "Prepare o banco para atualizar acessos." },
      { status: 503 },
    );
  const connection = await database()
    .connect()
    .catch(() => null);
  if (!connection)
    return Response.json({ error: "Banco indisponível." }, { status: 503 });
  try {
    await connection.query("BEGIN");
    const { rows } = await connection.query(
      "UPDATE pitterpan_admin_users SET disabled=COALESCE($2,disabled),role=COALESCE($3,role) WHERE id=$1 RETURNING id",
      [parsed.data.id, parsed.data.disabled ?? null, parsed.data.role ?? null],
    );
    if (!rows.length) {
      await connection.query("ROLLBACK");
      return Response.json({ error: "Conta não encontrada." }, { status: 404 });
    }
    await connection.query(
      "INSERT INTO pitterpan_admin_events(actor,action,details) VALUES($1,'user.updated',$2)",
      [auth.session.email, JSON.stringify(parsed.data)],
    );
    await connection.query("COMMIT");
    return Response.json({ ok: true });
  } catch {
    await connection.query("ROLLBACK").catch(() => {});
    return Response.json(
      { error: "Não foi possível atualizar o acesso." },
      { status: 503 },
    );
  } finally {
    connection.release();
  }
}
