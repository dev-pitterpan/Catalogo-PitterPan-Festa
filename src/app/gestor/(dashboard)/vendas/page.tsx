import { requireSession } from "../../../../server/auth/session";
import SalesDashboard from "../../../../components/admin/SalesDashboard";
import { PageHeading } from "../../../../components/admin/Primitives";
export default async function SalesPage() {
  await requireSession(["admin", "gestor"]);
  return (
    <>
      <PageHeading
        eyebrow="VENDAS DA SUA LOJA"
        title="Cada venda, uma nova celebração."
        description="Pedidos reais da Shopify. Pagamentos, reembolsos e produtos vendidos em um só lugar."
      />
      <SalesDashboard />
    </>
  );
}
