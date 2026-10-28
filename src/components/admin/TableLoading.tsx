/** Estruturas visuais de carregamento; nunca apresentam indicadores simulados. */
export default function TableLoading() {
  return (
    <div
      className="admin-dashboard-loading"
      role="status"
      aria-label="Carregando produtos"
    >
      <span className="admin-sr-only">
        Preparando os produtos da sua seleção.
      </span>
      <div aria-hidden="true">
        <div className="admin-skeleton admin-loading-heading" />
        <div className="admin-skeleton admin-loading-line" />
        <div className="admin-panel admin-loading-table">
          <div className="admin-skeleton admin-loading-filter" />
          {Array.from({ length: 6 }, (_, i) => (
            <div className="admin-loading-row" key={i}>
              <span className="admin-skeleton" />
              <div>
                <i className="admin-skeleton" />
                <i className="admin-skeleton" />
              </div>
              <b className="admin-skeleton" />
              <b className="admin-skeleton" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export function CatalogLoading() {
  return (
    <div
      className="admin-dashboard-loading"
      role="status"
      aria-label="Carregando catálogos"
    >
      <span className="admin-sr-only">
        Preparando as seleções para compartilhar.
      </span>
      <div aria-hidden="true">
        <div className="admin-skeleton admin-loading-heading" />
        <div className="admin-skeleton admin-loading-line" />
        <div className="admin-catalog-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <div className="admin-catalog-card" key={i}>
              <div className="admin-skeleton admin-loading-cover" />
              <div className="admin-catalog-card-body">
                <span className="admin-skeleton admin-loading-card-title" />
                <span className="admin-skeleton admin-loading-card-copy" />
                <span className="admin-skeleton admin-loading-card-action" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
