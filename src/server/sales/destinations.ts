import { z } from "zod";
import type { SqlClient } from "../database/catalog-repository.ts";
export const destinationSchema = z.object({
  city: z.string().trim().max(150).nullable(),
  state: z.string().trim().max(100).nullable(),
  country: z.string().length(2).nullable(),
  checkedAt: z.string(),
});
export type Destination = z.infer<typeof destinationSchema>;
/** Only city/state/country are read; no address, customer name or exact coordinates. */
export async function readOrderDestination(
  client: { query<T>(q: string, v?: Record<string, unknown>): Promise<T> },
  id: string,
  updatedAt: string,
): Promise<Destination | null> {
  try {
    const raw = await client.query<unknown>(
      `query($id:ID!){order(id:$id){updatedAt shippingAddress{city provinceCode countryCodeV2}}}`,
      { id },
    );
    const data = z
      .object({
        order: z
          .object({
            updatedAt: z.string(),
            shippingAddress: z
              .object({
                city: z.string().max(150).nullable(),
                provinceCode: z.string().max(100).nullable(),
                countryCodeV2: z.string().length(2).nullable(),
              })
              .nullable(),
          })
          .nullable(),
      })
      .parse(raw).order;
    if (!data || data.updatedAt !== updatedAt) return null;
    return {
      city: data.shippingAddress?.city?.trim() || null,
      state: data.shippingAddress?.provinceCode?.trim().toUpperCase() || null,
      country: data.shippingAddress?.countryCodeV2 || null,
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
export const destinationFilterSchema = z.object({
  days: z.coerce
    .number()
    .refine((n) => [7, 30, 60].includes(n))
    .default(30),
  delivery: z
    .enum(["all", "SEDEX", "MOTOBOY", "OTHER", "MIXED", "UNKNOWN"])
    .default("all"),
  fulfillment: z
    .enum(["all", "FULFILLED", "UNFULFILLED", "PARTIALLY_FULFILLED"])
    .default("all"),
  state: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .or(z.literal(""))
    .default(""),
  q: z.string().trim().max(150).default(""),
});
export async function readDestinations(
  db: SqlClient,
  store: string,
  input: z.infer<typeof destinationFilterSchema>,
) {
  const f = destinationFilterSchema.parse(input);
  const values = [store, f.days, f.delivery, f.fulfillment];
  const where = `o.store=$1 AND NOT o.test AND o.cancelled_at IS NULL AND o.financial_status IN ('PAID','PARTIALLY_REFUNDED','REFUNDED') AND o.processed_at>=now()-($2*interval '1 day') AND ($3='all' OR COALESCE(to_jsonb(o)->>'delivery_kind','UNKNOWN')=$3) AND ($4='all' OR o.fulfillment_status=$4)`;
  const { rows } = await db.query<{
    city: string | null;
    state: string | null;
    country: string | null;
    orders: string;
    units: string;
    pickup: boolean;
  }>(
    `SELECT NULLIF(trim(to_jsonb(o)->'destination'->>'city'),'') AS city,NULLIF(trim(to_jsonb(o)->'destination'->>'state'),'') AS state,NULLIF(to_jsonb(o)->'destination'->>'country','') AS country,COALESCE(to_jsonb(o)->>'delivery_kind','UNKNOWN')='PICKUP' AS pickup,count(*)::text AS orders,COALESCE(sum((SELECT COALESCE(sum(i.current_quantity),0) FROM pitterpan_sales_items i WHERE i.store=o.store AND i.order_id=o.id)),0)::text AS units FROM pitterpan_sales_orders o WHERE ${where} GROUP BY 1,2,3,4 ORDER BY count(*) DESC,city,state`,
    values,
  );
  const delivery = rows.filter((r) => !r.pickup);
  const normalize = (v: string) =>
    v
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const cities = delivery.filter(
    (r) =>
      (!f.state || (r.country === "BR" && r.state === f.state)) &&
      (!f.q ||
        normalize(
          [r.city, r.state, r.country].filter(Boolean).join(" "),
        ).includes(normalize(f.q))),
  );
  const states = new Map<string, number>();
  for (const r of delivery)
    if (r.country === "BR" && r.state)
      states.set(r.state, (states.get(r.state) || 0) + Number(r.orders));
  const sum = (a: typeof rows) => a.reduce((n, r) => n + Number(r.orders), 0);
  return {
    filters: f,
    cities: cities.map((r) => ({
      ...r,
      orders: Number(r.orders),
      units: Number(r.units),
    })),
    states: [...states].map(([state, orders]) => ({ state, orders })),
    total: sum(delivery),
    pickup: sum(rows.filter((r) => r.pickup)),
    missing: sum(delivery.filter((r) => !r.city || !r.state || !r.country)),
    international: sum(delivery.filter((r) => r.country && r.country !== "BR")),
    generatedAt: new Date().toISOString(),
  };
}
