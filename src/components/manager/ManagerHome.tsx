import { UserRound } from "lucide-react";
import Link from "next/link";
import CatalogIcon, { seasonalSlugs } from "../navigation/CatalogIcon";
import { catalogVisual } from "../../lib/catalog/visual";
import type { CatalogSummary } from "../../types/catalog";
export default function ManagerHome({
  catalogs,
}: {
  catalogs: CatalogSummary[];
}) {
  const cards = catalogs.map((catalog) => {
    const slug = catalog.slug;
    return (
      <Link
        key={slug}
        className={`catalog-card ${catalog.cardClass}`}
        href={`/gestor/${slug}/`}
      >
        <img
          className="catalog-card__image"
          src={
            !seasonalSlugs.has(slug)
              ? catalogVisual(slug).banner
              : `/assets/images/catalogs/${slug}/banner.webp`
          }
          alt=""
        />
        <div className="catalog-card__content">
          <span className="catalog-card__icon">
            <CatalogIcon slug={slug} />
          </span>
          <h2>{catalog.name}</h2>
          <p>{catalog.description}</p>
          <span className="catalog-card__cta">
            Ver catálogo <i>↗</i>
          </span>
        </div>
      </Link>
    );
  });
  return (
    <main className="manager-shell">
      <span className="decor decor--red" aria-hidden="true"></span>
      <span className="decor decor--blue" aria-hidden="true"></span>
      <span className="star star--yellow" aria-hidden="true"></span>
      <span className="star star--blue" aria-hidden="true"></span>
      <span className="star star--pink" aria-hidden="true"></span>
      <span className="star star--red" aria-hidden="true"></span>

      <div className="manager-inner">
        <header className="topbar">
          <div className="account-pill" aria-label="Área do gestor Álvaro">
            <UserRound aria-hidden="true" />
            <strong>Álvaro</strong>
          </div>
        </header>

        <section className="hero" aria-labelledby="gestor-title">
          <div className="brand-mark">
            <img
              src="/assets/images/brand/pitter-pan-logo.svg"
              alt="Pitter Pan Festas"
            />
          </div>
          <h1 id="gestor-title">
            Escolha um <strong>catálogo</strong>
            <br />e <em>encante</em> seus clientes!
          </h1>
          <p>
            Catálogos completos, prontos para compartilhar e transformar
            qualquer comemoração em momentos inesquecíveis.
          </p>
          <span className="wave" aria-hidden="true"></span>
        </section>

        <nav
          className="catalog-grid"
          data-catalog-manifest
          aria-label="Catálogos sazonais"
        >
          {cards}
        </nav>

        <footer className="footer">
          <span className="footer-line" aria-hidden="true"></span>
          <strong>
            Pitter Pan Festas <span className="mini-star">★</span>
          </strong>
          <span>Catálogos que vendem, experiências que ficam.</span>
        </footer>
      </div>
    </main>
  );
}
