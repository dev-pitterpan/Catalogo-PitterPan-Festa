import { readJsonBody } from "@shared/server/http/body";
import { z } from "zod";
import { apiSession, sameOrigin } from "@shared/server/auth/session";
import { database } from "@shared/server/database/client";
import { AgendaError } from "@shared/server/agenda/repository";
import {
  createAppointmentRoom,
  videoOrigin,
} from "@shared/server/agenda/video/rooms";
const headers = { "Cache-Control": "no-store" };
export async function GET() {
  const auth = await apiSession(["admin", "gestor"]);
  if (auth.error) return auth.error;
  return Response.json({ configured: !!videoOrigin() }, { headers });
}
export async function POST(request: Request) {
  const auth = await apiSession(["admin", "gestor"]);
  if (auth.error) return auth.error;
  if (!sameOrigin(request))
    return Response.json(
      { error: "Solicitação inválida." },
      { status: 403, headers },
    );
  const body = await readJsonBody(request, 2000);
  if (body.response) return body.response;
  const input = z
    .object({ id: z.uuid(), revision: z.number().int().positive() })
    .safeParse(body.value);
  if (!input.success)
    return Response.json(
      { error: "Reabra um compromisso salvo para criar a sala." },
      { status: 400, headers },
    );
  const origin = videoOrigin();
  if (!origin)
    return Response.json(
      { error: "O servidor de videochamadas ainda não foi configurado." },
      { status: 503, headers },
    );
  try {
    const db = await database().connect();
    try {
      return Response.json(
        await createAppointmentRoom(
          db,
          origin,
          input.data.id,
          input.data.revision,
          auth.session.email,
        ),
        { headers },
      );
    } finally {
      db.release();
    }
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof AgendaError
            ? e.message
            : "Não foi possível preparar a sala. Tente novamente.",
      },
      { status: e instanceof AgendaError ? e.status : 503, headers },
    );
  }
}
