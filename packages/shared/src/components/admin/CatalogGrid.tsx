"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, Copy, Check, Share2, ArrowUpRight } from "lucide-react";
import CatalogIcon from "../navigation/CatalogIcon";
import { catalogVisual } from "../../lib/catalog/visual";
import type { CatalogSummary } from "../../types/catalog";
import { publicCatalogUrl } from "../../lib/routes";
export default function CatalogGrid({
  items,
  base,
}: {
  items: (CatalogSummary & { count: number | null })[];
  base: string;
}) {
  const [q, setQ] = useState(""),
    [copied, setCopied] = useState(""),
    [message, setMessage] = useState("");
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const visible = items.filter((c) => normalize(c.name).includes(normalize(q)));
  async function share(slug: string, name: string, mode: "copy" | "share") {
    const url = publicCatalogUrl(slug, base, {
      hostname: location.hostname,
      origin: location.origin,
    });
    setMessage("");
    try {
      if (mode === "share" && navigator.share)
        await navigator.share({
          title: `Catálogo ${name} · Pitter Pan Festas`,
          url,
        });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(slug);
        setMessage(
          "Link público copiado. Seu cliente não precisa entrar na conta.",
        );
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setMessage(
        "Não foi possível copiar automaticamente. Abra a visualização e copie o endereço.",
      );
    }
  }
  return (
    <>
      <div className="admin-catalog-toolbar">
        <label className="admin-filter-search">
          <Search size={18} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Encontre um catálogo…"
            aria-label="Buscar catálogo"
          />
        </label>
        <span>{visible.length} seleções disponíveis</span>
      </div>
      <p className="admin-copy-status" role="status">
        {message}
      </p>
      <div className="admin-catalog-grid">
        {visible.map((c, i) => (
          <article
            className="admin-catalog-card"
            key={c.slug}
            style={
              { "--catalog-tone": c.accent || "#4759b8" } as React.CSSProperties
            }
          >
            <div className="admin-catalog-cover">
              <span className="admin-catalog-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              <img
                className="admin-catalog-cover-art"
                src={catalogVisual(c.slug).banner}
                alt=""
                loading="lazy"
                width={600}
                height={210}
              />
              <span className="admin-catalog-theme-icon" aria-hidden="true">
                <CatalogIcon slug={c.slug} />
              </span>
              <span className="admin-catalog-cover-label">
                SELEÇÃO PITTER PAN
              </span>
            </div>
            <div className="admin-catalog-card-body">
              <span className="admin-eyebrow">
                {c.count === null
                  ? "CATÁLOGO PÚBLICO"
                  : `${c.count.toLocaleString("pt-BR")} VARIANTES`}
              </span>
              <h2>{c.name}</h2>
              <p>{c.description}</p>
              <Link
                href={`/gestor/${c.slug}/`}
                target="_blank"
                rel="noopener noreferrer"
                prefetch={false}
                className="admin-text-link"
              >
                Abrir catálogo em nova aba <ArrowUpRight size={16} />
              </Link>
              <div className="admin-catalog-card-actions">
                <button onClick={() => share(c.slug, c.name, "copy")}>
                  {copied === c.slug ? <Check size={15} /> : <Copy size={15} />}
                  Copiar link
                </button>
                <button
                  onClick={() => share(c.slug, c.name, "share")}
                  aria-label={`Compartilhar ${c.name}`}
                >
                  <Share2 size={16} />
                </button>
                <a
                  href={`${publicCatalogUrl(c.slug, base)}?view=client`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Ver ${c.name} como cliente`}
                >
                  <ArrowUpRight size={16} />
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!visible.length && (
        <div className="admin-empty">
          <h3>Nenhum catálogo encontrado</h3>
          <p>Tente outra palavra.</p>
        </div>
      )}
    </>
  );
}
