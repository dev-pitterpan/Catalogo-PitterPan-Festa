import { deliveryKinds } from "../../lib/admin/delivery.ts";
import { z } from "zod";
export const salesFilterSchema = z.object({
  status: z
    .enum([
      "all",
      "PAID",
      "PENDING",
      "AUTHORIZED",
      "PARTIALLY_PAID",
      "PARTIALLY_REFUNDED",
      "REFUNDED",
      "VOIDED",
      "EXPIRED",
      "UNKNOWN",
      "CANCELLED",
    ])
    .default("all"),
  delivery: z.enum(["all", ...deliveryKinds]).default("all"),
  category: z.string().trim().max(200).default(""),
});
export type SalesFilters = Omit<
  z.infer<typeof salesFilterSchema>,
  "delivery"
> & { delivery?: z.infer<typeof salesFilterSchema>["delivery"] };
export const orderCursorSchema = z.object({
  date: z
    .string()
    .max(60)
    .refine((value) => Number.isFinite(Date.parse(value))),
  id: z.string().regex(/^gid:\/\/shopify\/Order\/[0-9]+$/),
});
export function decodeOrderCursor(value?: string | null) {
  if (!value) return undefined;
  if (value.length > 500 || !/^[A-Za-z0-9_-]+$/.test(value))
    throw new Error("Cursor inválido.");
  return orderCursorSchema.parse(
    JSON.parse(Buffer.from(value, "base64url").toString("utf8")),
  );
}
export const SALES_PAGE_SIZE = 10;
