import { salesFilterSchema } from "../../../../server/sales/filters";
import { requireSession } from "../../../../server/auth/session";
import SoldProductsHistory from "../../../../components/admin/SoldProductsHistory";
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
        eyebrow="HISTÓRICO DA SUA LOJA"
        title="Produtos vendidos"
        description="Consulte as unidades vendidas e as modalidades de entrega, com busca, período e paginação."
      />
      <SoldProductsHistory
        key={JSON.stringify([filters, days])}
        initialFilters={filters}
        initialDays={days}
      />
    </>
  );
}
