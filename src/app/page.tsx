import CatalogApp from "../components/CatalogApp";
import { getPageData } from "../server/catalogs";
export const dynamic = "force-dynamic";
export default async function HomePage() {
  return <CatalogApp initialData={await getPageData()} />;
}
