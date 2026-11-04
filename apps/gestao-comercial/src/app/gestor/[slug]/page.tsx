export { generateMetadata } from "@shared/server/catalog-metadata";
import CatalogApp from "@shared/components/CatalogApp";
import { getPageData } from "@shared/server/catalogs";
import { notFound } from "next/navigation";
import { requireSession } from "@shared/server/auth/session";
export const dynamic = "force-dynamic";
export default async function ManagerCatalog(props: {
  params: Promise<{ slug: string }>;
}) {
  await requireSession();
  const data = await getPageData((await props.params).slug);
  if (!data.catalog) notFound();
  return <CatalogApp initialData={data} managerView />;
}
