"use client";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";
import AdminSelect from "./AdminSelect";
import DateRangePicker from "./DateRangePicker";
import DeliveryMark from "./DeliveryMark";
import PitterSpinner from "./PitterSpinner";
import {
  deliveryKinds,
  deliveryLabels,
  type DeliveryKind,
} from "../../lib/admin/delivery";
import { cardImage } from "../../lib/catalog/image";
import type { SalesFilters } from "../../server/sales/filters";
import type { readSoldProducts } from "../../server/sales/repository";
type Data = Awaited<ReturnType<typeof readSoldProducts>>;
const count = (value: string | number) =>
  new Intl.NumberFormat("pt-BR").format(Number(value));
export default function SoldProductsHistory({
  initialFilters,
  initialDays = 30,
}: {
  initialFilters?: SalesFilters;
  initialDays?: number;
}) {
  const [filters, setFilters] = useState<SalesFilters>(
    initialFilters || { status: "all", category: "", delivery: "all" },
  );
  const [days, setDays] = useState(initialDays);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      view: "sold-products",
      days: String(days),
      status: filters.status,
      category: filters.category,
      delivery: filters.delivery || "all",
      start: filters.start || "",
      end: filters.end || "",
      productPage: String(page),
      productSearch: query,
    });
    void (async () => {
      try {
        const response = await fetch(`/api/admin/sales/?${params}`, {
          cache: "no-store",
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(20000),
          ]),
        });
        const body = await response.json();
        if (!response.ok)
          throw new Error(
            body.error || "Não foi possível carregar os produtos vendidos.",
          );
        if (!controller.signal.aborted) setData(body);
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Falha de conexão.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [filters, days, query, page, revision]);
  function change(next: Partial<SalesFilters>) {
    setPage(1);
    setFilters((old) => ({ ...old, ...next }));
  }
  return (
    <section className="admin-panel sold-history">
      <div className="sales-toolbar">
        <div>
          <label htmlFor="sold-product-search">Produto ou SKU</label>
          <input
            id="sold-product-search"
            type="search"
            value={search}
            maxLength={200}
            placeholder="Digite o nome ou SKU…"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="sold-period">Período dos pedidos</label>
          <AdminSelect
            id="sold-period"
            label="Período dos pedidos"
            value={String(days)}
            onValueChange={(v) => {
              setDays(Number(v));
              change({ start: "", end: "" });
            }}
            options={[
              { value: "1", label: "Hoje" },
              { value: "7", label: "Últimos 7 dias" },
              { value: "30", label: "Últimos 30 dias" },
              { value: "60", label: "Últimos 60 dias" },
            ]}
          />
        </div>
        <DateRangePicker
          value={{ start: filters.start || "", end: filters.end || "" }}
          onChange={change}
        />
        <div>
          <label htmlFor="sold-delivery">Modalidade de entrega</label>
          <AdminSelect
            id="sold-delivery"
            label="Modalidade de entrega"
            value={filters.delivery || "all"}
            onValueChange={(v) =>
              change({ delivery: v as DeliveryKind | "all" })
            }
            options={[
              { value: "all", label: "Todas as modalidades" },
              ...deliveryKinds.map((kind) => ({
                value: kind,
                label: deliveryLabels[kind],
              })),
            ]}
          />
        </div>
      </div>
      <p className="sales-definition">
        Histórico dos pedidos importados da Shopify, agrupado por variante e
        ordenado pela quantidade vendida. Unidades atuais de pedidos com
        recebimento, pagos ou parcialmente reembolsados; cancelados e reembolsos
        totais não entram. A data é a do pedido, no horário de Brasília.
      </p>
      {filters.category && (
        <p className="sales-definition">
          Categoria aplicada: {filters.category}.{" "}
          <button
            type="button"
            className="admin-text-link"
            onClick={() => change({ category: "" })}
          >
            Remover categoria
          </button>
        </p>
      )}
      {filters.status !== "all" && (
        <p className="sales-definition">
          Situação herdada da tela de vendas: {filters.status}.{" "}
          <button
            type="button"
            className="admin-text-link"
            onClick={() => change({ status: "all" })}
          >
            Ver todas as vendas elegíveis
          </button>
        </p>
      )}
      {error && (
        <p role="alert">
          {error}{" "}
          <button
            type="button"
            className="admin-text-link"
            onClick={() => setRevision((v) => v + 1)}
          >
            Tentar novamente
          </button>
        </p>
      )}
      <div className="sold-history-status" role="status">
        {loading ? (
          <>
            <PitterSpinner /> Consultando produtos vendidos…
          </>
        ) : (
          `${count(data?.total || 0)} produtos encontrados · até 10 por página`
        )}
      </div>
      <div className="admin-table-scroll" aria-busy={loading}>
        <table className="admin-table sold-history-table">
          <caption className="admin-sr-only">
            Produtos vendidos por período e modalidade de entrega
          </caption>
          <thead>
            <tr>
              <th scope="col">Produto</th>
              <th scope="col">Quantidade total</th>
              <th scope="col">Entrega escolhida</th>
              <th scope="col">Última venda no período</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="sold-history-product">
                    <img
                      src={cardImage(
                        p.image ||
                          "/assets/images/brand/product-placeholder.svg",
                        120,
                      )}
                      alt=""
                      width={48}
                      height={48}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src =
                          "/assets/images/brand/product-placeholder.svg";
                      }}
                    />
                    <div>
                      <strong>{p.title}</strong>
                      <small>SKU {p.sku || "não informado"}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <strong>{count(p.units)} un.</strong>
                </td>
                <td>
                  <div className="sales-product-deliveries">
                    {deliveryKinds.map((kind) =>
                      Number(p[`${kind.toLowerCase()}_units`]) > 0 ? (
                        <DeliveryMark
                          key={kind}
                          kind={kind}
                          units={count(p[`${kind.toLowerCase()}_units`])}
                        />
                      ) : null,
                    )}
                  </div>
                </td>
                <td>
                  <time dateTime={new Date(p.last_sold_at).toISOString()}>
                    {new Date(p.last_sold_at).toLocaleString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </time>
                </td>
              </tr>
            ))}
            {!loading && !error && !data?.items.length && (
              <tr>
                <td colSpan={4}>
                  <Package size={22} /> Nenhum produto vendido corresponde aos
                  filtros escolhidos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <nav
        className="sales-pagination"
        aria-label="Páginas de produtos vendidos"
      >
        <button
          type="button"
          className="admin-button-secondary"
          disabled={loading || !data || data.page <= 1}
          onClick={() => setPage((data?.page || 1) - 1)}
        >
          <ChevronLeft size={16} /> Anterior
        </button>
        <span>
          Página {data?.page || 1} de {data?.pages || 1}
        </span>
        <button
          type="button"
          className="admin-button-secondary"
          disabled={loading || !data || data.page >= data.pages}
          onClick={() => setPage((data?.page || 1) + 1)}
        >
          Próxima <ChevronRight size={16} />
        </button>
      </nav>
    </section>
  );
}
