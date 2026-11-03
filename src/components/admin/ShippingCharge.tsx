import { shippingChargeLabel } from "../../lib/admin/shipping-charge";
export default function ShippingCharge({
  order,
}: {
  order: Record<string, string>;
}) {
  return (
    <small
      className="sales-shipping-charge"
      title="Frete após descontos, antes de reembolsos. Não representa o custo de entrega da loja."
    >
      {shippingChargeLabel(
        order.shipping_charge,
        order.currency || "BRL",
        order.shipping_charge_checked === "true",
        order.delivery_kind,
      )}
    </small>
  );
}
