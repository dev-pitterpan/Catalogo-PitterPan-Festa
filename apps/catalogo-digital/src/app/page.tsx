import CatalogApp from "@shared/components/CatalogApp";
import { getPageData } from "@shared/server/catalogs";
export const dynamic = "force-dynamic";
export default async function HomePage() {
  return <CatalogApp initialData={await getPageData()} />;
}
