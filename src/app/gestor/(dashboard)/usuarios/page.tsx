import { requireSession } from "../../../../server/auth/session";
import { listUsers } from "../../../../server/admin/users";
import { PageHeading } from "../../../../components/admin/Primitives";
import Team from "../../../../components/admin/Team";
export default async function Users() {
  const session = await requireSession(["admin"]);
  const data = await listUsers();
  return (
    <>
      <PageHeading
        eyebrow="PESSOAS QUE FAZEM A DIFERENÇA"
        title="Sua equipe. Bem conectada."
        description="Atendimento consulta e compartilha. Gestores acompanham a operação. Administradores gerenciam acessos e preferências."
      />
      <Team {...data} self={session.sub} />
    </>
  );
}
