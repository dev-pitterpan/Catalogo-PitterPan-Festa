import { z } from "zod";
const configSchema = z.object({
  SHOPIFY_STORE_DOMAIN: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/),
  SHOPIFY_API_VERSION: z
    .string()
    .regex(/^20\d{2}-(01|04|07|10)$/)
    .default("2026-07"),
  SHOPIFY_ADMIN_ACCESS_TOKEN: z.string().optional(),
  SHOPIFY_CLIENT_ID: z.string().optional(),
  SHOPIFY_CLIENT_SECRET: z.string().optional(),
});
export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
/** Token não sai do processo servidor. Não inclui resposta/credencial em mensagens de erro. */
export class ShopifyClient {
  private config = configSchema.parse(process.env);
  private token = "";
  private expires = 0;
  get domain() {
    return this.config.SHOPIFY_STORE_DOMAIN;
  }
  private async accessToken() {
    if (this.config.SHOPIFY_ADMIN_ACCESS_TOKEN)
      return this.config.SHOPIFY_ADMIN_ACCESS_TOKEN;
    if (this.token && this.expires > Date.now() + 60000) return this.token;
    if (!this.config.SHOPIFY_CLIENT_ID || !this.config.SHOPIFY_CLIENT_SECRET)
      throw new Error(
        "Configure um token Admin ou as credenciais do app Shopify.",
      );
    const response = await fetch(
      `https://${this.domain}/admin/oauth/access_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: this.config.SHOPIFY_CLIENT_ID,
          client_secret: this.config.SHOPIFY_CLIENT_SECRET,
        }),
        signal: AbortSignal.timeout(30000),
      },
    );
    if (!response.ok)
      throw new Error(`Autenticação Shopify recusada (${response.status}).`);
    const result = z
      .object({
        access_token: z.string().min(1),
        expires_in: z.number().positive(),
      })
      .parse(await response.json());
    this.token = result.access_token;
    this.expires = Date.now() + result.expires_in * 1000;
    return this.token;
  }
  async query<T>(
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<T> {
    for (let attempt = 0; attempt < 6; attempt++) {
      let response: Response;
      try {
        response = await fetch(
          `https://${this.domain}/admin/api/${this.config.SHOPIFY_API_VERSION}/graphql.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Access-Token": await this.accessToken(),
            },
            body: JSON.stringify({ query, variables }),
            signal: AbortSignal.timeout(30000),
          },
        );
      } catch {
        if (attempt === 5)
          throw new Error(
            "Falha de rede na Shopify. Execute novamente com --resume.",
          );
        await delay(1000 * 2 ** attempt);
        continue;
      }
      if (response.status === 429 || response.status >= 500) {
        await delay(
          Math.min(
            30000,
            Math.max(
              Number(response.headers.get("retry-after")) * 1000 || 0,
              1000 * 2 ** attempt,
            ),
          ),
        );
        continue;
      }
      if (!response.ok)
        throw new Error(
          `Shopify respondeu HTTP ${response.status}. Confira domínio, token e permissões.`,
        );
      const payload = (await response.json()) as {
        data?: T;
        errors?: { extensions?: { code?: string } }[];
        extensions?: {
          cost?: {
            requestedQueryCost?: number;
            throttleStatus?: {
              currentlyAvailable: number;
              restoreRate: number;
            };
          };
        };
      };
      if (payload.errors?.length) {
        if (
          payload.errors.every(
            (error) => error.extensions?.code === "THROTTLED",
          )
        ) {
          const cost = payload.extensions?.cost;
          const status = cost?.throttleStatus;
          await delay(
            status
              ? Math.min(
                  30000,
                  Math.max(
                    1000,
                    (((cost?.requestedQueryCost || 50) -
                      status.currentlyAvailable) /
                      Math.max(1, status.restoreRate)) *
                      1000,
                  ),
                )
              : 1000 * 2 ** attempt,
          );
          continue;
        }
        throw new Error(
          "Erro GraphQL Shopify. Confira campos da versão e read_products; nenhum dado foi publicado.",
        );
      }
      if (!payload.data) throw new Error("Resposta Shopify sem dados.");
      return payload.data;
    }
    throw new Error(
      "Shopify permaneceu indisponível/limitada. Retome a importação depois.",
    );
  }
}
export const BULK_PRODUCTS_QUERY = `{
  products(query:"status:active") { edges { node {
    id title description productType vendor tags status onlineStoreUrl updatedAt
    featuredMedia { ... on MediaImage { image { url altText } } }
    variants { edges { node { id sku title price compareAtPrice barcode inventoryQuantity image { url altText } selectedOptions { name value } } } }
    collections { edges { node { id title } } }
    media { edges { node { ... on MediaImage { id image { url altText } } } } }
  } } }
}`;
