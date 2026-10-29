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
  const [days, setDays] = useState(30),
    [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [syncing, setSyncing] = useState(false),
    [message, setMessage] = useState("");
  const [celebration, setCelebration] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [revision, setRevision] = useState(0);
  const cursor = useRef<string | undefined>(undefined),
    fetching = useRef(0),
    motion = usePartyMotion();
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const requestId = ++fetching.current;
      try {
        const url = `/api/admin/sales/?days=${days}${cursor.current ? `&after=${cursor.current}` : ""}`;
        const response = await fetch(url, {
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(20000)])
            : AbortSignal.timeout(20000),
          cache: "no-store",
        });
        const body = await response.json();
        if (signal?.aborted || requestId !== fetching.current) return;
        if (!response.ok)
          throw new Error(
            body.error || "Não foi possível consultar as vendas.",
          );
        const next = body as Data;
        if (cursor.current && next.events.length)
          setCelebration({
            id: next.events[0].id,
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
          !signal?.aborted &&
          !(err instanceof Error && err.name === "AbortError")
        )
          setError(err instanceof Error ? err.message : "Falha na consulta.");
      } finally {
        if (requestId === fetching.current) setLoading(false);
      }
    },
    [days],
  );
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void load(controller.signal);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(controller.signal);
    }, 30000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [load, revision]);
  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(() => setCelebration(null), 4500);
    return () => clearTimeout(timer);
  }, [celebration]);
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
              cursor.current = undefined;
              setCelebration(null);
              setData(null);
              setLoading(true);
              setDays(Number(value));
            }}
            options={[
              { value: "7", label: "Últimos 7 dias" },
              { value: "30", label: "Últimos 30 dias" },
              { value: "60", label: "Últimos 60 dias" },
            ]}
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
          Consultando vendas…
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
                Nenhum pedido real foi importado neste período. Execute a
                importação inicial ou escolha outro período.
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
                  : "O carrinho aparece quando um novo pagamento confirmado é recebido e processado."}
              </p>
            </div>
            <div className="sales-delivery-stage" aria-hidden="true">
              {celebration && (
                <div
                  key={celebration.id}
                  className={`sales-cart${motion ? " is-moving" : ""}`}
                >
                  <Package size={21} />
                  <ShoppingCart size={49} />
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
                      <span>{i + 1}</span>
                      <div>
                        <strong>{p.title}</strong>
                        <small>SKU {p.sku || "não informado"}</small>
                      </div>
                      <b>
                        {count(p.units)} <small>un.</small>
                      </b>
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
                Últimos 30 pedidos importados no período.
              </p>
              <div className="admin-table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Pedido</th>
                      <th>Situação</th>
                      <th>Total do pedido</th>
                    </tr>
                  </thead>
                  <tbody>
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
            </section>
          </div>
        </>
      )}
    </div>
  );
}
