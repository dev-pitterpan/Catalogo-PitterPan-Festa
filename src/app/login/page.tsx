import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ShieldCheck, ArrowUpRight } from "lucide-react";
import LoginForm from "../../components/admin/LoginForm";
import { authConfigured, currentSession } from "../../server/auth/session";
import { safeDestination } from "../../server/auth/crypto";
import "../../styles/admin.css";
import "../../styles/admin/login.css";
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
    <main className="admin-login party-login">
      <section className="admin-login-story party-login-story">
        <a
          href="/"
          className="party-login-wordmark"
          aria-label="Pitter Pan Festas · início"
        >
          <span>Pitter Pan</span>
          <small>FESTAS</small>
        </a>
        <div className="party-login-story-content">
          <div className="party-login-heading">
            <h1>
              A festa começa
              <br />
              <em>nos detalhes.</em>
            </h1>
            <p>
              Seu catálogo. Sua equipe.
              <br className="party-login-mobile-break" /> Infinitas
              possibilidades.
            </p>
          </div>
          <div className="party-login-art" aria-hidden="true">
            <Image
              src="/assets/images/admin/login-party.webp"
              alt=""
              width={1536}
              height={1024}
              sizes="(max-width: 820px) 260px, 56vw"
              priority
            />
          </div>
        </div>
      </section>
      <section
        className="admin-login-panel party-login-panel"
        aria-labelledby="login-title"
      >
        <div className="admin-login-card party-login-card">
          <span className="admin-login-badge">
            <ShieldCheck size={20} aria-hidden="true" />
            ÁREA DA EQUIPE
          </span>
          <h2 id="login-title">Bom ter você aqui.</h2>
          <p>Entre para fazer a festa acontecer.</p>
          <LoginForm configured={authConfigured()} next={next} />
          <a className="admin-login-back" href="/">
            Explorar os catálogos públicos
            <ArrowUpRight size={19} aria-hidden="true" />
          </a>
        </div>
        <footer className="party-login-footer">
          <span className="party-login-colors" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <p>Pitter Pan Festas · Joinville, SC</p>
        </footer>
      </section>
    </main>
  );
}
