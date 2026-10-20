import { QueryClient } from "@tanstack/react-query";
/** Cache centralizado e invalidável após uma futura edição administrativa. */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
  });
}
