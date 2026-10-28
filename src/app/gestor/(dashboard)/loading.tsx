export default function DashboardLoading() {
  return (
    <div
      className="admin-dashboard-loading"
      role="status"
      aria-label="Carregando seção da central"
    >
      <span className="admin-sr-only">
        Organizando seus indicadores. Só mais um instante.
      </span>
      <div aria-hidden="true">
        <div className="admin-skeleton admin-loading-heading" />
        <div className="admin-skeleton admin-loading-line" />
        <div className="admin-skeleton admin-loading-hero" />
        <div className="admin-loading-stats">
          {[0, 1, 2, 3].map((i) => (
            <div className="admin-skeleton" key={i} />
          ))}
        </div>
        <div className="admin-loading-panels">
          <div className="admin-skeleton" />
          <div className="admin-skeleton" />
        </div>
      </div>
    </div>
  );
}
