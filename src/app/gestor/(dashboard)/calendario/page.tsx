import { redirect } from "next/navigation";
import { requireSession } from "../../../../server/auth/session";
export default async function LegacyCalendar() {
  await requireSession(["admin", "gestor"]);
  redirect("/gestor/analises/");
}
