"use client";
import { customerDiagnostic } from "./customerDiagnostic";
import CustomerBalloonAvatar from "./CustomerBalloonAvatar";
export default function OrderCustomer({
  order,
}: {
  order: Record<string, string>;
}) {
  const id = order.customer_id,
    name = order.customer_name;
  return (
    <div className="sales-order-customer">
      <span className="sales-customer-avatar" aria-hidden="true">
        <CustomerBalloonAvatar />
      </span>
      <div>
        <strong>
          {name ||
            (id ? "Nome não disponibilizado" : "Cliente não identificado")}
        </strong>
        {id ? (
          <>
            <small>Cliente Shopify #{id.split("/").at(-1)}</small>
            {order.customer_diagnostic &&
              order.customer_diagnostic !== "identified" && (
                <small>{customerDiagnostic(order.customer_diagnostic)}</small>
              )}
            <span className="sales-customer-history">
              {order.customer_paid_orders || 0} pagos ·{" "}
              {order.customer_pending_orders || 0} pendentes
            </span>
            {Number(order.customer_pending_value) > 0 && (
              <small>
                Pendente calculado:{" "}
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: order.currency || "BRL",
                }).format(Number(order.customer_pending_value))}
              </small>
            )}
          </>
        ) : (
          <small>{customerDiagnostic(order.customer_diagnostic)}</small>
        )}
      </div>
    </div>
  );
}
