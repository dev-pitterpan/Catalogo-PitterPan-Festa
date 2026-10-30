import { randomBytes } from "node:crypto";
import type { SqlClient } from "../../database/catalog-repository.ts";
import { jitsiOrigin, jitsiRoom } from "../../../lib/agenda/video.ts";
import { AgendaError } from "../repository.ts";
export function videoOrigin() {
  return jitsiOrigin(process.env.JITSI_BASE_URL);
}
export async function createAppointmentRoom(
  db: SqlClient,
  origin: string,
  id: string,
  revision: number,
  actor: string,
) {
  if (jitsiOrigin(origin) !== origin)
    throw new AgendaError("Servidor de vídeo não configurado.", 503);
  await db.query("BEGIN");
  try {
    await db.query("SELECT pg_advisory_xact_lock(81643002)");
    const current = (
      await db.query<{ video_url: string; revision: number; status: string }>(
        "SELECT video_url,revision,status FROM pitterpan_appointments WHERE id=$1 FOR UPDATE",
        [id],
      )
    ).rows[0];
    if (!current) throw new AgendaError("Compromisso não encontrado.", 404);
    if (current.revision !== revision)
      throw new AgendaError(
        "Compromisso alterado. Reabra antes de criar a sala.",
      );
    if (current.status !== "scheduled")
      throw new AgendaError(
        "Reabra o compromisso como agendado para criar uma sala.",
      );
    if (current.video_url && !jitsiRoom(current.video_url, origin))
      throw new AgendaError(
        "Já existe um link de vídeo neste compromisso. Remova e salve esse link antes de criar outra sala.",
      );
    const url =
      current.video_url ||
      `${origin}/pitter-${randomBytes(24).toString("hex")}`;
    const nextRevision = current.revision + (current.video_url ? 0 : 1);
    if (!current.video_url) {
      await db.query(
        "UPDATE pitterpan_appointments SET video_url=$2,revision=revision+1,updated_at=now() WHERE id=$1",
        [id, url],
      );
      await db.query(
        "INSERT INTO pitterpan_agenda_events(actor,action,entity_id) VALUES($1,'appointment.video.created',$2)",
        [actor, id],
      );
    }
    await db.query("COMMIT");
    return { video_url: url, revision: nextRevision };
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  }
}
