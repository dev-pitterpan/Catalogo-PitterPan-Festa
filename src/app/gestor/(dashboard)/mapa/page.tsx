import { requireSession } from "../../../../server/auth/session";
import { PageHeading } from "../../../../components/admin/Primitives";
import DestinationsDashboard from "../../../../components/admin/DestinationsDashboard";
export default async function MapPage() {
  await requireSession(["admin", "gestor"]);
  return (
    <>
      <PageHeading
        eyebrow="OS DESTINOS DA SUA LOJA"
        title="Mapa de entregas."
        description="Veja os estados, as cidades e as quantidades dos pedidos, com filtros por período e modalidade."
      />
      <DestinationsDashboard />
    </>
  );
}
