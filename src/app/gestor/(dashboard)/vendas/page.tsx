import { salesFilterSchema } from "../../../../server/sales/filters";
import { requireSession } from "../../../../server/auth/session";
import SalesDashboard from "../../../../components/admin/SalesDashboard";
import { PageHeading } from "../../../../components/admin/Primitives";
export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const value = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : "";
  const parsed = salesFilterSchema.safeParse({
    status: value("status") || "all",
    category: value("category"),
    delivery: value("delivery") || "all",
    start: value("start"),
    end: value("end"),
  });
  const filters = parsed.success ? parsed.data : undefined;
  const days = [1, 7, 30, 60].includes(Number(value("days")))
    ? Number(value("days"))
    : 30;
  await requireSession(["admin", "gestor"]);
  return (
    <>
      <PageHeading
        eyebrow="VENDAS DA SUA LOJA"
        title="Cada venda, uma nova celebração."
        description="Pedidos reais da Shopify. Pagamentos, reembolsos e produtos vendidos em um só lugar."
      />
      <SalesDashboard
        key={JSON.stringify([filters, days])}
        initialFilters={filters}
        initialDays={days}
      />
    </>
  );
}
