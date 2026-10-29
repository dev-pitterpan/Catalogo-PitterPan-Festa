import { requireSession } from "../../../../server/auth/session";
import Link from "next/link";
import { BarChart3, Boxes, ArrowLeftRight, ArrowUpRight } from "lucide-react";
import { adminContext } from "../../../../server/admin/repository";
import {
  PageHeading,
  DataNotice,
} from "../../../../components/admin/Primitives";
import ReportExport from "../../../../components/admin/ReportExport";
export default async function Reports() {
  const context = await adminContext();
  const user = await requireSession();
  return (
    <>
      <PageHeading
        eyebrow="CLAREZA PARA DECIDIR"
        title="Relatórios da operação."
        description="Exporte os indicadores da versão publicada ou consulte seleções detalhadas. Vendas e faturamento não são inferidos a partir do estoque."
        action={<ReportExport context={context} />}
      />
      <DataNotice context={context} />
      <div className="admin-process-grid">
        {[
          ...(user.role !== "atendimento"
            ? [
                {
                  title: "Análises Shopify",
                  text: "Vendas por dia, canais, produtos e comportamento, com exportação de dados reais.",
                  href: "/gestor/analises/",
                  icon: BarChart3,
                },
                {
                  title: "Mapa de entregas",
                  text: "Cidades e quantidades dos pedidos por modalidade e período.",
                  href: "/gestor/mapa/",
                  icon: Boxes,
                },
              ]
            : []),
          {
            title: "Produtos e ofertas",
            text: "Filtre o mix da loja e exporte os produtos da página consultada.",
            href: "/gestor/produtos/",
            icon: BarChart3,
          },
          {
            title: "Situação do estoque",
            text: "Consulte variantes sem estoque, baixas quantidades ou estoque alto.",
            href: "/gestor/estoque/",
            icon: Boxes,
          },
          {
            title: "Movimentação do catálogo",
            text: "Compare entradas, saídas e alterações entre versões publicadas.",
            href: "/gestor/alteracoes/",
            icon: ArrowLeftRight,
          },
        ].map(({ title, text, href, icon: Icon }) => (
          <section className="admin-panel" key={title}>
            <Icon size={25} />
            <h2>{title}</h2>
            <p>{text}</p>
            <Link className="admin-text-link" href={href}>
              Abrir relatório <ArrowUpRight size={16} />
            </Link>
          </section>
        ))}
      </div>
    </>
  );
}
