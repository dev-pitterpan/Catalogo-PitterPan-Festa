import CatalogApp from "@shared/components/CatalogApp";
import { getPageData } from "@shared/server/catalogs";
export const dynamic = "force-dynamic";
export default async function HomePage() {
  const campaignMonth = Number(
    new Intl.DateTimeFormat("pt-BR", {
      month: "numeric",
      timeZone: "America/Sao_Paulo",
    }).format(new Date()),
  );
  return (
    <CatalogApp
      initialData={await getPageData()}
      campaignMonth={campaignMonth}
    />
  );
}
