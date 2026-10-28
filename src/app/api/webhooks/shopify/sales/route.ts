import { database } from "../../../../../server/database/client";
import { salesConfig } from "../../../../../server/sales/config";
import {
  salesTopics,
  validSignature,
  webhookOrderId,
} from "../../../../../server/sales/security";
export const runtime = "nodejs";
export async function POST(request: Request) {
  let config;
  try {
    config = salesConfig();
  } catch {
    return new Response("Integração não configurada.", { status: 503 });
  }
  const store = request.headers.get("x-shopify-shop-domain"),
    topic = request.headers.get("x-shopify-topic") || "";
  const delivery = request.headers.get("x-shopify-webhook-id") || "";
  if (store !== config.SHOPIFY_SALES_STORE_DOMAIN)
    return new Response("Loja inválida.", { status: 401 });
  if (!salesTopics.has(topic) || !/^[A-Za-z0-9_-]{8,128}$/.test(delivery))
    return new Response("Evento inválido.", { status: 400 });
  // Stream limit, including requests without Content-Length; never persist the raw PII payload.
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (!request.body) return new Response("Corpo ausente.", { status: 400 });
  const reader = request.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 2_000_000) {
      await reader.cancel();
      return new Response("Evento excede o limite.", { status: 413 });
    }
    chunks.push(value);
  }
  const body = Buffer.concat(chunks);
  const secret =
    process.env.SHOPIFY_SALES_WEBHOOK_SECRET?.trim() ||
    config.SHOPIFY_SALES_CLIENT_SECRET;
  if (
    !validSignature(
      body,
      request.headers.get("x-shopify-hmac-sha256") || "",
      secret,
    )
  )
    return new Response("Assinatura inválida.", { status: 401 });
  let orderId: string;
  try {
    orderId = webhookOrderId(topic, JSON.parse(body.toString("utf8")));
  } catch {
    return new Response("Pedido inválido.", { status: 400 });
  }
  try {
    const db = database();
    // Single statement atomically queues the ID and updates receipt time. A duplicate has no side effect.
    await db.query(
      `WITH queued AS (INSERT INTO pitterpan_sales_inbox(store,delivery_id,topic,order_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING store)
      INSERT INTO pitterpan_sales_sync(store,last_webhook_at) SELECT store,now() FROM queued
      ON CONFLICT(store) DO UPDATE SET last_webhook_at=EXCLUDED.last_webhook_at`,
      [store, delivery, topic, orderId],
    );
    return new Response(null, { status: 200 });
  } catch {
    return new Response("Não foi possível guardar o evento. Tente novamente.", {
      status: 503,
    });
  }
}
