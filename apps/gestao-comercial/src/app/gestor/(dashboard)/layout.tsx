import type { ReactNode } from "react";
import DashboardShell from "@shared/components/admin/DashboardShell";
import { requireSession } from "@shared/server/auth/session";
import "@shared/styles/admin.css";
import "@shared/styles/admin/dashboard.css";
import "@shared/styles/admin/sales.css";
import "@shared/styles/admin/analytics.css";
import "leaflet/dist/leaflet.css";
import "@shared/styles/admin/delivery-map.css";
import "@shared/styles/admin/date-range.css";
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
