import { importSchema } from "./validation";
export function parseSupplierExport(html: string) {
  if (html.length > 3000000) throw Error("Use um arquivo de até 3 MB.");
  // Detached HTML is never inserted into the page or executed.
  const document = new DOMParser().parseFromString(html, "text/html");
  const rows = Array.from(document.querySelectorAll("table tr")).map((r) =>
    Array.from(r.querySelectorAll("td,th")).map(
      (c) => c.textContent?.trim() || "",
    ),
  );
  const header = rows.findIndex(
    (r) =>
      r[0]
        ?.normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase() === "codigo" && r[1]?.toLowerCase() === "fornecedor",
  );
  if (header < 0)
    throw Error(
      "Não encontrei as colunas Código e Fornecedor. Use a exportação HTML do WinThor.",
    );
  const items = rows
    .slice(header + 1)
    .filter((r) => r.some(Boolean))
    .map((r) => ({
      code: r[0],
      name: r[1],
      state: r[2] || "",
      trade_name: r[4] || r[1],
    }));
  const parsed = importSchema.safeParse(items);
  if (!parsed.success)
    throw Error(
      "O arquivo possui códigos repetidos ou campos inválidos. Revise a exportação.",
    );
  return parsed.data;
}
