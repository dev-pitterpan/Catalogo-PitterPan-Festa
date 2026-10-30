import CatalogApp from "../../../components/CatalogApp";
import { getPageData } from "../../../server/catalogs";
import { notFound } from "next/navigation";
import { requireSession } from "../../../server/auth/session";
export { generateMetadata } from "../../[slug]/page";
export const dynamic = "force-dynamic";
export default async function ManagerCatalog(props: {
  params: Promise<{ slug: string }>;
}) {
  await requireSession();
  const data = await getPageData((await props.params).slug);
  if (!data.catalog) notFound();
  return <CatalogApp initialData={data} managerView />;
}
