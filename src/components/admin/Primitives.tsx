import Link from "next/link";
import {
  ArrowUpRight,
  Database,
  Info,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { AdminContext } from "../../server/admin/repository";
export const number = (value: number | null | undefined) =>
  value === null || value === undefined
    ? "—"
    : new Intl.NumberFormat("pt-BR").format(value);
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="admin-page-heading">
      <div>
        <span className="admin-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}
export function DataNotice({ context }: { context: AdminContext }) {
  return context.notice ? (
    <div className="admin-data-notice" role="status">
      <Database size={19} />
      <div>
        <strong>
          {context.source === "json"
            ? "Catálogo local"
            : "Preparando os dados da sua loja"}
        </strong>
        <span>{context.notice}</span>
      </div>
      <Link href="/gestor/sincronizacoes/">
        Ver integração <ArrowUpRight size={15} />
      </Link>
    </div>
  ) : null;
}
export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="admin-empty">
      <span>
        <Info size={25} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function Pagination({
  page,
  pages,
  total,
  base,
  params = {},
}: {
  page: number;
  pages: number;
  total: number;
  base: string;
  params?: Record<string, string>;
}) {
  function href(p: number) {
    return `${base}?${new URLSearchParams({ ...params, page: String(p) })}`;
  }
  return (
    <nav className="admin-pagination" aria-label="Paginação">
      <span>
        {number(total)} registros · Página {page} de {pages}
      </span>
      <div>
        {page > 1 ? (
          <Link href={href(page - 1)}>
            <ChevronLeft size={16} />
            Anterior
          </Link>
        ) : (
          <span aria-disabled="true">Anterior</span>
        )}
        {page < pages ? (
          <Link href={href(page + 1)}>
            Próxima
            <ChevronRight size={16} />
          </Link>
        ) : (
          <span aria-disabled="true">Próxima</span>
        )}
      </div>
    </nav>
  );
}
export const dateTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Sao_Paulo",
      }).format(new Date(value))
    : "—";
export const statusLabels: Record<string, string> = {
  loading: "Em preparação",
  ready: "Pronta para revisar",
  active: "Publicada",
  failed: "Falha na importação",
  retired: "Versão anterior",
};
