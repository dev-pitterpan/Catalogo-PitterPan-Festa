/** Neutraliza fórmulas ao abrir relatórios em planilhas e preserva aspas/quebras. */
export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^\s*[=+\-@]/.test(text)) text = "'" + text;
  return `"${text.replaceAll('"', '""')}"`;
}
