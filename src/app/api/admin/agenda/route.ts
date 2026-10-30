import { apiSession, sameOrigin } from "../../../../server/auth/session";
import { database } from "../../../../server/database/client";
import {
  AgendaError,
  ensureAgenda,
  readWorkspace,
  saveWorkspace,
} from "../../../../server/agenda/repository";
import { mutationSchema } from "../../../../lib/agenda/validation";
import { calendarDate, shiftDate } from "../../../../lib/admin/date-range";
const headers = { "Cache-Control": "no-store" };
async function connection() {
  if (!process.env.DATABASE_URL) throw new Error("database");
  const db = await database().connect();
  try {
    await db.query("BEGIN");
    await db.query("SELECT pg_advisory_xact_lock(81643001)");
    await ensureAgenda(db);
    await db.query("COMMIT");
    return db;
  } catch (e) {
    await db.query("ROLLBACK").catch(() => {});
    db.release();
    throw e;
  }
}
export async function GET(request: Request) {
  const auth = await apiSession(["admin", "gestor"]);
  if (auth.error) return auth.error;
  const params = new URL(request.url).searchParams;
  const start = calendarDate.safeParse(params.get("start")),
    end = calendarDate.safeParse(params.get("end"));
  if (
    !start.success ||
    !end.success ||
    start.data > end.data ||
    Date.parse(end.data) - Date.parse(start.data) > 93 * 86400000
  )
    return Response.json(
      { error: "Escolha até 93 dias." },
      { status: 400, headers },
    );
  const db = await connection().catch(() => null);
  if (!db)
    return Response.json(
      {
        error:
          "Não foi possível preparar a agenda. Verifique o banco e tente novamente.",
      },
      { status: 503, headers },
    );
  try {
    return Response.json(
      await readWorkspace(
        db,
        `${start.data}T00:00:00-03:00`,
        `${shiftDate(end.data, 1)}T00:00:00-03:00`,
      ),
      { headers },
    );
  } catch {
    return Response.json(
      { error: "Não foi possível carregar a agenda." },
      { status: 503, headers },
    );
  } finally {
    db.release();
  }
}
export async function POST(request: Request) {
  const auth = await apiSession(["admin", "gestor"]);
  if (auth.error) return auth.error;
  if (!sameOrigin(request))
    return Response.json(
      { error: "Solicitação inválida." },
      { status: 403, headers },
    );
  const body = await request.text();
  if (body.length > 1500000)
    return Response.json(
      { error: "Arquivo muito grande." },
      { status: 413, headers },
    );
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    return Response.json(
      { error: "Dados inválidos." },
      { status: 400, headers },
    );
  }
  const input = mutationSchema.safeParse(raw);
  if (!input.success)
    return Response.json(
      { error: input.error.issues[0]?.message || "Confira os dados." },
      { status: 400, headers },
    );
  const db = await connection().catch(() => null);
  if (!db)
    return Response.json(
      { error: "Banco indisponível." },
      { status: 503, headers },
    );
  try {
    return Response.json(
      await saveWorkspace(db, input.data, auth.session.email),
      { headers },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof AgendaError
            ? error.message
            : (error as { code?: string }).code === "23505"
              ? "Este código de fornecedor já existe."
              : "Não foi possível salvar. Confira os dados e tente novamente.",
      },
      { status: error instanceof AgendaError ? error.status : 409, headers },
    );
  } finally {
    db.release();
  }
}
