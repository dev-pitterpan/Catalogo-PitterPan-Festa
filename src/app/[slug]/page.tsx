import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CatalogApp from "../../components/CatalogApp";
import { getManifest, getPageData } from "../../server/catalogs";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug;
  const catalog = (await getManifest()).find((item) => item.slug === slug);
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
