import Link from "next/link";
import ChangeHistoryFilters from "../../../../components/admin/ChangeHistoryFilters";
import { dateRangeSchema } from "../../../../lib/admin/date-range";
import ProductThumbnail from "../../../../components/admin/ProductThumbnail";
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
  searchParams: Promise<{
    page?: string;
    start?: string;
    end?: string;
    kind?: string;
  }>;
}) {
  const params = await searchParams;
  const raw = params.page;
  const kind = ["added", "removed", "changed"].includes(params.kind || "")
    ? params.kind!
    : "all";
  const parsed = dateRangeSchema.safeParse({
    start: params.start || "",
    end: params.end || "",
  });
  const range = parsed.success ? parsed.data : { start: "", end: "" };
  const page = Math.max(1, Math.min(10000, Number(raw) || 1));
  const context = await adminContext();
  const data = await adminChanges(Math.floor(page), range, kind);
  const labels: Record<string, string> = {
    added: "Entrou no catálogo",
    removed: "Saiu desta versão",
    changed: "Informação alterada",
  };
  return (
    <>
      <PageHeading
        eyebrow="SHOPIFY → CATÁLOGO"
        title="Histórico de alterações"
        description="Veja o que mudou em cada publicação do catálogo. A data indica quando a sincronização foi publicada, não o horário exato da edição na Shopify. Cada versão é comparada com a publicação anterior."
      />
      <DataNotice context={context} />
      <ChangeHistoryFilters range={range} kind={kind} />
      {!parsed.success && (
        <p role="alert">Escolha um período válido de até 366 dias.</p>
      )}
      <div className="admin-mini-stats history-summary">
        {[
          ["Entraram", data.counts.added, "added"],
          ["Saíram", data.counts.removed, "removed"],
          ["Alterados", data.counts.changed, "changed"],
        ].map(([label, value, filter]) => (
          <Link
            key={String(label)}
            aria-current={kind === filter ? "page" : undefined}
            href={`/gestor/alteracoes/?${new URLSearchParams({ ...range, kind: kind === filter ? "all" : String(filter) })}`}
          >
            <span>{label}</span>
            <strong>{number(value as number | undefined)}</strong>
            <small>
              {kind === filter
                ? "Selecionado · clique para ver todos"
                : "Clique para visualizar"}
            </small>
          </Link>
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
            description="Não há diferenças registradas nas publicações deste período. Tente outro intervalo ou escolha a última publicação."
          />
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Publicado em</th>
                  <th>Produto / SKU</th>
                  <th>Alteração</th>
                  <th>Preço anterior</th>
                  <th>Preço atual</th>
                  <th>Estoque anterior</th>
                  <th>Estoque atual</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={`${item.version}-${item.id}`}>
                    <td>
                      {new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                        timeZone: "America/Sao_Paulo",
                      }).format(new Date(item.recorded_at))}
                      <small>Horário de Brasília</small>
                    </td>
                    <td>
                      <div className="admin-product-name admin-change-product">
                        <ProductThumbnail src={item.image} />
                        <div>
                          <strong>{item.name}</strong>
                          <small>SKU {item.sku || "não informado"}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`admin-badge ${item.kind === "added" ? "green" : item.kind === "removed" ? "rose" : "blue"}`}
                      >
                        {labels[item.kind]}
                      </span>
                      <small>
                        {item.kind === "added"
                          ? "Produto novo nesta versão"
                          : item.kind === "removed"
                            ? "Produto ausente nesta versão; não indica venda"
                            : item.fields.join(", ")}
                      </small>
                    </td>
                    <td>
                      {item.kind === "added"
                        ? "Não existia no catálogo"
                        : item.old_price !== null
                          ? formatMoney(
                              item.old_price,
                              item.old_currency || "BRL",
                            )
                          : "Não informado"}
                    </td>
                    <td>
                      {item.kind === "removed"
                        ? "Fora do catálogo"
                        : item.price !== null
                          ? formatMoney(item.price, item.currency || "BRL")
                          : "Não informado"}
                    </td>
                    <td>
                      {item.kind === "added"
                        ? "Não existia no catálogo"
                        : item.old_stock === null
                          ? "Não informado"
                          : `${number(item.old_stock)} un.`}
                    </td>
                    <td>
                      {item.kind === "removed"
                        ? "Fora do catálogo"
                        : item.stock === null
                          ? "Não informado"
                          : `${number(item.stock)} un.`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {context.previous && (
        <Pagination
          {...data}
          base="/gestor/alteracoes/"
          params={{ ...range, kind }}
        />
      )}
    </>
  );
}
