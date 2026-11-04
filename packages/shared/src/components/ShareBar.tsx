import { useState } from "react";
import { Copy, Share2, Eye, Link2 } from "lucide-react";
import type { Catalog } from "../types/catalog";
export default function ShareBar({
  catalog,
  url,
}: {
  catalog: Catalog;
  url: string;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt("Copie o link do catálogo:", url);
    }
  }
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Catálogo ${catalog.name} | Pitter Pan Festas`,
          url,
        });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    await copy();
  }
  return (
    <section
      className="owner-sharebar owner-sharebar--theme"
      aria-label="Ações do catálogo"
    >
      <div className="owner-link-wrap">
        <span className="owner-kicker">
          LINK PÚBLICO DO CLIENTE · {catalog.name}
        </span>
        <div className="owner-link">
          <Link2 aria-hidden="true" />
          <input
            aria-label="Link público do catálogo para o cliente"
            readOnly
            value={url}
            onFocus={(event) => event.currentTarget.select()}
          />
        </div>
      </div>
      <div className="owner-actions">
        <button className="owner-action" onClick={copy}>
          <Copy aria-hidden="true" />
          <span>{copied ? "Link copiado" : "Copiar link do cliente"}</span>
        </button>
        <button className="owner-action owner-action--share" onClick={share}>
          <Share2 aria-hidden="true" />
          <span>Compartilhar</span>
        </button>
        <a
          className="owner-action owner-action--preview"
          href={`${url}${url.includes("?") ? "&" : "?"}view=client`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Eye aria-hidden="true" />
          <span>Ver como cliente</span>
        </a>
      </div>
      <p className="owner-share-note" role="status">
        {copied
          ? "Link público copiado. Pode enviar ao cliente."
          : "Compartilhe este link: o cliente acessa o catálogo sem entrar na conta do gestor."}
      </p>
    </section>
  );
}
