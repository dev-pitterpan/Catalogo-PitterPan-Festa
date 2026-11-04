import type { Metadata } from "next";
import { getManifest } from "./catalogs";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const slug = (await params).slug;
  const catalog = (await getManifest()).find((item) => item.slug === slug);
  return {
    title: catalog?.name || "Catálogo não encontrado",
    description: catalog?.description,
  };
}
