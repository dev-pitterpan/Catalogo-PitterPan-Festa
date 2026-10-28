import type { ReactNode } from "react";
import type { Metadata } from "next";
import { requireSession } from "../../server/auth/session";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default async function ManagerLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireSession();
  return children;
}
