"use client";
import { Download } from "lucide-react";
import type { AdminContext } from "../../server/admin/repository";
import { csvCell } from "../../lib/admin/csv";
export default function ReportExport({ context }: { context: AdminContext }) {
  function download() {
    if (!context.summary) return;
    const s = context.summary;
    const rows = [
      ["Indicador", "Valor"],
      ["Origem", context.source],
      ["Produtos", s.products],
      ["Variantes", s.variants],
      ["Categorias", s.categories],
      ["Marcas", s.brands],
      ["Variantes em oferta", s.offers],
      ["Estoque baixo", s.low],
      ["Estoque alto", s.high],
      ["Sem estoque", s.out],
      ["Estoque desconhecido", s.unknown],
      ["Unidades cadastradas", s.units],
      [
        "Entradas desde versão anterior",
        context.changes?.added ?? "Sem comparação",
      ],
      [
        "Saídas desde versão anterior",
        context.changes?.removed ?? "Sem comparação",
      ],
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["\ufeff" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "pitterpan-resumo-operacional.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <button
      onClick={download}
      disabled={!context.summary}
      className="admin-button admin-button-primary"
    >
      <Download size={16} />
      Exportar resumo (CSV)
    </button>
  );
}
