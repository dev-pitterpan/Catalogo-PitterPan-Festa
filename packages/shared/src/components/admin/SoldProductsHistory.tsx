"use client";
import { useEffect, useState } from "react";
import { Boxes, ChevronLeft, ChevronRight, Search } from "lucide-react";
import DeliveryMark from "./DeliveryMark";
import PitterSpinner from "./PitterSpinner";
import { deliveryKinds } from "../../lib/admin/delivery";
import { compactQuantity, exactQuantity } from "../../lib/admin/quantity";
import { cardImage } from "../../lib/catalog/image";
import type { SalesFilters } from "../../server/sales/filters";
import type { readSoldProducts } from "../../server/sales/repository";
type Data = Awaited<ReturnType<typeof readSoldProducts>>;
const count = (value: string | number) =>
  new Intl.NumberFormat("pt-BR").format(Number(value));
export default function SoldProductsHistory({
  filters,
  days,
  revision = 0,
}: {
  filters: SalesFilters;
  days: number;
  revision?: number;
}) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
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
      fulfillment: filters.fulfillment || "all",
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
  }, [filters, days, query, page, revision, retry]);
  return (
    <section className="admin-panel sold-history" id="sold-products">
      <header>
        <div>
          <span className="admin-eyebrow">PRODUTOS VENDIDOS</span>
          <h2>Os favoritos da festa</h2>
        </div>
        <Boxes size={22} />
      </header>
      <p className="sales-definition">
        Histórico dos pedidos importados, agrupado por variante e ordenado pela
        quantidade vendida. Usa os filtros de período, situação, categoria e
        entrega desta página. Unidades removidas e reembolsadas são descontadas;
        cancelados e reembolsos totais não entram.
      </p>
      <div className="sales-toolbar">
        <div>
          <label htmlFor="sold-product-search">Produto ou SKU</label>
          <div className="admin-filter-search sold-product-search">
            <Search size={16} aria-hidden="true" />
            <input
              id="sold-product-search"
              type="search"
              value={search}
              maxLength={200}
              placeholder="Digite o nome ou SKU…"
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>
      {error && (
        <p role="alert">
          {error}{" "}
          <button
            type="button"
            className="admin-text-link"
            onClick={() => setRetry((v) => v + 1)}
          >
            Tentar novamente
          </button>
        </p>
      )}
      <div className="sold-history-status" role="status">
        {loading ? (
          <PitterSpinner label="Consultando produtos vendidos…" />
        ) : (
          `${count(data?.total || 0)} produtos encontrados · até 10 por página`
        )}
      </div>
      <div aria-busy={loading}>
        <ol className="sales-ranking" start={((data?.page || 1) - 1) * 10 + 1}>
          {data?.items.map((p, i) => (
            <li key={p.id}>
              <span className="sales-product-photo">
                <img
                  src={cardImage(
                    p.image || "/assets/images/brand/product-placeholder.svg",
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
                <small>{(data.page - 1) * 10 + i + 1}</small>
              </span>
              <div>
                <strong>{p.title}</strong>
                <small>SKU {p.sku || "não informado"}</small>
              </div>
              <div className="sales-product-deliveries">
                <b title={`${exactQuantity(p.units)} unidades no total`}>
                  {compactQuantity(p.units)} <small>un.</small>
                </b>
                {deliveryKinds.map((kind) =>
                  Number(p[`${kind.toLowerCase()}_units`]) > 0 ? (
                    <DeliveryMark
                      key={kind}
                      kind={kind}
                      units={compactQuantity(p[`${kind.toLowerCase()}_units`])}
                      exactUnits={exactQuantity(
                        p[`${kind.toLowerCase()}_units`],
                      )}
                    />
                  ) : null,
                )}
              </div>
            </li>
          ))}
        </ol>
        {!loading && !error && !data?.items.length && (
          <p>Nenhum produto vendido corresponde aos filtros escolhidos.</p>
        )}
      </div>
      <nav
        className="sales-pagination"
        aria-label="Páginas de produtos vendidos"
      >
        <button
          type="button"
          className="admin-button"
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
          className="admin-button"
          disabled={loading || !data || data.page >= data.pages}
          onClick={() => setPage((data?.page || 1) + 1)}
        >
          Próxima <ChevronRight size={16} />
        </button>
      </nav>
    </section>
  );
}
