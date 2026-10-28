import { unstable_cache } from "next/cache.js";
import { getShopifyClient } from "./client.ts";

/** Cache por página GraphQL, evitando guardar o catálogo inteiro em uma entrada. */
export function cachedShopifyClient() {
  const client = getShopifyClient();
  const version = process.env.SHOPIFY_API_VERSION || "2026-07";
  return {
    query<T>(
      query: string,
      variables: Record<string, unknown> = {},
    ): Promise<T> {
      // Esta conexão atende somente leitura do catálogo. Checkout usa o cliente sem cache.
      if (!/^\s*(query\b|\{)/.test(query))
        throw new Error("O cache do catálogo aceita somente consultas.");
      return unstable_cache(
        async () => client.query<T>(query, variables),
        [
          "shopify-catalog-query-v1",
          client.domain,
          version,
          query,
          JSON.stringify(variables),
        ],
        { revalidate: 300, tags: ["shopify-catalog"] },
      )();
    },
  };
}
