import type { ReactNode } from "react";
import DashboardShell from "../../../components/admin/DashboardShell";
import { requireSession } from "../../../server/auth/session";
import "../../../styles/admin.css";
import "../../../styles/admin/dashboard.css";
import "../../../styles/admin/sales.css";
import "../../../styles/admin/analytics.css";
import "leaflet/dist/leaflet.css";
import "../../../styles/admin/delivery-map.css";
import "../../../styles/admin/date-range.css";
export const metadata = { title: "Central de gestão" };
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireSession();
  return (
    <DashboardShell
      user={{ name: user.name, email: user.email, role: user.role }}
    >
      {children}
    </DashboardShell>
  );
}
