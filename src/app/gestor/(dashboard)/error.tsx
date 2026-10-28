"use client";
import { RefreshCw } from "lucide-react";
export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <div className="admin-empty">
      <span>
        <RefreshCw size={26} />
      </span>
      <h2>Não foi possível abrir esta seção.</h2>
      <p>
        A integração pode estar indisponível por alguns instantes. Tente
        novamente.
      </p>
      <button className="admin-button admin-button-primary" onClick={reset}>
        Tentar novamente
      </button>
    </div>
  );
}
