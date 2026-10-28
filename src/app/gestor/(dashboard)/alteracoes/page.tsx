import {
  adminContext,
  adminChanges,
} from "../../../../server/admin/repository";
import {
  PageHeading,
  DataNotice,
  EmptyState,
  Pagination,
  number,
} from "../../../../components/admin/Primitives";
import { formatMoney } from "../../../../lib/money";
export default async function Changes({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const raw = (await searchParams).page;
  const page = Math.max(1, Math.min(10000, Number(raw) || 1));
  const context = await adminContext();
  const data = await adminChanges(Math.floor(page));
  const labels: Record<string, string> = {
    added: "Entrou no catálogo",
    removed: "Saiu desta versão",
    changed: "Informação alterada",
  };
  return (
    <>
      <PageHeading
        eyebrow="ACOMPANHE CADA MOVIMENTO"
        title="O que entrou. O que mudou."
        description="Comparação das versões publicadas por ID de variante. Sair do catálogo não significa que o produto foi vendido."
      />
      <DataNotice context={context} />
      <div className="admin-mini-stats">
        {[
          ["Entraram", context.changes?.added],
          ["Saíram", context.changes?.removed],
          ["Alterados", context.changes?.changed],
        ].map(([label, value]) => (
          <div key={String(label)}>
            <span>{label}</span>
            <strong>{number(value as number | undefined)}</strong>
          </div>
        ))}
      </div>
      <section className="admin-panel">
        {!context.previous ? (
          <EmptyState
            title="Uma história que começa agora"
            description="A comparação ficará disponível após duas importações publicadas. A primeira versão é a referência inicial."
          />
        ) : !data.items.length ? (
          <EmptyState
            title="Nenhuma alteração encontrada"
            description="As versões comparadas têm os mesmos dados acompanhados pelo painel."
          />
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Produto / SKU</th>
                  <th>Movimento</th>
                  <th>Preço anterior → atual</th>
                  <th>Estoque anterior → atual</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      <small>SKU {item.sku || "não informado"}</small>
                    </td>
                    <td>
                      <span
                        className={`admin-badge ${item.kind === "added" ? "green" : item.kind === "removed" ? "rose" : "blue"}`}
                      >
                        {labels[item.kind]}
                      </span>
                    </td>
                    <td>
                      {item.old_price
                        ? formatMoney(item.old_price, "BRL")
                        : "—"}{" "}
                      → {item.price ? formatMoney(item.price, "BRL") : "—"}
                    </td>
                    <td>
                      {number(item.old_stock)} → {number(item.stock)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {context.previous && <Pagination {...data} base="/gestor/alteracoes/" />}
    </>
  );
}
