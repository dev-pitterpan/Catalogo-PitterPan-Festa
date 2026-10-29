import municipalities from "./municipalities.json" with { type: "json" };
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const locations = new Map(
  municipalities.map(([city, state, latitude, longitude]) => [
    `${state}:${normalize(String(city))}`,
    { latitude: Number(latitude), longitude: Number(longitude) },
  ]),
);
/** Exact municipality + UF match. Never guesses an address or a similarly named city. */
export function municipalityLocation(
  city: string | null,
  state: string | null,
  country: string | null,
) {
  return country === "BR" && city && state
    ? (locations.get(`${state.toUpperCase()}:${normalize(city)}`) ?? null)
    : null;
}
