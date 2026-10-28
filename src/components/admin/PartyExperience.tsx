"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  BadgePercent,
  BookOpen,
  Boxes,
  CalendarDays,
  ChartNoAxesCombined,
  Package,
  Pause,
  Play,
  RefreshCw,
  Settings2,
  Sparkles,
  Users,
} from "lucide-react";
import { PartyHelper } from "./PartyChart";

const MotionContext = createContext(true);
export const usePartyMotion = () => useContext(MotionContext);
const scenes = {
  vendas: {
    title: "Uma celebração a cada pedido",
    detail: "Vendas confirmadas, com atenção a cada detalhe.",
    icon: Package,
    kind: "boxes",
  },
  produtos: {
    title: "Cada produto, uma possibilidade",
    detail: "Seu acervo de ideias para celebrar.",
    icon: Package,
    kind: "boxes",
  },
  estoque: {
    title: "Tudo pronto nos bastidores",
    detail: "Um olhar atento para cada unidade.",
    icon: Boxes,
    kind: "boxes",
  },
  ofertas: {
    title: "Oportunidades que merecem destaque",
    detail: "As melhores seleções ganham o palco.",
    icon: BadgePercent,
    kind: "offers",
  },
  catalogos: {
    title: "Uma seleção feita para encantar",
    detail: "Escolha, confira e compartilhe sua próxima festa.",
    icon: BookOpen,
    kind: "books",
  },
  alteracoes: {
    title: "Seu catálogo está em movimento",
    detail: "Acompanhe o que entrou, saiu e mudou.",
    icon: RefreshCw,
    kind: "boxes",
  },
  sincronizacoes: {
    title: "Conexões que organizam a festa",
    detail: "Confira as etapas reais de cada importação abaixo.",
    icon: RefreshCw,
    kind: "gears",
  },
  calendario: {
    title: "A próxima celebração começa aqui",
    detail: "Datas especiais merecem planejamento.",
    icon: CalendarDays,
    kind: "calendar",
  },
  relatorios: {
    title: "Os detalhes contam uma história",
    detail: "Transforme os números em próximos passos.",
    icon: ChartNoAxesCombined,
    kind: "chart",
  },
  usuarios: {
    title: "Gente que faz a festa acontecer",
    detail: "Sua equipe, conectada nos detalhes.",
    icon: Users,
    kind: "team",
  },
  configuracoes: {
    title: "Cada detalhe no seu lugar",
    detail: "Ajustes cuidadosos para a sua operação.",
    icon: Settings2,
    kind: "gears",
  },
};

/** A single preference controls the decorative layer; it never wraps business handlers. */
export default function PartyExperience({ children }: { children: ReactNode }) {
  const [motion, setMotion] = useState(true);
  useEffect(() => {
    try {
      setMotion(localStorage.getItem("pitterpan-admin-motion") !== "off");
    } catch {
      /* Storage may be unavailable in private browsing. */
    }
  }, []);
  function toggle() {
    setMotion((current) => {
      const next = !current;
      try {
        localStorage.setItem("pitterpan-admin-motion", next ? "on" : "off");
      } catch {
        /* Preference still works for this visit. */
      }
      return next;
    });
  }
  return (
    <MotionContext.Provider value={motion}>
      <div className="admin-app" data-party-motion={motion ? "on" : "off"}>
        {children}
        <button
          className="party-motion-control"
          type="button"
          onClick={toggle}
          aria-pressed={!motion}
          aria-label={
            motion
              ? "Desativar animações decorativas do painel"
              : "Ativar animações decorativas do painel"
          }
          title={
            motion ? "Pausar efeitos decorativos" : "Ativar efeitos decorativos"
          }
        >
          {motion ? <Pause size={14} /> : <Play size={14} />}
          <span>Efeitos {motion ? "ativos" : "pausados"}</span>
        </button>
      </div>
    </MotionContext.Provider>
  );
}

export function PartySectionScene() {
  const pathname = usePathname() || "/gestor/";
  const section = pathname.split("/").filter(Boolean)[1];
  const scene = scenes[section as keyof typeof scenes];
  if (!scene) return null;
  const Icon = scene.icon;
  return (
    <aside
      className={`party-section-scene party-section--${scene.kind}`}
      key={pathname}
      aria-label="Estúdio Pitter Pan"
    >
      <div className="party-section-copy">
        <span>
          <Sparkles size={13} /> ESTÚDIO PITTER PAN
        </span>
        <strong>{scene.title}</strong>
        <p>{scene.detail}</p>
      </div>
      <div className="party-stage" aria-hidden="true">
        <div className="party-stage-floor" />
        <div className="party-stage-prop party-stage-prop--back">
          <Icon size={30} strokeWidth={1.6} />
        </div>
        <div className="party-stage-prop party-stage-prop--front">
          <Icon size={24} strokeWidth={1.6} />
        </div>
        <div className="party-stage-helper">
          <PartyHelper />
        </div>
        <i className="party-stage-star">✦</i>
      </div>
    </aside>
  );
}
