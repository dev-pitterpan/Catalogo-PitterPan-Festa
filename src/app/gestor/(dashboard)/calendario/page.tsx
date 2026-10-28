import { requireSession } from "../../../../server/auth/session";
import { readCampaigns } from "../../../../server/admin/campaigns";
import { PageHeading } from "../../../../components/admin/Primitives";
import Calendar from "../../../../components/admin/Calendar";
export default async function CalendarPage() {
  const session = await requireSession();
  const data = await readCampaigns();
  return (
    <>
      <PageHeading
        eyebrow="ANTECIPE AS PRÓXIMAS CELEBRAÇÕES"
        title="Seu calendário comercial."
        description="Organize campanhas, datas e catálogos da equipe. As datas são cadastradas pelo gestor; não há disparo automático de mensagens."
      />
      <Calendar {...data} canEdit={session.role !== "atendimento"} />
    </>
  );
}
