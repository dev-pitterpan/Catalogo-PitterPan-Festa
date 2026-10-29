import SyncControl from "../../../../components/admin/SyncControl";
import { requireSession } from "../../../../server/auth/session";
import { adminContext } from "../../../../server/admin/repository";
import {
  PageHeading,
  DataNotice,
  EmptyState,
  dateTime,
  number,
  statusLabels,
} from "../../../../components/admin/Primitives";
import { Database } from "lucide-react";
export default async function Sync() {
  const user = await requireSession();
  const context = await adminContext();
  return (
    <>
      <PageHeading
        eyebrow="DADOS EM QUE VOCÊ PODE CONFIAR"
        title="Sincronização da loja."
        description="Atualize os dados da Shopify e acompanhe o andamento por aqui."
      />
      <DataNotice context={context} />
      {(user.role === "admin" || user.role === "gerente_compras") && (
        <SyncControl />
      )}
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
    </>
  );
}
