import { z } from "zod";
export const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(`${s}T12:00:00Z`);
    return (
      s >= "0001-01-01" &&
      Number.isFinite(d.getTime()) &&
      d.toISOString().slice(0, 10) === s
    );
  });
export const dateRangeFields = {
  start: calendarDate.or(z.literal("")).default(""),
  end: calendarDate.or(z.literal("")).default(""),
};
export const dateRangeSchema = z
  .object(dateRangeFields)
  .refine(
    (r) =>
      (!r.start && !r.end) ||
      (!!r.start &&
        !!r.end &&
        r.start <= r.end &&
        (Date.parse(r.end) - Date.parse(r.start)) / 86400000 < 366),
    { message: "Escolha um intervalo válido de até 366 dias." },
  );
export type DateRange = { start: string; end: string };
export function shiftDate(day: string, days: number) {
  return new Date(Date.parse(`${day}T12:00:00Z`) + days * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function todayDate(timeZone = "America/Sao_Paulo", now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return ["year", "month", "day"]
    .map((k) => parts.find((p) => p.type === k)!.value)
    .join("-");
}
