import { requireSession } from "../../../../server/auth/session";
import { adminContext } from "../../../../server/admin/repository";
import {
  PageHeading,
  DataNotice,
} from "../../../../components/admin/Primitives";
import SettingsForm from "../../../../components/admin/SettingsForm";
import { ShieldCheck, Boxes, Link as LinkIcon } from "lucide-react";
export default async function Settings() {
  await requireSession(["admin"]);
  const context = await adminContext();
  return (
    <>
      <PageHeading
        eyebrow="A GESTÃO, DO SEU JEITO"
        title="Cada detalhe, configurado."
        description="Defina os alertas da operação e acompanhe o estado das integrações com segurança."
      />
      <DataNotice context={context} />
      <div className="admin-settings-grid">
        <section className="admin-panel">
          <header>
            <div>
              <span className="admin-eyebrow">ALERTAS INTELIGÍVEIS</span>
              <h2>Limites de estoque</h2>
            </div>
            <Boxes size={22} />
          </header>
          <SettingsForm
            {...context.settings}
            ready={context.source === "postgres"}
          />
        </section>
        <section className="admin-panel">
          <header>
            <h2>Acesso e integrações</h2>
            <ShieldCheck size={22} />
          </header>
          <dl className="admin-settings-list">
            <div>
              <dt>Sessão da equipe</dt>
              <dd>8 horas · cookie protegido</dd>
            </div>
            <div>
              <dt>Origem da vitrine</dt>
              <dd>{process.env.CATALOG_DATA_SOURCE || "json"}</dd>
            </div>
            <div>
              <dt>Dados do painel</dt>
              <dd>
                {context.source === "postgres"
                  ? "Importação publicada"
                  : context.source === "json"
                    ? "Arquivos locais"
                    : "Aguardando preparação"}
              </dd>
            </div>
            <div>
              <dt>Shopify</dt>
              <dd>
                {process.env.SHOPIFY_STORE_DOMAIN
                  ? "Domínio configurado"
                  : "Aguardando configuração"}
              </dd>
            </div>
          </dl>
          <p className="admin-inline-note">
            Credenciais não são exibidas nem editadas pelo painel. A mudança da
            origem da vitrine exige uma importação conferida pelo administrador.
          </p>
          <div className="admin-settings-tip">
            <LinkIcon size={19} />
            <p>
              Compartilhe apenas os links públicos dos catálogos. Os links da
              área do gestor exigem login.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
