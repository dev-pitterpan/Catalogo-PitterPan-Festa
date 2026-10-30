import { shiftDate } from "../admin/date-range.ts";
export type Occasion = {
  id: string;
  title: string;
  event_date: string;
  kind: "holiday" | "commercial" | "observance" | "optional";
  notes: string;
  hidden: boolean;
  revision: number;
  source: string;
  reference_date?: string;
  reference_title?: string;
};
export type OccasionOverride = Pick<
  Occasion,
  "id" | "title" | "event_date" | "notes" | "hidden" | "revision" | "kind"
>;
const nationalSource = "https://www.planalto.gov.br/ccivil_03/leis/l0662.htm";
function easter(year: number) {
  const a = year % 19,
    b = Math.floor(year / 100),
    c = year % 100,
    d = Math.floor(b / 4),
    e = b % 4,
    f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3),
    h = (19 * a + b - d - g + 15) % 30,
    i = Math.floor(c / 4),
    k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7,
    m = Math.floor((a + 11 * h + 22 * l) / 451),
    month = Math.floor((h + l - 7 * m + 114) / 31),
    day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function nthSunday(year: number, month: number, n: number) {
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const weekday = new Date(`${first}T12:00:00Z`).getUTCDay();
  return shiftDate(first, ((7 - weekday) % 7) + (n - 1) * 7);
}
export function referenceOccasions(year: number): Occasion[] {
  const rows: Occasion[] = [];
  const add = (
    key: string,
    date: string,
    title: string,
    kind: Occasion["kind"],
    notes = "",
    source = "",
  ) =>
    rows.push({
      id: `ref-${year}-${key}`,
      title,
      event_date: date,
      kind,
      notes,
      hidden: false,
      revision: 0,
      source,
      reference_date: date,
      reference_title: title,
    });
  const fixed = (
    md: string,
    title: string,
    kind: Occasion["kind"],
    notes = "",
    source = "",
  ) => add(md, `${year}-${md}`, title, kind, notes, source);
  fixed(
    "01-01",
    "Confraternização Universal",
    "holiday",
    "Feriado nacional.",
    nationalSource,
  );
  fixed("04-21", "Tiradentes", "holiday", "Feriado nacional.", nationalSource);
  fixed(
    "05-01",
    "Dia do Trabalho",
    "holiday",
    "Feriado nacional.",
    nationalSource,
  );
  fixed(
    "09-07",
    "Independência do Brasil",
    "holiday",
    "Feriado nacional.",
    nationalSource,
  );
  fixed(
    "10-12",
    "Nossa Senhora Aparecida · Dia das Crianças",
    "holiday",
    "Feriado nacional e oportunidade comercial para o Dia das Crianças.",
    "https://www.planalto.gov.br/ccivil_03/leis/l6802.htm",
  );
  fixed("11-02", "Finados", "holiday", "Feriado nacional.", nationalSource);
  fixed(
    "11-15",
    "Proclamação da República",
    "holiday",
    "Feriado nacional.",
    nationalSource,
  );
  fixed(
    "11-20",
    "Dia Nacional de Zumbi e da Consciência Negra",
    "holiday",
    "Feriado nacional.",
    "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14759.htm",
  );
  fixed("12-25", "Natal", "holiday", "Feriado nacional.", nationalSource);
  fixed("03-08", "Dia Internacional da Mulher", "observance");
  fixed(
    "03-09",
    "Aniversário de Joinville",
    "observance",
    "Data local de referência. Confira o calendário municipal antes de definir expediente.",
  );
  fixed("03-15", "Dia do Consumidor", "commercial");
  fixed("06-12", "Dia dos Namorados", "commercial");
  fixed(
    "06-24",
    "São João",
    "observance",
    "Data comemorativa; a condição de feriado depende da localidade.",
  );
  fixed("09-15", "Dia do Cliente", "commercial");
  fixed("10-01", "Início do Outubro Rosa", "observance");
  fixed("10-31", "Halloween", "commercial");
  fixed("11-01", "Início do Novembro Azul", "observance");
  const pascoa = easter(year);
  add(
    "easter",
    pascoa,
    "Páscoa",
    "observance",
    "Domingo de Páscoa. Planeje a campanha e as compras antecipadamente.",
  );
  add(
    "good-friday",
    shiftDate(pascoa, -2),
    "Sexta-feira da Paixão",
    "observance",
    "Data religiosa. Confira a legislação e o calendário local para o expediente.",
  );
  add(
    "carnival",
    shiftDate(pascoa, -47),
    "Carnaval",
    "optional",
    "Referência para planejamento. Ponto facultativo não equivale automaticamente a feriado no comércio; confirme as regras locais.",
  );
  add(
    "corpus",
    shiftDate(pascoa, 60),
    "Corpus Christi",
    "optional",
    "Referência para planejamento. Confira a classificação e o expediente no calendário local.",
  );
  add("mothers", nthSunday(year, 5, 2), "Dia das Mães", "commercial");
  add("fathers", nthSunday(year, 8, 2), "Dia dos Pais", "commercial");
  const firstNovember = `${year}-11-01`;
  const weekday = new Date(`${firstNovember}T12:00:00Z`).getUTCDay();
  const thanksgiving = shiftDate(firstNovember, ((4 - weekday + 7) % 7) + 21);
  add("black-friday", shiftDate(thanksgiving, 1), "Black Friday", "commercial");
  return rows;
}
export function calendarOccasions(
  start: string,
  end: string,
  overrides: OccasionOverride[],
): Occasion[] {
  const year = Number(start.slice(0, 4)),
    last = Number(end.slice(0, 4));
  const map = new Map<string, Occasion>();
  for (let y = year - 1; y <= last + 1; y++)
    for (const row of referenceOccasions(y)) map.set(row.id, row);
  for (const row of overrides) {
    const reference = map.get(row.id);
    map.set(row.id, {
      ...reference,
      ...row,
      source: reference?.source || "",
      reference_date: reference?.event_date,
      reference_title: reference?.title,
    });
  }
  return [...map.values()]
    .filter((row) => row.event_date >= start && row.event_date <= end)
    .sort(
      (a, b) =>
        a.event_date.localeCompare(b.event_date) ||
        a.title.localeCompare(b.title, "pt-BR"),
    );
}
