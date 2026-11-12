export { generateMetadata } from "@shared/server/catalog-metadata";
import { notFound } from "next/navigation";
import CatalogApp from "@shared/components/CatalogApp";
import { getPageData } from "@shared/server/catalogs";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
};
export default async function CatalogPage({ params, searchParams }: Props) {
  const [{ slug }, { q }] = await Promise.all([params, searchParams]);
  const query = typeof q === "string" ? q.trim().slice(0, 120) : "";
  const data = await getPageData(slug, { q: query });
  if (!data.catalog) notFound();
  return (
    <CatalogApp initialData={data} initialQuery={query} managerView={false} />
  );
}
