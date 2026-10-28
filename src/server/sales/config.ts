import { z } from "zod";
import { ShopifyClient } from "../shopify/client.ts";

export function salesConfig() {
  return z
    .object({
      SHOPIFY_SALES_STORE_DOMAIN: z
        .string()
        .regex(/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/),
      SHOPIFY_SALES_CLIENT_ID: z.string().trim().min(1),
      SHOPIFY_SALES_CLIENT_SECRET: z.string().trim().min(1),
      SHOPIFY_SALES_API_VERSION: z
        .string()
        .regex(/^20\d{2}-(01|04|07|10)$/)
        .default("2026-10"),
    })
    .parse(process.env);
}
export function salesReady() {
  return (
    !!process.env.DATABASE_URL &&
    (() => {
      try {
        salesConfig();
        return true;
      } catch {
        return false;
      }
    })()
  );
}
let client: ShopifyClient | undefined;
/** Explicit namespace: never uses the other developer's token or client credentials. */
export function salesClient() {
  const config = salesConfig();
  return (client ||= new ShopifyClient({
    SHOPIFY_STORE_DOMAIN: config.SHOPIFY_SALES_STORE_DOMAIN,
    SHOPIFY_API_VERSION: config.SHOPIFY_SALES_API_VERSION,
    SHOPIFY_CLIENT_ID: config.SHOPIFY_SALES_CLIENT_ID,
    SHOPIFY_CLIENT_SECRET: config.SHOPIFY_SALES_CLIENT_SECRET,
  }));
}
