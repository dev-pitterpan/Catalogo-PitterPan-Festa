import { adminContext } from "../../../../server/admin/repository";
import {
  PageHeading,
  DataNotice,
  EmptyState,
  dateTime,
  number,
  statusLabels,
} from "../../../../components/admin/Primitives";
import { ShieldCheck, Database, RefreshCw, CheckCircle2 } from "lucide-react";
export default async function Sync() {
  const context = await adminContext();
  return (
    <>
      <PageHeading
        eyebrow="DADOS EM QUE VOCÊ PODE CONFIAR"
        title="Sincronizações, com clareza."
        description="Acompanhe importações e publicações. Uma versão em preparação nunca substitui os dados publicados."
      />
      <DataNotice context={context} />
      <div className="admin-process-grid">
        {[
          {
            icon: RefreshCw,
            title: "1. Importar",
            text: "Produtos, variantes e coleções chegam a uma versão de preparação.",
          },
          {
            icon: ShieldCheck,
            title: "2. Conferir",
            text: "Revise contagens, preços e coleções antes de publicar.",
          },
          {
            icon: CheckCircle2,
            title: "3. Publicar",
            text: "A troca é atômica: o cliente vê uma versão completa.",
          },
        ].map(({ icon: Icon, title, text }) => (
          <div className="admin-panel" key={title}>
            <Icon size={24} />
            <h2>{title}</h2>
            <p>{text}</p>
          </div>
        ))}
      </div>
      <section className="admin-panel">
        <header>
          <div>
            <span className="admin-eyebrow">RASTREABILIDADE</span>
            <h2>Histórico de importações</h2>
          </div>
          <Database size={20} />
        </header>
        {context.runs.length ? (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Iniciada em</th>
                  <th>Situação</th>
                  <th>Produtos / variantes</th>
                  <th>Imagens ausentes</th>
                  <th>Concluída em</th>
                </tr>
              </thead>
              <tbody>
                {context.runs.map((run) => (
                  <tr key={run.id}>
                    <td>
                      {dateTime(run.started_at)}
                      <small>{run.id.slice(0, 8)}</small>
                    </td>
                    <td>
                      <span
                        className={`admin-badge ${run.status === "active" ? "green" : run.status === "failed" ? "rose" : "blue"}`}
                      >
                        {statusLabels[run.status] || run.status}
                      </span>
                    </td>
                    <td>
                      {number(run.report.products)} /{" "}
                      {number(run.report.variants)}
                    </td>
                    <td>{number(run.report.missingImages)}</td>
                    <td>{dateTime(run.completed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Ainda não há importações para acompanhar"
            description="O histórico aparecerá quando a integração publicar os primeiros dados no banco do catálogo."
          />
        )}
      </section>
      <p className="admin-footnote">
        A sincronização continua sob responsabilidade do administrador. Este
        painel acompanha o processo; não inicia exportações longas durante a
        navegação.
      </p>
    </>
  );
}
