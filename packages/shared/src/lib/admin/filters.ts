/** Literal partial matching: %, _ and backslashes never act as SQL wildcards. */
export function containsPattern(value: string) {
  return `%${value.trim().replace(/[\\%_]/g, "\\$&")}%`;
}
export function matchesFilter(value: string | undefined, filter: string) {
  return (value || "")
    .toLocaleLowerCase("pt-BR")
    .includes(filter.trim().toLocaleLowerCase("pt-BR"));
}
