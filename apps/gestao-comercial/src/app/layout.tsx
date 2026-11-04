import type { Metadata } from "next";
import type { ReactNode } from "react";
import QueryProvider from "@shared/providers/QueryProvider";
import "@shared/global.css";

export const metadata: Metadata = {
  title: {
    default: "Pitter Pan Festas | Gestão",
    template: "%s | Pitter Pan Festas",
  },
  description: "Central de gestão da Pitter Pan Festas.",
  robots: { index: false, follow: false },
  icons: { icon: "/assets/images/brand/pitter-pan-logo.svg" },
};
/** Documento raiz do Next.js. Substitui a necessidade de manter um index.html manual. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
