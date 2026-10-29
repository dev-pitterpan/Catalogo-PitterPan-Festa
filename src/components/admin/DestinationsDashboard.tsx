"use client";
import { useEffect, useState } from "react";
import AdminSelect from "./AdminSelect";
import PitterSpinner from "./PitterSpinner";
import DeliveryMark from "./DeliveryMark";
import DeliveryMap from "./DeliveryMap";
import { deliveryLabels } from "../../lib/admin/delivery";
import type { readDestinations } from "../../server/sales/destinations";
type Data = Awaited<ReturnType<typeof readDestinations>>;
const number = (n: number) => new Intl.NumberFormat("pt-BR").format(n);
export default function DestinationsDashboard() {
  const [days, setDays] = useState("30"),
    [delivery, setDelivery] = useState("all"),
    [fulfillment, setFulfillment] = useState("all"),
    [state, setState] = useState(""),
    [q, setQ] = useState(""),
    [search, setSearch] = useState(""),
    [limit, setLimit] = useState(10),
    [data, setData] = useState<Data | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(q), 400);
    return () => clearTimeout(timer);
  }, [q]);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setData(null);
    setError("");
    setLimit(10);
    const params = new URLSearchParams({
      days,
      delivery,
      fulfillment,
      state,
      q: search,
    });
    void fetch(`/api/admin/destinations/?${params}`, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]),
      cache: "no-store",
    })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error);
        if (!controller.signal.aborted) setData(body);
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : "Falha na consulta.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [days, delivery, fulfillment, state, search]);

  return (
    <>
      <div className="insights-filters">
        <AdminSelect
          label="Período dos destinos"
          value={days}
          onValueChange={setDays}
          options={[7, 30, 60].map((n) => ({
            value: String(n),
            label: `Últimos ${n} dias`,
          }))}
        />
        <AdminSelect
          label="Entrega"
          value={delivery}
          onValueChange={setDelivery}
          options={[
            { value: "all", label: "Todas as entregas" },
            { value: "MOTOBOY", label: "Motoboy" },
            { value: "SEDEX", label: "Sedex" },
            { value: "OTHER", label: deliveryLabels.OTHER },
            { value: "MIXED", label: "Modalidades múltiplas" },
            { value: "UNKNOWN", label: "Não identificado" },
          ]}
        />
        <AdminSelect
          label="Situação do atendimento"
          value={fulfillment}
          onValueChange={setFulfillment}
          options={[
            { value: "all", label: "Todo atendimento" },
            { value: "FULFILLED", label: "Atendimento concluído" },
            { value: "PARTIALLY_FULFILLED", label: "Atendimento parcial" },
            { value: "UNFULFILLED", label: "Atendimento pendente" },
          ]}
        />
        <AdminSelect
          label="Estado de destino"
          value={state}
          onValueChange={setState}
          options={[
            { value: "", label: "Todos os estados" },
            ..."AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO"
              .split(" ")
              .map((uf) => ({ value: uf, label: uf })),
          ]}
        />
        <input
          aria-label="Buscar cidade ou estado"
          placeholder="Cidade ou estado…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {state && (
          <button className="admin-button" onClick={() => setState("")}>
            Limpar estado · {state}
          </button>
        )}
      </div>
      {busy && <PitterSpinner label="Consultando destinos…" />}
      {error && (
        <p className="admin-data-notice" role="alert">
          {error}
        </p>
      )}
      {data && (
        <>
          <div className="admin-mini-stats">
            {[
              ["Pedidos de entrega", data.total],
              ["Retiradas no período", data.pickup],
              ["Destinos incompletos", data.missing],
              ["Internacionais", data.international],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <span>{label}</span>
                <strong>{number(Number(value))}</strong>
              </div>
            ))}
          </div>
          <p className="sales-definition">
            Destinos de pedidos pagos ou reembolsados, com cancelados e testes
            excluídos. Atendimento concluído na Shopify não comprova entrega ao
            cliente. Retiradas não entram no mapa. Cidades e quantidades são da
            seleção; o mapa e a tabela seguem os mesmos filtros.
          </p>
          {data.missing > 0 && (
            <p className="admin-data-notice">
              Há {number(data.missing)} pedidos sem destino completo. Releia os
              detalhes dos pedidos e confira a permissão de endereço do app.
              Esses pedidos permanecem contabilizados como não informados.
            </p>
          )}
          <div className="delivery-destinations-layout">
            <section className="admin-panel">
              <header>
                <div>
                  <span className="admin-eyebrow">ALCANCE DA LOJA</span>
                  <h2>Entregas pelo Brasil</h2>
                </div>
              </header>
              <DeliveryMap cities={data.cities} />
            </section>
            <section className="admin-panel">
              <header>
                <h2>Cidades e quantidades {state && `· ${state}`}</h2>
              </header>
              <div className="admin-table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Destino</th>
                      <th>Pedidos</th>
                      <th>Unidades</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.cities.slice(0, limit).map((row, i) => (
                      <tr key={`${row.country}-${row.state}-${row.city}-${i}`}>
                        <td>
                          <strong>{row.city || "Cidade não informada"}</strong>
                          <small>
                            {[row.state, row.country]
                              .filter(Boolean)
                              .join(" · ") || "Destino não informado"}
                          </small>
                        </td>
                        <td>{number(row.orders)}</td>
                        <td>{number(row.units)}</td>
                      </tr>
                    ))}
                    {!data.cities.length && (
                      <tr>
                        <td colSpan={3}>Nenhum destino nesta seleção.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {limit < data.cities.length && (
                <div className="sales-pagination">
                  <button
                    className="admin-button"
                    onClick={() => setLimit((n) => n + 10)}
                  >
                    Mostrar mais 10 cidades
                  </button>
                </div>
              )}
              {delivery !== "all" && (
                <div className="sales-pagination">
                  <DeliveryMark kind={delivery} />
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
