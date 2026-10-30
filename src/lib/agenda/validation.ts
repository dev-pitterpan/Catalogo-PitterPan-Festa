import { calendarDate } from "../admin/date-range.ts";
import { z } from "zod";
const text = (max: number) => z.string().trim().max(max);
const url = text(2000).refine((v) => {
  if (!v) return true;
  try {
    const u = new URL(v);
    return u.protocol === "https:" && !u.username && !u.password;
  } catch {
    return false;
  }
}, "Use um link HTTPS válido.");
export const supplierSchema = z.object({
  code: text(40).min(1),
  name: text(200).min(2),
  trade_name: text(200).default(""),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^([A-Z]{2})?$/)
    .default(""),
  contact: text(160).default(""),
  phone: text(32)
    .default("")
    .refine(
      (v) => !v || !!whatsappNumber(v),
      "Informe DDD e telefone válidos.",
    ),
  email: z.union([z.email(), z.literal("")]).default(""),
  catalog_url: url.default(""),
});
export const importSchema = z
  .array(
    supplierSchema.pick({
      code: true,
      name: true,
      trade_name: true,
      state: true,
    }),
  )
  .min(1)
  .max(2000)
  .refine(
    (rows) => new Set(rows.map((r) => r.code)).size === rows.length,
    "Há códigos repetidos no arquivo.",
  );
export const appointmentSchema = z
  .object({
    supplier_id: z.uuid().nullable(),
    title: text(180).min(2),
    starts_at: z.iso.datetime({ offset: true }),
    ends_at: z.iso.datetime({ offset: true }),
    status: z
      .enum(["scheduled", "completed", "cancelled"])
      .default("scheduled"),
    location: text(250).default(""),
    video_url: url.default(""),
    description: text(6000).default(""),
  })
  .refine(
    (v) =>
      Date.parse(v.ends_at) > Date.parse(v.starts_at) &&
      Date.parse(v.ends_at) - Date.parse(v.starts_at) <= 86400000,
    "Escolha um horário final posterior ao inicial, em até 24 horas.",
  );
export const noteSchema = z.object({
  supplier_id: z.uuid().nullable(),
  title: text(180).min(2),
  body: text(20000),
});
export const occasionSchema = z.object({
  id: z
    .string()
    .max(90)
    .regex(/^(ref-\d{4}-[a-z0-9-]+|[a-f0-9-]{36})$/)
    .optional(),
  title: text(180).min(2),
  event_date: calendarDate,
  kind: z.enum(["holiday", "commercial", "observance", "optional"]),
  notes: text(6000).default(""),
  hidden: z.boolean().default(false),
});
export const mutationSchema = z.discriminatedUnion("entity", [
  z.object({
    entity: z.literal("date"),
    revision: z.number().int().nonnegative().optional(),
    data: occasionSchema,
  }),
  z.object({
    entity: z.literal("supplier"),
    id: z.uuid().optional(),
    revision: z.number().int().positive().optional(),
    data: supplierSchema,
  }),
  z.object({
    entity: z.literal("appointment"),
    id: z.uuid().optional(),
    revision: z.number().int().positive().optional(),
    data: appointmentSchema,
  }),
  z.object({
    entity: z.literal("note"),
    id: z.uuid().optional(),
    revision: z.number().int().positive().optional(),
    data: noteSchema,
  }),
  z.object({ entity: z.literal("import"), data: importSchema }),
]);
export function whatsappNumber(raw: string) {
  const digits = raw.replace(/\D/g, "");
  const full =
    digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  return /^55[1-9][0-9](?:[2-5][0-9]{7}|9[0-9]{8})$/.test(full) ? full : null;
}
export function whatsappLink(phone: string, message: string) {
  const number = whatsappNumber(phone);
  return number
    ? `https://wa.me/${number}?text=${encodeURIComponent(message)}`
    : null;
}
