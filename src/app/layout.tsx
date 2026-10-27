import type { Metadata } from "next";
import type { ReactNode } from "react";
import QueryProvider from "../providers/QueryProvider";
import "../global.css";

export const metadata: Metadata = {
  title: {
    default: "Pitter Pan Festas | Catálogos",
    template: "%s | Pitter Pan Festas",
  },
  description:
    "Catálogos sazonais da Pitter Pan Festas. Escolha os produtos e solicite seu orçamento.",
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
