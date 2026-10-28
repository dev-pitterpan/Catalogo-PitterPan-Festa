import Link from "next/link";
import {
  Package,
  Layers3,
  BadgePercent,
  Boxes,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ArrowRight,
  BookOpen,
  CircleCheck,
  Clock3,
  RefreshCw,
} from "lucide-react";
import { adminContext } from "../../../server/admin/repository";
import { requireSession } from "../../../server/auth/session";
import {
  DataNotice,
  EmptyState,
  dateTime,
  number,
  statusLabels,
} from "../../../components/admin/Primitives";
export default async function Overview() {
  const [context, user] = await Promise.all([adminContext(), requireSession()]);
  const s = context.summary;
  const max = Math.max(1, ...context.categories.map((c) => c.count));
  const last = context.runs.find((r) => r.id === context.active);
  const stats = [
    {
      label: "Produtos no catálogo",
      value: s?.products,
      detail: s
        ? `${number(s.variants)} variantes cadastradas`
        : "Aguardando os dados da sua loja",
      icon: Package,
      tone: "blue",
      href: "/gestor/produtos/",
    },
    {
      label: "Produtos em oferta",
      value: s?.offers,
      detail: "Preço menor que o preço anterior",
      icon: BadgePercent,
      tone: "violet",
      href: "/gestor/ofertas/",
    },
    {
      label: "Estoque baixo",
      value: s?.low,
      detail: `De 1 a ${context.settings.low} unidades por variante`,
      icon: Boxes,
      tone: "amber",
      href: "/gestor/estoque/?stock=low",
    },
    {
      label: "Estoque alto",
      value: s?.high,
      detail: `A partir de ${context.settings.high} unidades`,
      icon: Layers3,
      tone: "green",
      href: "/gestor/estoque/?stock=high",
    },
  ];
  return (
    <>
      <header className="admin-overview-heading">
        <div>
          <span className="admin-eyebrow">SEU NEGÓCIO, EM PERSPECTIVA</span>
          <h1>
            Olá, {user.name.split(" ")[0]}. <span>Bom ter você por aqui.</span>
          </h1>
          <p>
            Seu catálogo, seus produtos e as próximas oportunidades, em um só
            lugar.
          </p>
        </div>
        <span className="admin-date">
          <Clock3 size={15} />
          {new Intl.DateTimeFormat("pt-BR", {
            day: "numeric",
            month: "long",
            timeZone: "America/Sao_Paulo",
          }).format(new Date())}
        </span>
      </header>
      <DataNotice context={context} />
      <section className="admin-hero">
        <div>
          <span className="admin-hero-tag">
            <span /> CENTRAL PITTER PAN
          </span>
          <h2>
            Cada detalhe conectado.
            <br />
            <em>Mais espaço para celebrar.</em>
          </h2>
          <p>
            Uma gestão tão especial quanto as festas que você ajuda a criar.
            <br />
            Organize sua operação e compartilhe as melhores seleções.
          </p>
          <Link
            href="/gestor/catalogos/"
            className="admin-button admin-button-light"
          >
            Escolher um catálogo <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="admin-hero-art" aria-hidden="true">
          <div className="admin-gift-scene">
            <div className="admin-gift">
              <i />
              <b />
              <span />
            </div>
            <div className="admin-orb admin-orb-gold" />
            <div className="admin-orb admin-orb-blue" />
            <span className="admin-confetti">✦</span>
          </div>
          <div className="admin-art-label">
            <Sparkles size={16} />
            <span>
              Organização que
              <br />
              <strong>vira festa.</strong>
            </span>
          </div>
        </div>
      </section>
      <section className="admin-stats" aria-label="Indicadores do catálogo">
        {stats.map(({ label, value, detail, icon: Icon, tone, href }) => (
          <Link
            href={href}
            key={label}
            className={`admin-stat admin-stat--${tone}${value == null ? " is-unavailable" : ""}`}
          >
            <div>
              <span className={`admin-stat-icon ${tone}`}>
                <Icon size={21} />
              </span>
              <ArrowUpRight size={17} />
            </div>
            <span>{label}</span>
            <strong>{number(value)}</strong>
            <small>
              {value == null ? "Disponível após a importação" : detail}
            </small>
          </Link>
        ))}
      </section>
      <div className="admin-overview-grid">
        <section className="admin-panel">
          <header>
            <div>
              <span className="admin-eyebrow">MIX DA LOJA</span>
              <h2>Produtos por categoria</h2>
            </div>
            <span className="admin-subtle">Variantes</span>
          </header>
          {context.categories.length ? (
            <div className="admin-bar-chart">
              {context.categories.map((c, i) => (
                <div className="admin-chart-row" key={c.name}>
                  <div>
                    <span>
                      <i
                        style={{
                          background: [
                            "#527fb5",
                            "#7aa6c9",
                            "#99bdd4",
                            "#b5a2cd",
                            "#c2ad88",
                            "#80b5ad",
                          ][i % 6],
                        }}
                      />
                      {c.name}
                    </span>
                    <strong>{number(c.count)}</strong>
                  </div>
                  <div className="admin-chart-track">
                    <span
                      style={{
                        width: `${(c.count / max) * 100}%`,
                        background: [
                          "#527fb5",
                          "#7aa6c9",
                          "#99bdd4",
                          "#b5a2cd",
                          "#c2ad88",
                          "#80b5ad",
                        ][i % 6],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Seu mix vai aparecer aqui"
              description="As categorias serão organizadas após a primeira importação publicada."
            />
          )}
          <Link className="admin-text-link" href="/gestor/produtos/">
            Explorar todos os produtos <ArrowRight size={16} />
          </Link>
        </section>
        <section className="admin-panel admin-changes-panel">
          <header>
            <div>
              <span className="admin-eyebrow">CATÁLOGO EM MOVIMENTO</span>
              <h2>O que mudou?</h2>
            </div>
            <RefreshCw size={19} />
          </header>
          <p>Comparação entre as duas últimas versões publicadas.</p>
          <div className="admin-change-metrics">
            <div>
              <span className="green">
                <ArrowUpRight size={18} /> Entraram
              </span>
              <strong>{number(context.changes?.added)}</strong>
            </div>
            <div>
              <span className="rose">
                <ArrowDownRight size={18} /> Saíram
              </span>
              <strong>{number(context.changes?.removed)}</strong>
            </div>
            <div>
              <span className="blue">
                <RefreshCw size={17} /> Mudaram
              </span>
              <strong>{number(context.changes?.changed)}</strong>
            </div>
          </div>
          {!context.previous && (
            <p className="admin-inline-note">
              O histórico começa a comparar mudanças a partir da segunda
              publicação.
            </p>
          )}
          <Link className="admin-text-link" href="/gestor/alteracoes/">
            Conferir alterações <ArrowRight size={16} />
          </Link>
        </section>
      </div>
      <div className="admin-overview-bottom">
        <section className="admin-panel">
          <header>
            <div>
              <span className="admin-eyebrow">ATENÇÃO AOS DETALHES</span>
              <h2>Seu estoque, de perto</h2>
            </div>
            <Boxes size={19} />
          </header>
          <div className="admin-stock-rows">
            <Link href="/gestor/estoque/?stock=out">
              <span className="admin-stock-dot rose" />
              <div>
                <strong>Sem estoque</strong>
                <small>Quantidade cadastrada igual ou menor que zero</small>
              </div>
              <b>{number(s?.out)}</b>
              <ArrowUpRight size={16} />
            </Link>
            <Link href="/gestor/estoque/?stock=unknown">
              <span className="admin-stock-dot amber" />
              <div>
                <strong>Estoque não informado</strong>
                <small>Variantes que precisam de conferência</small>
              </div>
              <b>{number(s?.unknown)}</b>
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </section>
        <section className="admin-panel admin-sync-card">
          <div className={`admin-sync-icon${last ? "" : " is-pending"}`}>
            {last ? <CircleCheck size={25} /> : <Clock3 size={25} />}
          </div>
          <span className="admin-eyebrow">ÚLTIMA PUBLICAÇÃO</span>
          <h2>
            {last
              ? dateTime(last.completed_at)
              : "A próxima etapa da sua gestão"}
          </h2>
          <p>
            {last
              ? `${number(last.report.variants)} variantes · ${statusLabels[last.status] || last.status}`
              : "Publique uma importação para acompanhar sua loja com dados completos."}
          </p>
          <Link className="admin-text-link" href="/gestor/sincronizacoes/">
            Ver sincronizações <ArrowUpRight size={16} />
          </Link>
        </section>
        <Link className="admin-share-card" href="/gestor/catalogos/">
          <BookOpen size={26} />
          <span>UMA SELEÇÃO. UM LINK.</span>
          <h2>
            O catálogo certo,
            <br />
            para cada cliente.
          </h2>
          <span>
            Escolher e compartilhar <ArrowUpRight size={16} />
          </span>
        </Link>
      </div>
    </>
  );
}
