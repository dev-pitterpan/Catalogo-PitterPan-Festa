import { shiftDate } from "../admin/date-range.ts";
export function monthDays(month: string) {
  const first = `${month}-01`;
  const start = shiftDate(first, -new Date(`${first}T12:00:00Z`).getUTCDay());
  return Array.from({ length: 42 }, (_, i) => shiftDate(start, i));
}
export function monthShift(month: string, step: number) {
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + step);
  return date.toISOString().slice(0, 7);
}
export function localDay(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}
export function localTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function overlapsDay(start: string, end: string, day: string) {
  return (
    Date.parse(start) < Date.parse(`${shiftDate(day, 1)}T00:00:00-03:00`) &&
    Date.parse(end) > Date.parse(`${day}T00:00:00-03:00`)
  );
}
