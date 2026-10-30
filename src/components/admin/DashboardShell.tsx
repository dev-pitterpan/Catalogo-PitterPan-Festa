"use client";
import AutoFilterForm from "./AutoFilterForm";
import PartyExperience, { PartySectionScene } from "./PartyExperience";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ShieldCheck,
  LoaderCircle,
  MapPinned,
  ChartNoAxesCombined,
  BarChart3,
  LayoutDashboard,
  Package,
  Boxes,
  BadgePercent,
  ShoppingCart,
  BookOpen,
  ArrowLeftRight,
  RefreshCw,
  Settings2,
  Users,
  LogOut,
  Menu,
  X,
  Search,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import type { Role } from "../../server/auth/crypto";
const links = [
  { href: "/gestor/", label: "Visão geral", icon: LayoutDashboard },
  {
    href: "/gestor/vendas/",
    label: "Vendas e vendidos",
    icon: ShoppingCart,
    financial: true,
  },
  {
    href: "/gestor/mapa/",
    label: "Mapa de entregas",
    icon: MapPinned,
    financial: true,
  },
  { href: "/gestor/estoque/", label: "Estoque", icon: Boxes },
  { href: "/gestor/ofertas/", label: "Ofertas", icon: BadgePercent },
  { href: "/gestor/catalogos/", label: "Catálogos", icon: BookOpen },
  {
    href: "/gestor/alteracoes/",
    label: "Histórico de alterações",
    icon: ArrowLeftRight,
  },
  { href: "/gestor/sincronizacoes/", label: "Sincronizações", icon: RefreshCw },
  {
    href: "/gestor/analises/",
    label: "Análises Shopify",
    icon: ChartNoAxesCombined,
    financial: true,
  },
  { href: "/gestor/relatorios/", label: "Relatórios", icon: BarChart3 },
  { href: "/gestor/usuarios/", label: "Equipe", icon: Users, admin: true },
  {
    href: "/gestor/configuracoes/",
    label: "Configurações",
    icon: Settings2,
    admin: true,
  },
];
const navigationGroups = [
  {
    label: "Sua operação",
    paths: [
      "/gestor/",
      "/gestor/vendas/",
      "/gestor/mapa/",
      "/gestor/estoque/",
      "/gestor/ofertas/",
      "/gestor/alteracoes/",
    ],
  },
  {
    label: "Planejar e compartilhar",
    paths: ["/gestor/catalogos/", "/gestor/analises/", "/gestor/relatorios/"],
  },
  {
    label: "Gestão da equipe",
    paths: [
      "/gestor/sincronizacoes/",
      "/gestor/usuarios/",
      "/gestor/configuracoes/",
    ],
  },
];
function NavigationPending() {
  const { pending } = useLinkStatus();
  return pending ? (
    <span className="admin-nav-pending" role="status">
      <LoaderCircle size={14} />
      <span className="admin-sr-only">Abrindo seção</span>
    </span>
  ) : null;
}
const roleLabels = {
  admin: "Administrador",
  gerente_compras: "Gerente de Compras",
  gestor: "Gestor",
  atendimento: "Atendimento",
};
export default function DashboardShell({
  children,
  user,
}: {
  children: ReactNode;
  user: { name: string; email: string; role: Role };
}) {
  const pathname = (usePathname() || "/gestor/").replace(/\/+$/, "") + "/";
  const sidebarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    document.documentElement.className = "";
    document.body.className = "";
  }, []);

  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement,
      previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const controls = () =>
      [
        ...(sidebarRef.current?.querySelectorAll<HTMLElement>(
          "a[href],button:not(:disabled)",
        ) || []),
      ].filter((node) => node.getClientRects().length);
    controls()[0]?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab") return;
      const nodes = controls(),
        first = nodes[0],
        last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    function resize() {
      if (innerWidth >= 980) setOpen(false);
    }
    document.addEventListener("keydown", keydown);
    window.addEventListener("resize", resize);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keydown);
      window.removeEventListener("resize", resize);
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, [open]);

  async function logout() {
    setLeaving(true);
    try {
      const response = await fetch("/api/auth/logout/", { method: "POST" });
      if (!response.ok) throw new Error();
      location.assign("/login/");
    } catch {
      setError("Não foi possível sair. Tente novamente.");
      setLeaving(false);
    }
  }
  const title =
    links.find((l) => l.href === pathname)?.label || "Central de gestão";
  return (
    <PartyExperience>
      <a className="admin-skip-link" href="#admin-main">
        Ir para o conteúdo
      </a>
      {open && (
        <button
          className="admin-nav-shade"
          aria-label="Fechar navegação"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        ref={sidebarRef}
        className={`admin-sidebar ${open ? "is-open" : ""}`}
        aria-label="Navegação administrativa"
      >
        <Link className="admin-brand" href="/gestor/">
          <img
            src="/assets/images/brand/pitter-pan-logo.svg"
            alt="Pitter Pan Festas"
          />
          <span>
            Pitter Pan<strong>Central de gestão</strong>
          </span>
        </Link>
        <button
          className="admin-mobile-close"
          onClick={() => setOpen(false)}
          aria-label="Fechar menu"
        >
          <X size={20} />
        </button>
        <div className="admin-workspace">
          <span className="admin-workspace-icon">
            <Sparkles size={18} />
          </span>
          <div>
            <strong>Pitter Pan Festas</strong>
            <small>Seu espaço de trabalho</small>
          </div>
          <ShieldCheck
            className="admin-workspace-shield"
            size={16}
            aria-hidden="true"
          />
        </div>
        <nav className="admin-navigation" aria-label="Seções da central">
          {navigationGroups.map((group) => {
            const items = links.filter(
              (link) =>
                group.paths.includes(link.href) &&
                (!link.admin ||
                  user.role === "admin" ||
                  user.role === "gerente_compras") &&
                (!link.financial || user.role !== "atendimento"),
            );
            if (!items.length) return null;
            return (
              <section className="admin-nav-group" key={group.label}>
                <h2>{group.label}</h2>
                {items.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    prefetch={false}
                    aria-current={pathname === href ? "page" : undefined}
                    className={pathname === href ? "active" : ""}
                    onClick={() => setOpen(false)}
                  >
                    <Icon size={19} strokeWidth={1.7} aria-hidden="true" />
                    <span>{label}</span>
                    <NavigationPending />
                    {pathname === href && <span className="admin-nav-marker" />}
                  </Link>
                ))}
              </section>
            );
          })}
        </nav>
        <div className="admin-sidebar-note">
          <span>
            Uma festa começa
            <br />
            <strong>nos detalhes.</strong>
          </span>
          <Sparkles size={26} />
          <small>
            Informação organizada.
            <br />
            Mais tempo para criar.
          </small>
        </div>
        <div className="admin-account">
          <span className="admin-avatar">
            {user.name.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <strong>{user.name}</strong>
            <small>{roleLabels[user.role]}</small>
          </div>
          <button
            onClick={logout}
            disabled={leaving}
            aria-label="Sair da conta"
            title="Sair da conta"
          >
            <LogOut size={18} />
          </button>
        </div>
        {error && <p role="alert">{error}</p>}
      </aside>
      <div className="admin-main" inert={open ? true : undefined}>
        <header className="admin-topbar">
          <div>
            <button
              className="admin-menu-button"
              onClick={() => setOpen(!open)}
              aria-label="Abrir menu"
              aria-expanded={open}
            >
              <Menu size={22} />
            </button>
            <span className="admin-breadcrumb">
              <span className="admin-breadcrumb-root">Central de gestão</span>
              <span className="admin-breadcrumb-separator">/</span>
              <strong>{title}</strong>
            </span>
          </div>
          <AutoFilterForm
            action="/gestor/produtos/"
            className="admin-global-search"
          >
            <Search size={17} />
            <input
              aria-label="Buscar produtos no painel"
              name="q"
              placeholder="Buscar produto ou SKU…"
            />
          </AutoFilterForm>
          {(user.role === "admin" || user.role === "gerente_compras") && (
            <Link
              className="admin-button admin-sync-shortcut"
              href="/gestor/sincronizacoes/"
            >
              <RefreshCw size={15} /> Sincronizar
            </Link>
          )}
          <span className="admin-secure-label">
            <ShieldCheck size={15} aria-hidden="true" />
            Área da equipe
          </span>
          <Link
            className="admin-public-link"
            href="/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver catálogo <ArrowUpRight size={16} />
          </Link>
        </header>
        <main className="admin-content" id="admin-main">
          <PartySectionScene />
          {children}
        </main>
        <footer className="admin-footer">
          <span>Pitter Pan Festas · Central de gestão</span>
          <span>Pequenos detalhes. Grandes celebrações.</span>
        </footer>
      </div>
    </PartyExperience>
  );
}
