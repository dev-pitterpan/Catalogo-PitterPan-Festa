"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Sparkles } from "lucide-react";
import { SeasonalArt, type Motif } from "./SeasonalArt";

const themes: Record<
  string,
  { title: string; hero: Motif; companion: Motif; particle: Motif }
> = {
  halloween: {
    title: "Halloween",
    hero: "spider",
    companion: "bat",
    particle: "spark",
  },
  natal: { title: "Natal", hero: "santa", companion: "deer", particle: "snow" },
  "dia-das-criancas": {
    title: "Dia das Crianças",
    hero: "kite",
    companion: "balloon",
    particle: "spark",
  },
  pascoa: {
    title: "Páscoa",
    hero: "bunny",
    companion: "egg",
    particle: "spark",
  },
  "festa-junina": {
    title: "Festa Junina",
    hero: "lantern",
    companion: "flags",
    particle: "spark",
  },
};
const preferenceKey = "pitterpan_seasonal_effects_v1";

function CornerWeb() {
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="0.8">
        <path d="M0 0v190M0 0l49 184M0 0l95 165M0 0l135 135M0 0l165 95M0 0l184 49M0 0h190" />
        {[35, 70, 105, 140, 175].map((radius) => (
          <path
            key={radius}
            d={`M0 ${radius}Q${radius * 0.14} ${radius * 0.82} ${radius * 0.259} ${radius * 0.966}Q${radius * 0.35} ${radius * 0.73} ${radius * 0.5} ${radius * 0.866}Q${radius * 0.51} ${radius * 0.62} ${radius * 0.707} ${radius * 0.707}Q${radius * 0.62} ${radius * 0.51} ${radius * 0.866} ${radius * 0.5}Q${radius * 0.73} ${radius * 0.35} ${radius * 0.966} ${radius * 0.259}Q${radius * 0.82} ${radius * 0.14} ${radius} 0`}
          />
        ))}
      </g>
    </svg>
  );
}

/** Cenas curtas e esparsas. Nenhum timer ou desenho roda em abas ocultas. */
export default function SeasonalEffects({
  slug,
  suspended,
}: {
  slug: string;
  suspended: boolean;
}) {
  const theme = themes[slug];
  const rootRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(true);
  const [reduced, setReduced] = useState(true);
  const [visible, setVisible] = useState(false);
  const [scene, setScene] = useState<number | null>(null);
  const [targets, setTargets] = useState<Element[]>([]);
  const cycle = useRef(0);

  useEffect(() => {
    try {
      setEnabled(localStorage.getItem(preferenceKey) !== "off");
    } catch {
      /* Sem storage, a preferência vale nesta visita. */
    }
    cycle.current = Math.floor(Math.random() * 4);
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setReduced(media.matches);
    const syncVisibility = () => setVisible(!document.hidden);
    syncMotion();
    syncVisibility();
    media.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      media.removeEventListener("change", syncMotion);
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, []);

  useEffect(() => {
    setScene(null);
    setTargets([]);
    if (!theme || !enabled || reduced || !visible || suspended) return;
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    const start = () => {
      if (cancelled) return;
      const next = cycle.current++;
      // Portais ancoram as aranhas na área da foto; não cobrem títulos ou botões.
      if (slug === "halloween") {
        const cards = [
          ...(rootRef.current
            ?.closest(".catalog-page")
            ?.querySelectorAll(".product-card__media") || []),
        ];
        const shown = cards.filter((card) => {
          const bounds = card.getBoundingClientRect();
          return bounds.bottom > 80 && bounds.top < innerHeight - 100;
        });
        // Escolhe fotos distribuídas pela área visível, em vez de cards sempre adjacentes.
        const count = Math.min(shown.length, innerWidth < 640 ? 1 : 2);
        const first = Math.floor(Math.random() * Math.max(1, shown.length));
        setTargets(
          Array.from(
            { length: count },
            (_, index) =>
              shown[
                (first + index * Math.max(1, Math.floor(shown.length / 2))) %
                  shown.length
              ],
          ),
        );
      }
      setScene(next);
      timer = setTimeout(() => {
        setScene(null);
        setTargets([]);
        timer = setTimeout(start, 45_000 + Math.random() * 25_000);
      }, 12_000);
    };
    timer = setTimeout(start, 5_000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [slug, theme, enabled, reduced, visible, suspended]);

  if (!theme) return null;
  const active = scene !== null && enabled && !reduced && visible && !suspended;
  function toggle() {
    const next = !enabled;
    setEnabled(next);
    try {
      localStorage.setItem(preferenceKey, next ? "on" : "off");
    } catch {
      /* Opcional. */
    }
  }
  return (
    <div ref={rootRef} className={`seasonal-root seasonal-root--${slug}`}>
      {!suspended && !reduced && (
        <button
          className="seasonal-toggle"
          type="button"
          onClick={toggle}
          aria-pressed={enabled}
          aria-label={`${enabled ? "Desativar" : "Ativar"} efeitos de ${theme.title}`}
          title={`${enabled ? "Desativar" : "Ativar"} efeitos de ${theme.title}`}
        >
          <Sparkles aria-hidden="true" />
          <span>Efeitos {enabled ? "ativados" : "desativados"}</span>
        </button>
      )}
      {active && (
        <div
          className={`seasonal-stage seasonal-stage--${scene % 2}`}
          style={
            {
              "--scene-mirror": scene % 2 ? -1 : 1,
              "--hero-top": `${[48, 64, 38, 57][scene % 4]}%`,
              "--companion-bottom": `${[16, 35, 24, 46][scene % 4]}%`,
              "--particle-shift": `${(scene % 4) * 7}%`,
            } as CSSProperties
          }
          aria-hidden="true"
          key={`${slug}-${scene}`}
        >
          {slug === "halloween" && (
            <>
              <div className="seasonal-web seasonal-web--left">
                <CornerWeb />
              </div>
              <div className="seasonal-web seasonal-web--right">
                <CornerWeb />
              </div>
            </>
          )}
          <div className={`seasonal-hero seasonal-hero--${theme.hero}`}>
            <SeasonalArt motif={theme.hero} />
          </div>
          <div
            className={`seasonal-companion seasonal-companion--${theme.companion}`}
          >
            <SeasonalArt motif={theme.companion} />
          </div>
          {Array.from({ length: slug === "natal" ? 9 : 4 }, (_, index) => (
            <div
              key={index}
              className={`seasonal-particle seasonal-particle--${theme.particle}`}
              style={{ "--i": index } as CSSProperties}
            >
              <SeasonalArt motif={theme.particle} />
            </div>
          ))}
        </div>
      )}
      {active &&
        targets.map((target, index) =>
          createPortal(
            <span
              className={`seasonal-card-spider ${(scene + index) % 2 ? "seasonal-card-spider--mirrored" : ""}`}
              style={{ "--spider-delay": `${index * 1.6}s` } as CSSProperties}
              aria-hidden="true"
            >
              <SeasonalArt motif="spider" />
            </span>,
            target,
            `${slug}-${scene}-${index}`,
          ),
        )}
    </div>
  );
}
