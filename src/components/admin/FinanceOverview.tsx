"use client";
import { useEffect, useState, useId } from "react";
import { ArrowDownLeft, ArrowUpRight, Wallet, Undo2 } from "lucide-react";
import type { readSalesFinance } from "../../server/sales/repository";
import { RevenueChart, numberValue } from "./AnalyticsCharts";
import AdminSelect from "./AdminSelect";
import PitterSpinner from "./PitterSpinner";
import { shiftDate } from "../../lib/admin/date-range";
type Data = Awaited<ReturnType<typeof readSalesFinance>>;
const labels: Record<string, string> = {
  PAID: "Pago",
  PENDING: "Pendente",
  AUTHORIZED: "Autorizado",
  PARTIALLY_PAID: "Parcialmente pago",
  PARTIALLY_REFUNDED: "Estorno parcial",
  REFUNDED: "Estornado",
  EXPIRED: "Expirado",
  VOIDED: "Anulado",
  UNKNOWN: "Não informado",
};
const colors: Record<string, string> = {
  PAID: "#2659a4",
  PENDING: "#f2c43d",
  AUTHORIZED: "#8a75d7",
  PARTIALLY_PAID: "#49a699",
  PARTIALLY_REFUNDED: "#ee9862",
  REFUNDED: "#d76a89",
  EXPIRED: "#93a4ba",
  VOIDED: "#626d82",
  UNKNOWN: "#bac7d6",
};
export default function FinanceOverview({ params }: { params: string }) {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [currency, setCurrency] = useState("BRL"),
    [metric, setMetric] = useState("net"),
    [active, setActive] = useState<string | null>(null);
  const id = useId();
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setData(null);
    setError("");
    setActive(null);
    void fetch(`/api/admin/sales/?${params}&view=finance`, {
      cache: "no-store",
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]),
    })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok)
          throw new Error(
            body.error || "Não foi possível consultar os recebimentos.",
          );
        if (!controller.signal.aborted) {
          setData(body);
          setCurrency(
            body.totals?.some((t: { currency: string }) => t.currency === "BRL")
              ? "BRL"
              : body.totals?.[0]?.currency || "BRL",
          );
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Falha na consulta.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [params]);
  const money = (v: unknown) => {
    const n = numberValue(v);
    return n === null
      ? "—"
      : new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(
          n,
        );
  };
  if (busy)
    return (
      <div className="admin-panel">
        <PitterSpinner label="Conferindo recebimentos, estornos e situações…" />
      </div>
    );
  if (error)
    return (
      <div className="admin-data-notice" role="alert">
        {error} Os relatórios do Shopify Analytics continuam abaixo; eles não
        substituem a conferência dos pagamentos.
      </div>
    );
  if (!data?.totals.length)
    return (
      <div className="admin-panel analytics-empty">
        Nenhum pedido sincronizado neste período. Confira a última sincronização
        antes de concluir que não houve vendas.
      </div>
    );
  const totals = data.totals.find((t) => t.currency === currency)!;
  const statuses = data.statuses.filter((s) => s.currency === currency),
    total = Number(totals.orders),
    selected = statuses.find((s) => s.status === active);
  let offset = 0;
  const sectors = statuses.map((s) => {
    const size = (100 * Number(s.orders)) / total,
      sector = { ...s, size, offset };
    offset += size;
    return sector;
  });
  const daily = new Map(
    data.daily.filter((r) => r.currency === currency).map((r) => [r.day, r]),
  );
  const rows = [];
  for (
    let day = data.window.start;
    day <= data.window.end;
    day = shiftDate(day, 1)
  )
    rows.push(
      daily.get(day) || {
        day,
        currency,
        orders: "0",
        received: "0",
        refunded: "0",
        net: "0",
      },
    );
  const table = { columns: [], rows };
  const metricName =
    metric === "net"
      ? "Líquido após estornos"
      : metric === "refunded"
        ? "Estornos / reembolsos"
        : "Recebido confirmado";
  return (
    <section
      className="finance-overview"
      aria-label="Conferência financeira dos pedidos"
    >
      <div className="finance-heading">
        <div>
          <span className="analytics-eyebrow">
            DINHEIRO RECEBIDO E SITUAÇÃO DOS PEDIDOS
          </span>
          <p>
            Pedidos do período · valores acumulados até a última sincronização.
          </p>
        </div>
        {data.totals.length > 1 && (
          <AdminSelect
            label="Moeda"
            value={currency}
            onValueChange={setCurrency}
            options={data.totals.map((t) => ({
              value: t.currency,
              label: t.currency,
            }))}
          />
        )}
      </div>
      <div className="finance-kpis">
        {[
          {
            key: "received",
            label: "Recebido confirmado",
            hint: "Inclui pagamentos parciais e pedidos posteriormente cancelados.",
            Icon: ArrowUpRight,
            tone: "blue",
          },
          {
            key: "refunded",
            label: "Estornos / reembolsos",
            hint: `${totals.refunded_orders} pedidos com devolução de dinheiro, total ou parcial.`,
            Icon: Undo2,
            tone: "rose",
          },
          {
            key: "net",
            label: "Líquido após estornos",
            hint: "Recebido − estornado. Não representa lucro nem repasse bancário.",
            Icon: Wallet,
            tone: "teal",
          },
          {
            key: "outstanding",
            label: "Ainda a receber",
            hint: `${totals.pending} pedidos pendentes, autorizados ou parcialmente pagos, sem cancelamento.`,
            Icon: ArrowDownLeft,
            tone: "gold",
          },
        ].map(({ key, label, hint, Icon, tone }) => (
          <article key={key} className={`finance-kpi finance-kpi--${tone}`}>
            <span>
              <Icon size={17} />
              {label}
            </span>
            <strong>{money(totals[key])}</strong>
            <small>{hint}</small>
          </article>
        ))}
      </div>
      <div className="finance-chart-grid">
        <section className="admin-panel finance-line-panel">
          <header>
            <div>
              <span className="analytics-eyebrow">VISÃO FINANCEIRA</span>
              <h2>Recebimentos dos pedidos ao longo do tempo</h2>
            </div>
            <AdminSelect
              label="Indicador financeiro"
              value={metric}
              onValueChange={setMetric}
              options={[
                { value: "net", label: "Líquido" },
                { value: "received", label: "Recebido" },
                { value: "refunded", label: "Estornado" },
              ]}
            />
          </header>
          <RevenueChart
            table={table}
            currency={currency}
            money={money}
            metricKey={metric}
            metricLabel={metricName}
            showTable={false}
          />
          <p className="finance-chart-caption">
            Agrupado pela data do pedido, não pela data de cada pagamento ou
            estorno.
          </p>
        </section>
        <section className="admin-panel finance-donut-panel">
          <header>
            <div>
              <span className="analytics-eyebrow">SITUAÇÃO ATUAL</span>
              <h2>Pedidos por pagamento</h2>
            </div>
            <span className="finance-count">
              {total.toLocaleString("pt-BR")} pedidos
            </span>
          </header>
          <div className="finance-donut-layout">
            <svg viewBox="0 0 240 240" role="group" aria-labelledby={id}>
              <title id={id}>
                Distribuição de pedidos por situação do pagamento
              </title>
              <circle
                cx="120"
                cy="120"
                r="86"
                fill="none"
                stroke="#edf2f8"
                strokeWidth="28"
              />
              {sectors.map((s) => (
                <circle
                  key={s.status}
                  cx="120"
                  cy="120"
                  r="86"
                  fill="none"
                  stroke={colors[s.status] || colors.UNKNOWN}
                  strokeWidth={active === s.status ? 34 : 28}
                  pathLength="100"
                  strokeDasharray={`${s.size} ${100 - s.size}`}
                  strokeDashoffset={-s.offset}
                  transform="rotate(-90 120 120)"
                  tabIndex={0}
                  role="button"
                  aria-label={`${labels[s.status] || s.status}: ${s.orders} pedidos. Valor dos pedidos: ${money(s.order_value)}.`}
                  onPointerEnter={() => setActive(s.status)}
                  onFocus={() => setActive(s.status)}
                  onClick={() => setActive(s.status)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActive(s.status);
                    }
                  }}
                />
              ))}
              <text
                x="120"
                y="114"
                textAnchor="middle"
                className="finance-donut-value"
              >
                {selected ? selected.orders : total.toLocaleString("pt-BR")}
              </text>
              <text
                x="120"
                y="137"
                textAnchor="middle"
                className="finance-donut-label"
              >
                {selected
                  ? labels[selected.status] || selected.status
                  : "pedidos"}
              </text>
            </svg>
            <div className="finance-donut-legend">
              {statuses.map((s) => (
                <button
                  key={s.status}
                  className={active === s.status ? "is-selected" : ""}
                  onClick={() =>
                    setActive(active === s.status ? null : s.status)
                  }
                >
                  <i
                    style={{ background: colors[s.status] || colors.UNKNOWN }}
                  />
                  <span>{labels[s.status] || s.status}</span>
                  <strong>{s.orders}</strong>
                </button>
              ))}
            </div>
          </div>
          <p className="finance-chart-caption">
            {selected
              ? `${labels[selected.status] || selected.status}: ${money(selected.order_value)} em pedidos; ${money(selected.received)} recebido e ${money(selected.refunded)} estornado.`
              : "Passe pelo círculo ou selecione uma situação para conferir os valores."}
          </p>
        </section>
      </div>
      <div className="finance-exceptions">
        {[
          {
            label: "Expirados",
            n: totals.expired,
            value: totals.expired_value,
          },
          { label: "Anulados", n: totals.voided, value: totals.voided_value },
          {
            label: "Cancelados",
            n: totals.cancelled,
            value: totals.cancelled_value,
          },
        ].map((s) => (
          <article key={s.label}>
            <span>
              {s.label}
              <b>{s.n} pedidos</b>
            </span>
            <strong>{money(s.value)}</strong>
            <small>Valor dos pedidos; não é recebimento.</small>
          </article>
        ))}
      </div>
      <details className="finance-details">
        <summary>Conferir os valores por situação</summary>
        <div
          className="finance-table-viewport"
          role="region"
          tabIndex={0}
          aria-label="Tabela financeira com rolagem"
        >
          <table className="admin-table">
            <thead>
              <tr>
                <th>Pagamento</th>
                <th>Pedidos</th>
                <th>Valor dos pedidos</th>
                <th>Recebido</th>
                <th>Estornado</th>
                <th>Líquido</th>
              </tr>
            </thead>
            <tbody>
              {statuses.map((s) => (
                <tr key={s.status}>
                  <td>{labels[s.status] || s.status}</td>
                  <td>{s.orders}</td>
                  <td>{money(s.order_value)}</td>
                  <td>{money(s.received)}</td>
                  <td>{money(s.refunded)}</td>
                  <td>{money(s.net)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th>Total</th>
                <td>{totals.orders}</td>
                <td>—</td>
                <td>{money(totals.received)}</td>
                <td>{money(totals.refunded)}</td>
                <td>{money(totals.net)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </details>
      <p className="finance-definition">
        Expirado é o estado informado pela Shopify; um pedido pendente não é
        tratado como expirado por tempo. Cancelamento e pagamento são campos
        independentes: um cancelado pode estar pago ou estornado. Não some o
        quadro de cancelamentos à distribuição por pagamento.
      </p>
      {Number(totals.inconsistent) > 0 && (
        <p className="admin-data-notice">
          {totals.inconsistent} pedidos têm divergência entre o líquido
          informado e recebido menos estornado. Sincronize para conferir; os
          totais acima usam a subtração.
        </p>
      )}
      <p className="finance-source">
        Fonte: pedidos sincronizados da Shopify ·{" "}
        {data.state?.completed_at
          ? `Última conferência: ${new Date(data.state.completed_at).toLocaleString("pt-BR", { timeZone: data.timezone })}`
          : "Importação inicial não concluída"}
        {data.state?.until_at &&
          " · Importação em andamento: valores parciais."}
        . Dias sem pedidos sincronizados aparecem como zero; isto não garante
        uma sincronização completa.
      </p>
    </section>
  );
}
