export { generateMetadata } from "@shared/server/catalog-metadata";
import { notFound } from "next/navigation";
import CatalogApp from "@shared/components/CatalogApp";
import { getPageData } from "@shared/server/catalogs";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ view?: string }>;
};
export default async function CatalogPage({ params }: Props) {
  const data = await getPageData((await params).slug);
  if (!data.catalog) notFound();
  return <CatalogApp initialData={data} managerView={false} />;
}
