"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgeCheck,
  Boxes,
  CircleDollarSign,
  Package,
  RefreshCw,
  ShoppingCart,
} from "lucide-react";
import DeliveryMark from "./DeliveryMark";
import {
  deliveryKinds,
  deliveryLabels,
  type DeliveryKind,
} from "../../lib/admin/delivery";
import { cardImage } from "../../lib/catalog/image";
import PitterSpinner from "./PitterSpinner";
import type { SalesFilters } from "../../server/sales/filters";
import AdminSelect from "./AdminSelect";
import { usePartyMotion } from "./PartyExperience";
import type { readSales } from "../../server/sales/repository";
type Data = Awaited<ReturnType<typeof readSales>>;
const count = (n: string | number) =>
  new Intl.NumberFormat("pt-BR").format(Number(n));
const money = (value: string, currency: string) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(
    Number(value),
  );
const status: Record<string, string> = {
  PAID: "Pago",
  PENDING: "Pendente",
  AUTHORIZED: "Autorizado",
  PARTIALLY_PAID: "Parcialmente pago",
  PARTIALLY_REFUNDED: "Reembolso parcial",
  REFUNDED: "Reembolsado",
  VOIDED: "Anulado",
  EXPIRED: "Expirado",
  UNKNOWN: "Não informado",
};
export default function SalesDashboard() {
  const [filters, setFilters] = useState<SalesFilters>({
    status: "all",
    category: "",
    delivery: "all",
  });
  const [categoryDraft, setCategoryDraft] = useState("");
  const [moreLoading, setMoreLoading] = useState(false);
  const [moreError, setMoreError] = useState("");
  const generation = useRef(0);
  const expanded = useRef(false);
  const moreBusy = useRef(false);
  const [days, setDays] = useState(30),
    [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [syncing, setSyncing] = useState(false),
    [message, setMessage] = useState("");
  const [celebration, setCelebration] = useState<{
    id: string;
    title: string;
    delivery: string;
  } | null>(null);
  const [revision, setRevision] = useState(0);
  const cursor = useRef<string | undefined>(undefined),
    fetching = useRef(0),
    motion = usePartyMotion();
  const resetList = () => {
    generation.current++;
    expanded.current = false;
    cursor.current = undefined;
    setData(null);
    setLoading(true);
    setMoreLoading(false);
    moreBusy.current = false;
    setMoreError("");
    setError("");
  };
  useEffect(() => {
    const timer = setTimeout(() => {
      const category = categoryDraft.trim();
      if (category !== filters.category) {
        resetList();
        setFilters((old) => ({ ...old, category }));
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [categoryDraft, filters.category]);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const requestId = ++fetching.current;
      const epoch = generation.current;
      try {
        const params = new URLSearchParams({
          days: String(days),
          status: filters.status,
          category: filters.category,
          delivery: filters.delivery || "all",
        });
        if (cursor.current) params.set("after", cursor.current);
        const url = `/api/admin/sales/?${params}`;
        const response = await fetch(url, {
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(20000)])
            : AbortSignal.timeout(20000),
          cache: "no-store",
        });
        const body = await response.json();
        if (
          signal?.aborted ||
          requestId !== fetching.current ||
          epoch !== generation.current
        )
          return;
        if (!response.ok)
          throw new Error(
            body.error || "Não foi possível consultar as vendas.",
          );
        const next = body as Data;
        if (cursor.current && next.events.length)
          setCelebration({
            id: next.events[0].id,
            delivery: next.events[0].delivery_kind || "UNKNOWN",
            title:
              next.events.length > 1
                ? `${next.events.length} vendas confirmadas`
                : next.events[0].title,
          });
        cursor.current = next.cursor;
        setData(next);
        setError("");
      } catch (err) {
        if (
          requestId === fetching.current &&
          epoch === generation.current &&
          !signal?.aborted &&
          !(err instanceof Error && err.name === "AbortError")
        )
          setError(err instanceof Error ? err.message : "Falha na consulta.");
      } finally {
        if (requestId === fetching.current && epoch === generation.current)
          setLoading(false);
      }
    },
    [days, filters],
  );
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void load(controller.signal);
    const timer = window.setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        !expanded.current &&
        !moreBusy.current
      )
        void load(controller.signal);
    }, 30000);
    return () => {
      generation.current++;
      controller.abort();
      clearInterval(timer);
    };
  }, [load, revision]);
  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(() => setCelebration(null), 4500);
    return () => clearTimeout(timer);
  }, [celebration]);
  async function loadMore() {
    if (!data?.nextCursor || moreBusy.current) return;
    const epoch = generation.current;
    moreBusy.current = true;
    setMoreLoading(true);
    setMoreError("");
    // Freeze polling before fetching the next page so it cannot collapse the list.
    expanded.current = true;
    fetching.current++;
    try {
      const params = new URLSearchParams({
        view: "orders",
        days: String(days),
        status: filters.status,
        category: filters.category,
        delivery: filters.delivery || "all",
        orderCursor: data.nextCursor,
      });
      const response = await fetch(`/api/admin/sales/?${params}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });
      const body = await response.json();
      if (epoch !== generation.current) return;
      if (!response.ok)
        throw new Error(
          body.error || "Não foi possível carregar mais pedidos.",
        );
      const page = body as Pick<Data, "orders" | "hasMore" | "nextCursor">;
      setData((current) =>
        current
          ? {
              ...current,
              orders: [
                ...new Map(
                  [...current.orders, ...page.orders].map((order) => [
                    order.id,
                    order,
                  ]),
                ).values(),
              ],
              hasMore: page.hasMore,
              nextCursor: page.nextCursor,
            }
          : current,
      );
    } catch (error) {
      if (epoch === generation.current)
        setMoreError(
          error instanceof Error
            ? error.message
            : "Falha ao carregar mais pedidos.",
        );
    } finally {
      if (epoch === generation.current) {
        moreBusy.current = false;
        setMoreLoading(false);
      }
    }
  }
  async function sync() {
    setSyncing(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/sales/", { method: "POST" });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error || "Já existe uma atualização em andamento.",
        );
      setMessage(
        result.more
          ? "Etapa concluída. Há mais pedidos ou eventos; clique novamente para continuar, ou deixe o agendamento processar."
          : "Atualização concluída.",
      );
      resetList();
      setRevision((n) => n + 1);
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Não foi possível atualizar.",
      );
    } finally {
      setSyncing(false);
    }
  }
  return (
    <div className="sales-dashboard">
      <div className="sales-toolbar">
        <div>
          <label htmlFor="sales-period">Período dos pedidos</label>
          <AdminSelect
            id="sales-period"
            value={String(days)}
            label="Período dos pedidos"
            onValueChange={(value) => {
              if (Number(value) === days) return;
              resetList();
              setCelebration(null);
              setDays(Number(value));
            }}
            options={[
              { value: "7", label: "Últimos 7 dias" },
              { value: "30", label: "Últimos 30 dias" },
              { value: "60", label: "Últimos 60 dias" },
            ]}
          />
        </div>
        <div>
          <label htmlFor="sales-status">Situação do pagamento</label>
          <AdminSelect
            id="sales-status"
            label="Situação do pagamento"
            value={filters.status}
            onValueChange={(status) => {
              resetList();
              setFilters((old) => ({
                ...old,
                status: status as SalesFilters["status"],
              }));
            }}
            options={[
              { value: "all", label: "Todas as situações" },
              { value: "PAID", label: "Pago" },
              { value: "PENDING", label: "Pendente" },
              { value: "EXPIRED", label: "Expirado" },
              { value: "CANCELLED", label: "Cancelado" },
              { value: "AUTHORIZED", label: "Autorizado" },
              { value: "PARTIALLY_PAID", label: "Parcialmente pago" },
              { value: "PARTIALLY_REFUNDED", label: "Reembolso parcial" },
              { value: "REFUNDED", label: "Reembolsado" },
              { value: "VOIDED", label: "Anulado" },
              { value: "UNKNOWN", label: "Não informado" },
            ]}
          />
        </div>
        <div>
          <label htmlFor="sales-delivery-filter">Modalidade de entrega</label>
          <AdminSelect
            id="sales-delivery-filter"
            label="Modalidade de entrega"
            value={filters.delivery || "all"}
            onValueChange={(delivery) => {
              resetList();
              setFilters((old) => ({
                ...old,
                delivery: delivery as DeliveryKind | "all",
              }));
            }}
            options={[
              { value: "all", label: "Todas as modalidades" },
              ...deliveryKinds.map((kind) => ({
                value: kind,
                label: deliveryLabels[kind],
              })),
            ]}
          />
        </div>
        <div className="sales-category-filter">
          <label htmlFor="sales-category">Categoria do produto</label>
          <input
            id="sales-category"
            type="search"
            maxLength={200}
            value={categoryDraft}
            onChange={(event) => setCategoryDraft(event.target.value)}
            placeholder="Buscar qualquer categoria…"
          />
        </div>
        <button
          type="button"
          className="admin-button"
          onClick={sync}
          disabled={syncing}
        >
          <RefreshCw size={16} className={syncing ? "sales-spin" : ""} />
          {syncing ? "Atualizando…" : "Atualizar uma etapa"}
        </button>
      </div>
      <p className="sales-definition">
        Pedidos processados no período, com o estado financeiro atual.
        Recebimentos incluem frete e impostos; não são uma apuração contábil por
        data de pagamento. Pedidos de teste são excluídos.
        {filters.category &&
          " Os valores são dos pedidos completos que contêm produtos dessa categoria na última importação; o ranking inclui somente os produtos correspondentes."}
      </p>
      {error && (
        <p className="admin-data-notice" role="status">
          {error}
          {data &&
            " Os últimos dados carregados continuam abaixo e podem estar desatualizados."}
        </p>
      )}
      {message && (
        <p className="admin-inline-note" role="status">
          {message}
        </p>
      )}
      {loading && !data && (
        <div className="admin-panel" role="status">
          <PitterSpinner label="Consultando vendas…" />
        </div>
      )}
      {data && (
        <>
          {data.failed > 0 && (
            <p className="admin-data-notice" role="status">
              {data.failed} eventos precisam de revisão após dez tentativas. A
              importação dos demais pedidos continua funcionando.
            </p>
          )}
          <div
            className="sales-delivery-summary"
            aria-label="Pedidos por modalidade de entrega"
          >
            {data.deliveries.map((item) => (
              <button
                key={item.kind}
                type="button"
                onClick={() => {
                  resetList();
                  setFilters((old) => ({
                    ...old,
                    delivery: item.kind as DeliveryKind,
                  }));
                }}
              >
                <DeliveryMark kind={item.kind} />
                <strong>{count(item.orders)} pedidos</strong>
              </button>
            ))}
          </div>
          <p className="sales-definition">
            Modalidade escolhida no pedido, conforme a Shopify. O ícone não
            confirma postagem ou entrega. Pedidos com modalidades diferentes
            aparecem como múltiplos; sem identificação ficam separados.
          </p>
          <div className="sales-health">
            <span>
              <BadgeCheck size={16} />{" "}
              {data.state?.completed_at
                ? `Última conferência: ${new Date(data.state.completed_at).toLocaleString("pt-BR")}`
                : "Importação inicial ainda não concluída"}
            </span>
            <span>{data.pending} eventos aguardando processamento</span>
          </div>
          {data.state?.until_at && (
            <p className="admin-inline-note">
              Importação em andamento: os indicadores representam apenas os
              pedidos já processados. Continue a atualização para completar a
              janela.
            </p>
          )}
          {data.totals.map((t) => (
            <section
              key={t.currency}
              aria-label={`Indicadores em ${t.currency}`}
            >
              <div className="sales-currency">MOEDA DA LOJA · {t.currency}</div>
              <div className="admin-stats sales-stats">
                {[
                  {
                    label: "Recebimentos líquidos",
                    value: money(t.net, t.currency),
                    detail: "Recebido menos reembolsado",
                    icon: CircleDollarSign,
                  },
                  {
                    label: "Pedidos pagos",
                    value: count(t.paid),
                    detail: `${count(t.orders)} pedidos no período`,
                    icon: ShoppingCart,
                  },
                  {
                    label: "Ticket dos pedidos pagos",
                    value: money(t.ticket, t.currency),
                    detail: "Total médio dos pedidos com status pago",
                    icon: ArrowUpRight,
                  },
                  {
                    label: "Reembolsos",
                    value: money(t.refunded, t.currency),
                    detail: `Recebido: ${money(t.received, t.currency)}`,
                    icon: ArrowDownLeft,
                  },
                ].map(({ label, value, detail, icon: Icon }) => (
                  <div className="admin-stat admin-stat--blue" key={label}>
                    <div>
                      <span className="admin-stat-icon blue">
                        <Icon size={21} />
                      </span>
                    </div>
                    <span>{label}</span>
                    <strong>{value}</strong>
                    <small>{detail}</small>
                  </div>
                ))}
              </div>
              <p className="sales-definition">
                {count(t.pending)} pedidos aguardando pagamento/conclusão ·{" "}
                {count(t.cancelled)} cancelados. Cancelamentos podem ter valores
                recebidos ainda não reembolsados.
              </p>
            </section>
          ))}
          {!data.totals.length && (
            <div className="admin-panel sales-empty">
              <Package size={36} />
              <h2>Seu próximo capítulo de vendas</h2>
              <p>
                Nenhum pedido corresponde ao período e aos filtros escolhidos.
                Experimente outra situação, categoria ou período.
              </p>
            </div>
          )}
          <section className="sales-delivery" aria-label="Vendas confirmadas">
            <div>
              <span className="admin-eyebrow">DA LOJA PARA O PAINEL</span>
              <strong>Uma venda real. Um motivo para celebrar.</strong>
              <p role="status">
                {celebration
                  ? `Venda confirmada: ${celebration.title}`
                  : "A modalidade de entrega aparece quando um novo pagamento confirmado é recebido e processado."}
              </p>
            </div>
            <div className="sales-delivery-stage" aria-hidden="true">
              {celebration && (
                <div
                  key={celebration.id}
                  className={`sales-cart${motion ? " is-moving" : ""}`}
                >
                  <DeliveryMark kind={celebration.delivery} />
                </div>
              )}
              <span className="sales-delivery-destination">
                <Boxes size={28} />
                <b>Vendidos</b>
              </span>
            </div>
            <a className="admin-text-link" href="#sold-products">
              Ver produtos vendidos <ArrowUpRight size={16} />
            </a>
          </section>
          <div className="admin-overview-grid">
            <section className="admin-panel" id="sold-products">
              <header>
                <div>
                  <span className="admin-eyebrow">PRODUTOS VENDIDOS</span>
                  <h2>Os favoritos da festa</h2>
                </div>
                <Boxes size={22} />
              </header>
              <p className="sales-definition">
                Top 10 por unidades atuais em pedidos pagos ou reembolsados
                parcialmente. Unidades removidas e reembolsadas são descontadas;
                cancelados não entram.
              </p>
              {data.top.length ? (
                <ol className="sales-ranking">
                  {data.top.map((p, i) => (
                    <li key={p.id}>
                      <span className="sales-product-photo">
                        <img
                          src={cardImage(
                            p.image ||
                              "/assets/images/brand/product-placeholder.svg",
                            120,
                          )}
                          alt={p.title}
                          width={48}
                          height={48}
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src =
                              "/assets/images/brand/product-placeholder.svg";
                          }}
                        />
                        <small>{i + 1}</small>
                      </span>
                      <div>
                        <strong>{p.title}</strong>
                        <small>SKU {p.sku || "não informado"}</small>
                      </div>
                      <div className="sales-product-deliveries">
                        <b>
                          {count(p.units)} <small>un.</small>
                        </b>
                        {deliveryKinds.map((kind) => {
                          const value = p[`${kind.toLowerCase()}_units`];
                          return Number(value) > 0 ? (
                            <DeliveryMark
                              key={kind}
                              kind={kind}
                              units={count(value)}
                            />
                          ) : null;
                        })}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p>Sem unidades vendidas para este período.</p>
              )}
            </section>
            <section className="admin-panel">
              <header>
                <h2>Pedidos recentes</h2>
                <ShoppingCart size={22} />
              </header>
              <p className="sales-definition">
                Mostrando {data.orders.length} pedidos nesta seleção, em lotes
                de 10.
                {expanded.current &&
                  " A atualização automática da lista fica pausada durante esta consulta."}
              </p>
              <div className="admin-table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Pedido</th>
                      <th>Situação</th>
                      <th>Entrega escolhida</th>
                      <th>Total do pedido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!data.orders.length && (
                      <tr>
                        <td colSpan={4}>
                          Nenhum pedido corresponde aos filtros escolhidos.
                        </td>
                      </tr>
                    )}
                    {data.orders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <strong>{o.name}</strong>
                          <small>
                            {new Date(o.processed_at).toLocaleDateString(
                              "pt-BR",
                            )}
                          </small>
                        </td>
                        <td>
                          <span
                            className={`admin-badge ${o.cancelled_at ? "rose" : o.financial_status === "PAID" ? "green" : "blue"}`}
                          >
                            {o.cancelled_at
                              ? "Cancelado"
                              : status[o.financial_status] ||
                                o.financial_status}
                          </span>
                        </td>
                        <td>
                          <DeliveryMark kind={o.delivery_kind} />
                          {o.delivery_label && (
                            <small>{o.delivery_label}</small>
                          )}
                          <small>
                            {o.fulfillment_status === "FULFILLED"
                              ? "Atendimento concluído"
                              : o.fulfillment_status === "PARTIALLY_FULFILLED"
                                ? "Atendimento parcial"
                                : o.fulfillment_status === "UNFULFILLED"
                                  ? "Atendimento pendente"
                                  : o.fulfillment_status}
                          </small>
                        </td>
                        <td>
                          {money(o.total, o.currency)}
                          <small>
                            Líquido recebido: {money(o.net, o.currency)}
                          </small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="sales-pagination">
                {moreError && <p role="alert">{moreError}</p>}
                {data.hasMore && (
                  <button
                    type="button"
                    className="admin-button admin-button-primary"
                    disabled={moreLoading || loading}
                    onClick={loadMore}
                  >
                    {moreLoading ? (
                      <PitterSpinner label="Carregando pedidos…" />
                    ) : (
                      "Carregar mais 10"
                    )}
                  </button>
                )}
                {expanded.current && (
                  <button
                    type="button"
                    className="admin-button"
                    onClick={() => {
                      resetList();
                      setRevision((n) => n + 1);
                    }}
                  >
                    Atualizar lista
                  </button>
                )}
                {!data.hasMore && data.orders.length > 0 && (
                  <span>Todos os pedidos desta seleção foram exibidos.</span>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
