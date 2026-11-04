import { requireSession } from "@shared/server/auth/session";
import { PageHeading } from "@shared/components/admin/Primitives";
import AgendaWorkspace from "@shared/components/admin/agenda/AgendaWorkspace";
import "@shared/styles/admin/agenda.css";
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
