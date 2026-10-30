import { notFound } from "next/navigation";
import { z } from "zod";
import { requireSession } from "../../../../../server/auth/session";
import { database } from "../../../../../server/database/client";
import { videoOrigin } from "../../../../../server/agenda/video/rooms";
import { jitsiRoom } from "../../../../../lib/agenda/video";
import MeetingRoom from "../../../../../components/admin/agenda/video/MeetingRoom";
import { PageHeading } from "../../../../../components/admin/Primitives";
import "../../../../../styles/admin/agenda.css";
export default async function MeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession(["admin", "gestor"]);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const appointment = await database()
    .query<{ title: string; video_url: string; status: string }>(
      "SELECT title,video_url,status FROM pitterpan_appointments WHERE id=$1",
      [id],
    )
    .then((r) => r.rows[0])
    .catch(() => null);
  if (!appointment) notFound();
  const origin = videoOrigin(),
    room = jitsiRoom(appointment.video_url, origin);
  return (
    <>
      <PageHeading
        eyebrow="AGENDA E FORNECEDORES"
        title={appointment.title}
        description="Reúna sua equipe e fornecedores em uma conversa por vídeo."
      />
      <a className="admin-text-link" href="/gestor/agenda/">
        ← Voltar para a agenda
      </a>
      {appointment.status !== "scheduled" ? (
        <section className="admin-panel">
          <p>
            Este compromisso foi concluído ou cancelado. Reabra o agendamento
            antes de entrar na chamada.
          </p>
        </section>
      ) : origin && room ? (
        <MeetingRoom origin={origin} room={room} name={session.name} />
      ) : (
        <section className="admin-panel">
          <p>
            {appointment.video_url
              ? "Esta reunião utiliza um link externo ou um servidor diferente do configurado."
              : "Esta reunião ainda não possui sala de vídeo."}
          </p>
          {appointment.video_url && (
            <a
              className="admin-button"
              href={appointment.video_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir link da reunião
            </a>
          )}
        </section>
      )}
    </>
  );
}
