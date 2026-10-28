import CatalogPage from "../../[slug]/page";
import { requireSession } from "../../../server/auth/session";
export { generateMetadata } from "../../[slug]/page";
export const dynamic = "force-dynamic";
export default async function ManagerCatalog(props: {
  params: Promise<{ slug: string }>;
}) {
  await requireSession();
  return CatalogPage(props);
}
