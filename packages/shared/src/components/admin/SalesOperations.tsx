"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Clock3, RefreshCw, Undo2 } from "lucide-react";
import type { readSalesOperations } from "../../server/sales/repository";
import { salesLink, salesOverviewCards } from "../../lib/admin/sales-links";
import { fulfillmentLabels } from "../../lib/admin/fulfillment";
import OrderFulfillmentDetails from "./OrderFulfillmentDetails";
import ShippingCharge from "./ShippingCharge";
import DeliveryMark from "./DeliveryMark";
import PitterSpinner from "./PitterSpinner";
import DragScroll from "./DragScroll";

type Data = Awaited<ReturnType<typeof readSalesOperations>>;
const count = (value: string | number) => Number(value).toLocaleString("pt-BR");
const money = (value: string, currency: string) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(
    Number(value),
  );
const date = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
export default function SalesOperations({
  params,
  overview = false,
}: {
  params: string;
  overview?: boolean;
}) {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    void fetch(`/api/admin/sales/?${params}&view=operations`, {
      cache: "no-store",
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]),
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(
            body.error || "Não foi possível consultar a operação.",
          );
        if (!controller.signal.aborted) setData(body);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            "Não foi possível conferir a operação. Consulte Vendas e pedidos ou tente novamente.",
          );
      });
    return () => controller.abort();
  }, [params, revision]);
  const filters = new URLSearchParams(params);
  const operationHref = salesLink(
    filters,
    { fulfillment: "AWAITING" },
    "recent-orders",
  );
  const refundsHref = salesLink(
    filters,
    { status: "REFUNDS" },
    "recent-orders",
  );
  const orderHref = (id: string) =>
    `https://${data!.store}/admin/orders/${id.split("/").at(-1)}`;
  return (
    <section
      id="sales-operations"
      className="sales-operations"
      aria-label={
        overview ? "Resumo da operação de vendas" : "Atendimentos e reembolsos"
      }
    >
      <header className="sales-operations-heading">
        <div>
          <span className="admin-eyebrow">
            {overview
              ? "SUA OPERAÇÃO · ÚLTIMOS 30 DIAS"
              : "CONFERÊNCIA DOS PEDIDOS"}
          </span>
          <h2>
            {overview
              ? "Vendas e pontos de atenção"
              : "Atendimentos e reembolsos"}
          </h2>
          <p>
            {overview
              ? "Recebimentos e pendências do histórico sincronizado, separados do catálogo."
              : "Respeita os filtros desta página. Pagamento, atendimento e cancelamento são situações independentes."}
          </p>
        </div>
        <button
          className="admin-button"
          type="button"
          onClick={() => setRevision((r) => r + 1)}
          aria-label="Atualizar resumo da operação"
        >
          <RefreshCw size={15} /> Atualizar
        </button>
      </header>
      {error ? (
        <div className="admin-data-notice" role="alert">
          {error}
        </div>
      ) : !data ? (
        <PitterSpinner label="Conferindo a operação da loja…" />
      ) : (
        <>
          <p className="sales-operations-coverage">
            {data.state?.completed_at
              ? `Última conferência: ${date(data.state.completed_at)} · Horário de Brasília`
              : "Histórico ainda sem sincronização concluída. Os resultados podem estar incompletos."}
            {data.state?.until_at && " · Sincronização em andamento"}
            {data.pending > 0 &&
              ` · ${count(data.pending)} eventos aguardando processamento`}
            {data.failed > 0 &&
              ` · ${count(data.failed)} eventos precisam de nova tentativa em Vendas e pedidos`}
          </p>
          {overview &&
            data.totals.map((t) => {
              const f = data.fulfillment.find(
                (row) => row.currency === t.currency,
              );
              return (
                <div
                  key={t.currency}
                  className="admin-stats sales-operations-stats"
                >
                  {salesOverviewCards(filters).map((card) => {
                    const metrics = {
                      received: {
                        value: money(t.received, t.currency),
                        hint: `${count(t.orders)} pedidos no período`,
                      },
                      net: {
                        value: money(t.net, t.currency),
                        hint: "Recebido − reembolsado; não é lucro",
                      },
                      refunds: {
                        value: money(t.refunded, t.currency),
                        hint: `${count(t.refunded_orders)} pedidos · total ou parcial`,
                      },
                      awaiting: {
                        value: count(f?.awaiting || 0),
                        hint: `Pagos com saldo líquido positivo · ${count(f?.ready || 0)} prontos para retirada`,
                      },
                    }[card.key];
                    return (
                      <Link
                        className="admin-stat admin-stat--blue"
                        href={card.href}
                        key={card.label}
                      >
                        <div>
                          <span className="admin-stat-icon blue">
                            <ArrowUpRight size={20} />
                          </span>
                        </div>
                        <span>{card.label}</span>
                        <strong>{metrics.value}</strong>
                        <small>{metrics.hint}</small>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          {!data.totals.length ? (
            <p className="admin-inline-note">
              Nenhum pedido sincronizado corresponde ao período e aos filtros.
              Confira a sincronização antes de concluir que não houve vendas.
            </p>
          ) : (
            <div className="sales-operations-grid">
              <section className="admin-panel">
                <header>
                  <div>
                    <span className="admin-eyebrow">PAGAMENTO CONFIRMADO</span>
                    <h3>Atendimentos em aberto</h3>
                  </div>
                  <Clock3 size={19} />
                </header>
                <p className="sales-operations-note">
                  Até {overview ? 3 : 10} pedidos, dos mais antigos aos mais
                  recentes. Inclui os prontos para retirada. Atendimento
                  concluído não comprova entrega ao cliente.
                </p>
                {!data.awaiting.length ? (
                  <p className="admin-inline-note">
                    Nenhum pedido pago com atendimento em aberto nesta seleção.
                  </p>
                ) : (
                  <ul className="sales-operations-orders">
                    {data.awaiting.slice(0, overview ? 3 : 10).map((o) => (
                      <li key={o.id}>
                        <div>
                          <a
                            href={orderHref(o.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {o.name} <ArrowUpRight size={13} />
                            <span className="admin-sr-only">
                              Abrir pedido na Shopify em nova aba
                            </span>
                          </a>
                          <small>{date(o.processed_at)}</small>
                          <OrderFulfillmentDetails
                            id={o.id}
                            name={o.name}
                            storedStatus={o.fulfillment_status}
                          />
                        </div>
                        <div>
                          <DeliveryMark kind={o.delivery_kind} />
                          <ShippingCharge order={o} />
                          <small>
                            {fulfillmentLabels[o.fulfillment_status] ||
                              o.fulfillment_status}
                          </small>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {overview && (
                  <Link className="admin-text-link" href={operationHref}>
                    Conferir atendimentos <ArrowUpRight size={14} />
                  </Link>
                )}
              </section>
              <section className="admin-panel">
                <header>
                  <div>
                    <span className="admin-eyebrow">DINHEIRO DEVOLVIDO</span>
                    <h3>Pedidos com reembolso</h3>
                  </div>
                  <Undo2 size={19} />
                </header>
                <p className="sales-operations-note">
                  Até {overview ? 3 : 10} pedidos mais recentes. Valores
                  acumulados por pedido; a data abaixo é a da compra, não a do
                  estorno.
                </p>
                {!data.refunds.length ? (
                  <p className="admin-inline-note">
                    Nenhum pedido com valor reembolsado nesta seleção.
                  </p>
                ) : (
                  <DragScroll label="Conferência de reembolsos">
                    <table className="admin-table sales-refunds-table">
                      <thead>
                        <tr>
                          <th>Pedido / compra</th>
                          <th>Recebido</th>
                          <th>Reembolsado</th>
                          <th>Líquido</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.refunds.slice(0, overview ? 3 : 10).map((o) => (
                          <tr key={o.id}>
                            <td>
                              <a
                                href={orderHref(o.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {o.name}
                                <span className="admin-sr-only">
                                  {" "}
                                  · Abrir na Shopify em nova aba
                                </span>
                              </a>
                              <small>{date(o.processed_at)}</small>
                              <OrderFulfillmentDetails
                                id={o.id}
                                name={o.name}
                              />
                              <small>
                                {o.financial_status === "REFUNDED"
                                  ? "Reembolso total"
                                  : o.financial_status === "PARTIALLY_REFUNDED"
                                    ? "Reembolso parcial"
                                    : "Com reembolso"}
                                {o.cancelled_at ? " · Cancelado" : ""}
                              </small>
                            </td>
                            <td>{money(o.received, o.currency)}</td>
                            <td>{money(o.refunded, o.currency)}</td>
                            <td>{money(o.net, o.currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </DragScroll>
                )}
                <Link className="admin-text-link" href={refundsHref}>
                  Ver todos os pedidos com reembolso <ArrowUpRight size={14} />
                </Link>
              </section>
            </div>
          )}
          <p className="sales-operations-note">
            Período pela data de processamento do pedido, com recebimentos e
            reembolsos acumulados até a última sincronização. Não representa
            repasse bancário.
          </p>
        </>
      )}
    </section>
  );
}
