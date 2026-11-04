import { requireSession } from "@shared/server/auth/session";
import { listUsers } from "@shared/server/admin/users";
import { PageHeading } from "@shared/components/admin/Primitives";
import Team from "@shared/components/admin/Team";
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
