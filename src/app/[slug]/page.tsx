import { currentSession } from "../../../packages/shared/src/server/auth/session";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CatalogApp from "../../../packages/shared/src/components/CatalogApp";
import { catalogSearchParam } from "../../../packages/shared/src/lib/catalog/query";
import {
  getManifest,
  getPageData,
} from "../../../packages/shared/src/server/catalogs";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ view?: string; q?: string | string[] }>;
};
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug;
  const catalog = (await getManifest()).find((item) => item.slug === slug);
  return {
    title: catalog?.name || "Catálogo não encontrado",
    description: catalog?.description,
  };
}
export default async function CatalogPage({ params, searchParams }: Props) {
  const [{ slug }, filters] = await Promise.all([params, searchParams]);
  const query = catalogSearchParam(filters?.q);
  const data = await getPageData(slug, { q: query });
  if (!data.catalog) notFound();
  const preview = filters?.view === "client";
  const session = await currentSession();
  return (
    <CatalogApp
      initialData={data}
      initialQuery={query}
      managerView={!!session && !preview}
    />
  );
}
