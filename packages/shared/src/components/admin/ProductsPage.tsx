import {
  adminContext,
  adminProducts,
  adminQuerySchema,
} from "../../server/admin/repository";
import { DataNotice, PageHeading, Pagination, number } from "./Primitives";
import ProductList from "./ProductList";
export default async function ProductsPage({
  searchParams,
  mode = "products",
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  mode?: "products" | "stock" | "offers";
}) {
  const raw = await searchParams;
  const parsed = adminQuerySchema.safeParse({
    ...raw,
    ...(mode === "offers" ? { offers: "1" } : {}),
  });
  const query = parsed.success
    ? parsed.data
    : adminQuerySchema.parse({ offers: mode === "offers" ? "1" : "0" });
  const context = await adminContext(),
    result = await adminProducts(query);
  const base =
    mode === "stock"
      ? "/gestor/estoque/"
      : mode === "offers"
        ? "/gestor/ofertas/"
        : "/gestor/produtos/";
  return (
    <>
      <PageHeading
        eyebrow={
          mode === "stock"
            ? "CADA UNIDADE CONTA"
            : mode === "offers"
              ? "OPORTUNIDADES DA LOJA"
              : "SEU MIX, ORGANIZADO"
        }
        title={
          mode === "stock"
            ? "Estoque sob controle."
            : mode === "offers"
              ? "Boas ofertas. Grandes festas."
              : "Todos os produtos."
        }
        description={
          mode === "stock"
            ? "Quantidades agregadas da última importação. Não representam uma reserva ou disponibilidade por loja."
            : mode === "offers"
              ? "Variantes com preço menor que o preço anterior cadastrado. Vigência e regras finais são confirmadas na loja."
              : "Encontre produtos por nome, SKU ou marca e consulte os detalhes da sua seleção."
        }
      />
      <DataNotice context={context} />
      {mode === "stock" && (
        <div className="admin-mini-stats">
          {[
            ["Estoque baixo", context.summary?.low],
            ["Sem estoque", context.summary?.out],
            ["Estoque alto", context.summary?.high],
            ["Não informado", context.summary?.unknown],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <span>{label}</span>
              <strong>{number(value as number | undefined)}</strong>
            </div>
          ))}
        </div>
      )}
      <ProductList
        products={result.products}
        query={query}
        base={base}
        settings={context.settings}
      />
      <Pagination
        {...result}
        base={base}
        params={Object.fromEntries(
          Object.entries(query).map(([k, v]) => [k, String(v)]),
        )}
      />
    </>
  );
}
