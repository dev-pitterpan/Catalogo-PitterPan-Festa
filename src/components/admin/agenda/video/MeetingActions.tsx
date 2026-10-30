"use client";
import { useEffect, useState } from "react";
import { Copy, Video, MessageCircle } from "lucide-react";
import type { Appointment, Supplier } from "../../../../lib/agenda/types";
import { whatsappLink } from "../../../../lib/agenda/validation";
export default function MeetingActions({
  appointment,
  supplier,
  busy,
  onCreated,
}: {
  appointment?: Appointment;
  supplier?: Supplier;
  busy: boolean;
  onCreated: (url: string, revision: number) => void;
}) {
  const [configured, setConfigured] = useState<boolean | null>(null),
    [working, setWorking] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/agenda/video/", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((r) => setConfigured(r.configured === true))
      .catch(() => {
        if (!controller.signal.aborted) setConfigured(false);
      });
    return () => controller.abort();
  }, []);
  async function create() {
    if (!appointment) return;
    setWorking(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/agenda/video/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: appointment.id,
          revision: appointment.revision,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(result.error || "Não foi possível criar a sala.");
      onCreated(result.video_url, result.revision);
      setMessage(
        "Sala criada e salva. Se alterou data, horário ou fornecedor, salve essas alterações antes de enviar o convite.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Falha de conexão.");
    } finally {
      setWorking(false);
    }
  }
  const invite = appointment?.video_url
    ? `Convite para reunião — Pitter Pan Festas\n${appointment.title}\n${new Date(appointment.starts_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })} (Brasília)\nVideochamada: ${appointment.video_url}\nAguarde a entrada do organizador.`
    : "";
  const whatsapp =
    supplier && invite ? whatsappLink(supplier.phone, invite) : null;
  return (
    <div className="agenda-video-tools">
      <strong>
        <Video size={16} /> Videochamada no sistema
      </strong>
      {configured === false && (
        <p className="agenda-hint">
          A integração está preparada. O administrador ainda precisa configurar
          o servidor de vídeo para habilitar a criação de salas.
        </p>
      )}
      {!appointment && (
        <p className="agenda-hint">
          Salve o compromisso primeiro. Depois abra seus detalhes para criar a
          sala.
        </p>
      )}
      {appointment && !appointment.video_url && (
        <button
          type="button"
          className="admin-button"
          disabled={
            !configured || busy || working || appointment.status !== "scheduled"
          }
          onClick={() => void create()}
        >
          {working ? "Preparando…" : "Criar sala de vídeo"}
        </button>
      )}
      {appointment?.video_url && (
        <div className="agenda-video-actions">
          <a
            href={`/gestor/reunioes/${appointment.id}/`}
            className="admin-text-link"
          >
            <Video size={15} /> Entrar na reunião
          </a>
          <button
            type="button"
            className="admin-text-link"
            disabled={busy || working}
            onClick={async () => {
              try {
                if (!navigator.clipboard) throw Error("clipboard");
                await navigator.clipboard.writeText(invite);
                setMessage("Convite copiado.");
              } catch {
                setMessage(
                  "Não foi possível copiar. Copie o link no campo acima.",
                );
              }
            }}
          >
            <Copy size={15} /> Copiar convite
          </button>
          {whatsapp ? (
            <a
              className="admin-text-link"
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={15} /> Preparar no WhatsApp
            </a>
          ) : (
            <small>
              Cadastre o telefone do fornecedor para preparar o convite no
              WhatsApp.
            </small>
          )}
        </div>
      )}
      {message && (
        <p className="agenda-hint" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
