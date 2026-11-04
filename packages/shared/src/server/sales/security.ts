import { createHmac, timingSafeEqual } from "node:crypto";
export const salesTopics = new Set([
  "orders/create",
  "orders/paid",
  "orders/updated",
  "orders/cancelled",
  "refunds/create",
]);
export function validSignature(
  body: Uint8Array,
  signature: string,
  secret: string,
) {
  if (!secret || !/^[A-Za-z0-9+/]{43}=$/.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  const actual = Buffer.from(signature, "base64");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function webhookOrderId(topic: string, payload: unknown) {
  if (!payload || typeof payload !== "object")
    throw new Error("Evento inválido.");
  const object = payload as Record<string, unknown>;
  const value = topic === "refunds/create" ? object.order_id : object.id;
  if (typeof value === "number" && (!Number.isSafeInteger(value) || value <= 0))
    throw new Error("ID de pedido inválido.");
  if (!/^[1-9]\d{0,25}$/.test(String(value)))
    throw new Error("ID de pedido inválido.");
  return `gid://shopify/Order/${value}`;
}
