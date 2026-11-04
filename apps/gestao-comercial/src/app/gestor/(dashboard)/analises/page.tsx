import { requireSession } from "@shared/server/auth/session";
import { PageHeading } from "@shared/components/admin/Primitives";
import AnalyticsDashboard from "@shared/components/admin/AnalyticsDashboard";
export default async function AnalyticsPage() {
  await requireSession(["admin", "gestor"]);
  return (
    <>
      <PageHeading
        eyebrow="DADOS REAIS DA SHOPIFY"
        title="Resultados da loja."
        description="Entenda seus resultados com perguntas simples, gráficos interativos e dados da Shopify."
      />
      <AnalyticsDashboard />
    </>
  );
}
