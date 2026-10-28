import CatalogGrid from "../../../../components/admin/CatalogGrid";
import { PageHeading } from "../../../../components/admin/Primitives";
import { adminCatalogs } from "../../../../server/admin/repository";
export default async function Catalogs() {
  const data = await adminCatalogs();
  return (
    <>
      <PageHeading
        eyebrow="ESCOLHA. COMPARTILHE. ENCANTE."
        title="Um catálogo para cada ocasião."
        description="Selecione uma coleção e compartilhe o link público com seu cliente. O acesso do cliente não exige login."
      />
      <CatalogGrid {...data} />
    </>
  );
}
