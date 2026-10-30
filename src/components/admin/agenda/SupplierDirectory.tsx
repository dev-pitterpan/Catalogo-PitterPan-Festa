"use client";
import { useState, type FormEvent } from "react";
import { Plus, Search, Building2, ExternalLink, X } from "lucide-react";
import type { Supplier } from "../../../lib/agenda/types";
import { whatsappLink } from "../../../lib/agenda/validation";
import { WhatsAppIcon, type Save } from "./shared";
import SupplierImport from "./SupplierImport";
function SupplierEditor({
  supplier,
  save,
  busy,
  close,
}: {
  supplier?: Supplier;
  save: Save;
  busy: boolean;
  close: () => void;
}) {
  const [phone, setPhone] = useState(supplier?.phone || "");
  const [message, setMessage] = useState(
    `Olá${supplier?.contact ? `, ${supplier.contact}` : ""}! Aqui é da Pitter Pan Festas. Gostaria de conversar sobre ${supplier?.name || "uma parceria"}.`,
  );
  const [catalog, setCatalog] = useState(supplier?.catalog_url || "");
  const link = whatsappLink(phone, message);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    if (
      await save(
        "supplier",
        { ...data, phone, catalog_url: catalog },
        supplier?.id,
        supplier?.revision,
      )
    )
      close();
  }
  return (
    <section className="admin-panel agenda-editor">
      <header>
        <h2>
          <Building2 size={18} />{" "}
          {supplier ? "Ficha do fornecedor" : "Novo fornecedor"}
        </h2>
        <button
          className="agenda-icon-button"
          onClick={close}
          aria-label="Fechar ficha"
        >
          <X size={18} />
        </button>
      </header>
      <form className="agenda-form" onSubmit={submit}>
        <fieldset disabled={busy}>
          <div className="agenda-field-pair">
            <label>
              Código WinThor
              <input
                name="code"
                required
                maxLength={40}
                defaultValue={supplier?.code}
              />
            </label>
            <label>
              UF
              <input
                name="state"
                maxLength={2}
                defaultValue={supplier?.state}
              />
            </label>
          </div>
          <label>
            Razão social / fornecedor
            <input
              name="name"
              required
              minLength={2}
              maxLength={200}
              defaultValue={supplier?.name}
            />
          </label>
          <label>
            Nome de exibição
            <input
              name="trade_name"
              maxLength={200}
              defaultValue={supplier?.trade_name}
            />
          </label>
          <label>
            Nome do contato
            <input
              name="contact"
              maxLength={160}
              defaultValue={supplier?.contact}
            />
          </label>
          <label>
            WhatsApp com DDD
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={32}
              placeholder="(47) 99999-9999"
            />
          </label>
          <label>
            E-mail
            <input
              name="email"
              type="email"
              maxLength={254}
              defaultValue={supplier?.email}
            />
          </label>
          <label>
            Link do catálogo
            <input
              type="url"
              value={catalog}
              onChange={(e) => setCatalog(e.target.value)}
              maxLength={2000}
              placeholder="https://…"
            />
          </label>
          <button className="admin-button" disabled={busy}>
            {busy ? "Salvando…" : "Salvar fornecedor"}
          </button>
        </fieldset>
      </form>
      <div className="agenda-whatsapp">
        <h3>
          <WhatsAppIcon /> Conversar pelo WhatsApp
        </h3>
        <label>
          Mensagem para revisar
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={6000}
          />
        </label>
        <div className="agenda-actions">
          <button
            type="button"
            className="admin-text-link"
            disabled={!catalog}
            onClick={() => setMessage((m) => `${m}\n\nCatálogo: ${catalog}`)}
          >
            Incluir link do catálogo
          </button>
          {link ? (
            <a
              className="admin-button agenda-whatsapp-button"
              href={link}
              target="_blank"
              rel="noopener noreferrer"
            >
              <WhatsAppIcon /> Abrir WhatsApp
            </a>
          ) : (
            <button
              className="admin-button"
              disabled
              title="Cadastre DDD e telefone para habilitar"
            >
              <WhatsAppIcon /> Cadastrar contato
            </button>
          )}
        </div>
        <p className="agenda-hint">
          O WhatsApp abre em outra aba. Revise e envie a mensagem por lá.
          Cadastre um número que você confirmou como WhatsApp.
        </p>
      </div>
    </section>
  );
}
export default function SupplierDirectory({
  suppliers,
  save,
  busy,
}: {
  suppliers: Supplier[];
  save: Save;
  busy: boolean;
}) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(20);
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  const rows = suppliers.filter((s) =>
    normalize(
      `${s.code} ${s.name} ${s.trade_name} ${s.state} ${s.contact}`,
    ).includes(normalize(query)),
  );
  const current = suppliers.find((s) => s.id === selected);
  return (
    <>
      <SupplierImport save={save} busy={busy} />
      <div className="agenda-directory-layout">
        <section className="admin-panel">
          <header>
            <div>
              <span className="admin-eyebrow">
                RELAÇÕES QUE FAZEM A DIFERENÇA
              </span>
              <h2>
                Fornecedores <small>{suppliers.length}</small>
              </h2>
            </div>
            <button
              className="admin-button"
              onClick={() => {
                setCreating(true);
                setSelected(null);
              }}
            >
              <Plus size={16} /> Novo
            </button>
          </header>
          <label className="agenda-search">
            <Search size={17} />
            <input
              placeholder="Buscar nome, código, contato ou UF"
              aria-label="Buscar fornecedor"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(20);
              }}
            />
          </label>
          <div className="agenda-supplier-list">
            {rows.slice(0, limit).map((s) => {
              const whatsapp = whatsappLink(
                s.phone,
                `Olá! Aqui é da Pitter Pan Festas. Gostaria de falar com ${s.contact || "o responsável"}.`,
              );
              return (
                <div
                  className={`agenda-supplier-row ${selected === s.id ? "is-selected" : ""}`}
                  key={s.id}
                >
                  <button
                    onClick={() => {
                      setSelected(s.id);
                      setCreating(false);
                    }}
                  >
                    <span className="agenda-avatar">
                      <Building2 size={19} />
                    </span>
                    <span>
                      <strong>{s.trade_name || s.name}</strong>
                      <small>
                        Cód. {s.code} · {s.state || "UF não informada"}
                        {s.contact ? ` · ${s.contact}` : ""}
                      </small>
                    </span>
                  </button>
                  {whatsapp ? (
                    <a
                      href={whatsapp}
                      className="agenda-icon-button agenda-whatsapp-link"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`WhatsApp de ${s.name}`}
                    >
                      <WhatsAppIcon />
                    </a>
                  ) : (
                    <button
                      className="agenda-icon-button"
                      disabled
                      aria-label={`Cadastrar contato de ${s.name}`}
                      title="Cadastre um contato na ficha"
                    >
                      <WhatsAppIcon />
                    </button>
                  )}
                  {s.catalog_url && (
                    <a
                      className="agenda-icon-button"
                      href={s.catalog_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Catálogo de ${s.name}`}
                    >
                      <ExternalLink size={17} />
                    </a>
                  )}
                </div>
              );
            })}
            {!rows.length && (
              <div className="agenda-empty">
                {suppliers.length
                  ? "Nenhum fornecedor nesta busca."
                  : "Importe a exportação do WinThor ou cadastre seu primeiro fornecedor."}
              </div>
            )}
          </div>
          <div className="agenda-list-footer">
            <small>
              {Math.min(limit, rows.length)} de {rows.length} fornecedores
            </small>
            {rows.length > limit && (
              <button
                className="admin-button"
                onClick={() => setLimit((n) => n + 20)}
              >
                Carregar mais 20
              </button>
            )}
          </div>
        </section>
        {creating || current ? (
          <SupplierEditor
            key={creating ? "new" : `${current!.id}-${current!.revision}`}
            supplier={creating ? undefined : current}
            save={save}
            busy={busy}
            close={() => {
              setCreating(false);
              setSelected(null);
            }}
          />
        ) : (
          <aside className="admin-panel agenda-empty">
            <Building2 size={32} />
            <h2>Uma ficha para cada parceria</h2>
            <p>
              Selecione um fornecedor para completar os contatos, guardar o
              catálogo e preparar uma conversa pelo WhatsApp.
            </p>
          </aside>
        )}
      </div>
    </>
  );
}
