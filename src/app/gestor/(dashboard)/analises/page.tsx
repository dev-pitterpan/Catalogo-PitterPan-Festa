import { requireSession } from "../../../../server/auth/session";
import { PageHeading } from "../../../../components/admin/Primitives";
import AnalyticsDashboard from "../../../../components/admin/AnalyticsDashboard";
export default async function AnalyticsPage() {
  await requireSession(["admin", "gestor"]);
  return (
    <>
      <PageHeading
        eyebrow="DADOS REAIS DA SHOPIFY"
        title="Análises da loja."
        description="Vendas, canais, produtos e comportamento, consultados diretamente no Shopify Analytics."
      />
      <AnalyticsDashboard />
    </>
  );
}
