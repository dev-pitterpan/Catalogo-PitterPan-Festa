import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Sparkles, ShieldCheck, ArrowUpRight } from "lucide-react";
import LoginForm from "../../components/admin/LoginForm";
import { authConfigured, currentSession } from "../../server/auth/session";
import { safeDestination } from "../../server/auth/crypto";
import "../../styles/admin.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Acesso da equipe",
  robots: { index: false, follow: false },
};
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeDestination((await searchParams).next);
  if (await currentSession()) redirect(next);
  return (
    <main className="admin-login">
      <section className="admin-login-story">
        <a href="/" className="admin-login-brand">
          <img
            src="/assets/images/brand/pitter-pan-logo.svg"
            alt="Pitter Pan Festas"
          />
          <span>PITTER PAN FESTAS</span>
        </a>
        <div className="admin-login-copy">
          <span className="admin-eyebrow">
            <Sparkles size={16} /> BEM-VINDO AOS BASTIDORES
          </span>
          <h1>
            Grandes festas.
            <br />
            Uma gestão
            <br />
            <em>à altura.</em>
          </h1>
          <p>
            Produtos, coleções e oportunidades.
            <br />
            Tudo conectado, em um só lugar.
          </p>
          <div className="admin-gift-scene" aria-hidden="true">
            <div className="admin-gift">
              <i />
              <b />
              <span />
            </div>
            <div className="admin-orb admin-orb-gold" />
            <div className="admin-orb admin-orb-blue" />
            <span className="admin-confetti">✦</span>
          </div>
        </div>
        <span className="admin-login-story-footer">
          Pequenos detalhes. Grandes celebrações.
        </span>
      </section>
      <section className="admin-login-panel">
        <div className="admin-login-card">
          <span className="admin-login-badge">
            <ShieldCheck size={17} /> ÁREA DA EQUIPE
          </span>
          <h2>Bom ter você aqui.</h2>
          <p>Entre para acompanhar o que faz a festa acontecer.</p>
          <LoginForm configured={authConfigured()} next={next} />
          <a className="admin-login-back" href="/">
            Explorar os catálogos públicos <ArrowUpRight size={15} />
          </a>
        </div>
        <span className="admin-login-copyright">
          Pitter Pan Festas · Joinville, SC
        </span>
      </section>
    </main>
  );
}
