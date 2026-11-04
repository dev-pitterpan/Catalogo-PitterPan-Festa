"use client";
import { useEffect, useRef, useState } from "react";
import { Video, LogOut, ExternalLink } from "lucide-react";
type Api = {
  dispose(): void;
  addListener(name: string, listener: () => void): void;
};
type Constructor = new (
  domain: string,
  options: Record<string, unknown>,
) => Api;
export default function MeetingRoom({
  origin,
  room,
  name,
}: {
  origin: string;
  room: string;
  name: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);
  const [joining, setJoining] = useState(false),
    [status, setStatus] = useState("");
  useEffect(() => {
    if (!joining || !container.current) return;
    let cancelled = false;
    const script = document.createElement("script");
    const timeout = setTimeout(
      () =>
        setStatus(
          "O servidor está demorando para responder. Confira sua conexão ou use Abrir em outra aba.",
        ),
      20000,
    );
    script.src = `${origin}/external_api.js`;
    script.async = true;
    script.onerror = () => {
      clearTimeout(timeout);
      setStatus(
        "Não foi possível carregar o servidor de vídeo. Tente abrir a sala em outra aba.",
      );
    };
    script.onload = () => {
      if (cancelled || !container.current) return;
      try {
        const Jitsi = (
          window as unknown as { JitsiMeetExternalAPI: Constructor }
        ).JitsiMeetExternalAPI;
        api.current = new Jitsi(new URL(origin).host, {
          roomName: room,
          parentNode: container.current,
          width: "100%",
          height: "100%",
          userInfo: { displayName: name },
          configOverwrite: {
            startWithAudioMuted: true,
            startWithVideoMuted: true,
            prejoinConfig: { enabled: true },
          },
          onload: () => {
            clearTimeout(timeout);
            setStatus(
              "Sala carregada. Confira câmera e microfone e entre quando estiver pronto.",
            );
          },
        });
        api.current.addListener("videoConferenceJoined", () => {
          clearTimeout(timeout);
          setStatus("Você entrou na chamada.");
        });
        api.current.addListener("readyToClose", () => setJoining(false));
      } catch {
        clearTimeout(timeout);
        setStatus(
          "Não foi possível iniciar a sala. Confira o servidor ou abra em outra aba.",
        );
      }
    };
    document.head.append(script);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      api.current?.dispose();
      api.current = null;
      script.remove();
    };
  }, [joining, origin, room, name]);
  return (
    <section className="admin-panel agenda-video-room">
      <div className="agenda-video-actions">
        <button
          className="admin-button"
          onClick={() => {
            setStatus(
              joining
                ? "Chamada encerrada neste navegador."
                : "Conectando ao servidor de vídeo…",
            );
            setJoining(!joining);
          }}
        >
          {joining ? <LogOut size={16} /> : <Video size={16} />}{" "}
          {joining ? "Sair da chamada" : "Entrar na chamada"}
        </button>
        <a
          className="admin-text-link"
          href={`${origin}/${room}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink size={15} /> Abrir em outra aba
        </a>
      </div>
      <p className="agenda-hint" role="status">
        {status ||
          "A câmera e o microfone só serão solicitados ao entrar. O servidor pode pedir a identificação do organizador."}
      </p>
      {joining && <div ref={container} className="agenda-video-frame" />}
      {!joining && (
        <div className="agenda-video-placeholder">
          <Video size={40} />
          <strong>Sua conversa começa aqui</strong>
          <span>Confira os participantes e entre no horário combinado.</span>
        </div>
      )}
    </section>
  );
}
