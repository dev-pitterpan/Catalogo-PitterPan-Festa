"use client";
import { useState } from "react";
import { Upload, CheckCircle2 } from "lucide-react";
import { parseSupplierExport } from "../../../lib/agenda/import";
import type { Save } from "./shared";
export default function SupplierImport({
  save,
  busy,
}: {
  save: Save;
  busy: boolean;
}) {
  const [rows, setRows] = useState<ReturnType<typeof parseSupplierExport>>([]);
  const [error, setError] = useState("");
  return (
    <details className="admin-panel agenda-import">
      <summary>
        <Upload size={18} /> Importar fornecedores do WinThor
      </summary>
      <p>
        Selecione a exportação HTML. O código identifica o fornecedor;
        reimportar atualiza os dados do arquivo e preserva os contatos e
        catálogos já cadastrados.
      </p>
      <input
        type="file"
        accept=".html,.htm,text/html"
        aria-label="Arquivo HTML de fornecedores"
        disabled={busy}
        onChange={async (e) => {
          setRows([]);
          setError("");
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            if (file.size > 3000000) throw Error("Use um arquivo de até 3 MB.");
            setRows(parseSupplierExport(await file.text()));
          } catch (error) {
            setError(
              error instanceof Error
                ? error.message
                : "Não foi possível ler o arquivo.",
            );
          }
        }}
      />
      {error && <p role="alert">{error}</p>}
      {!!rows.length && (
        <div className="agenda-import-preview">
          <strong>
            <CheckCircle2 size={17} /> {rows.length} fornecedores prontos para
            importar
          </strong>
          <p>
            Esta exportação contém identificação e UF. Telefone, contato, e-mail
            e catálogo serão preenchidos na ficha.
          </p>
          <ul>
            {rows.slice(0, 3).map((r) => (
              <li key={r.code}>
                {r.code} · {r.name} · {r.state}
              </li>
            ))}
          </ul>
          <button
            className="admin-button"
            disabled={busy}
            onClick={async () => {
              if (await save("import", rows)) setRows([]);
            }}
          >
            {busy ? "Importando…" : "Importar fornecedores"}
          </button>
        </div>
      )}
    </details>
  );
}
