import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CatalogApp from "../../components/CatalogApp";
import { getCatalog, getPageData } from "../../server/catalogs";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const catalog = await getCatalog((await params).slug);
  return {
    title: catalog?.name || "Catálogo não encontrado",
    description: catalog?.description,
  };
}
export default async function CatalogPage({ params }: Props) {
  const data = await getPageData((await params).slug);
  if (!data.catalog) notFound();
  return <CatalogApp initialData={data} />;
}
