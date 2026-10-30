import { requireSession } from "../../../../server/auth/session";
import { PageHeading } from "../../../../components/admin/Primitives";
import AgendaWorkspace from "../../../../components/admin/agenda/AgendaWorkspace";
import "../../../../styles/admin/agenda.css";
export default async function AgendaPage() {
  await requireSession(["admin", "gestor"]);
  return (
    <>
      <PageHeading
        eyebrow="CONVERSAS QUE VIRAM PARCERIAS"
        title="Agenda e fornecedores"
        description="Planeje reuniões, mantenha os contatos por perto e organize cada próximo passo."
      />
      <AgendaWorkspace />
    </>
  );
}
