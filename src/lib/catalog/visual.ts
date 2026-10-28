import { normalizeText } from "./query.ts";

const themes: Record<string, [string, string]> = {
  halloween: ["#ff8b3d", "#9869ec"],
  natal: ["#4bd49a", "#ec697a"],
  pascoa: ["#c28aef", "#f5c06d"],
  "festa-junina": ["#f6be50", "#ef775d"],
  "dia-das-criancas": ["#63c8ff", "#f690c0"],
  todos: ["#66b8ff", "#789bc6"],
  fantasias: ["#ba91fa", "#f58db8"],
  artesanato: ["#eeaa6c", "#78cfb4"],
  festas: ["#77b9f3", "#ef9bc4"],
  embalagens: ["#68ccbf", "#8fa9ef"],
  adornos: ["#e895c5", "#b89df3"],
  utilidades: ["#82bbc9", "#91c6ad"],
  guloseimas: ["#f591b7", "#f5c77c"],
  confeitaria: ["#eab27e", "#df94b7"],
  chocolates: ["#d6a279", "#e8c18c"],
  "copa-do-mundo": ["#90d69c", "#efd47b"],
  "st-patrick": ["#76cba3", "#c9d27d"],
  carnaval: ["#da96f1", "#f0b178"],
  "sem-categoria": ["#a8b4ca", "#8ea5cb"],
};
export function catalogVisual(key: string) {
  const slug = normalizeText(key).replace(/ /g, "-") || "todos";
  let seed = 0;
  for (const char of slug)
    seed = (Math.imul(seed, 31) + char.charCodeAt(0)) >>> 0;
  // A single storefront palette while seasonal identities are being reviewed.
  const [accent, secondary] = themes.todos;
  const rgb = (hex: string) =>
    [1, 3, 5]
      .map((offset) => parseInt(hex.slice(offset, offset + 2), 16))
      .join(", ");
  return {
    slug,
    seed,
    accent,
    secondary,
    accentRgb: rgb(accent),
    secondaryRgb: rgb(secondary),
    banner: `/api/catalog-banner/${encodeURIComponent(slug)}/?v=4`,
  };
}
function hslHex(h: number, s: number, l: number) {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  return (
    "#" +
    [0, 8, 4]
      .map((n) => {
        const k = (n + h / 30) % 12;
        return Math.round(
          255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))),
        )
          .toString(16)
          .padStart(2, "0");
      })
      .join("")
  );
}

/** Static vector artwork: no remote assets, scripts, text injection or animation. */
export function catalogBannerSvg(key: string) {
  const { accent, secondary, seed } = catalogVisual(key);
  const confetti = Array.from({ length: 32 }, (_, i) => {
    const x = 720 + ((seed + i * 137) % 860),
      y = 25 + ((seed + i * 83) % 510);
    return `<rect x="${x}" y="${y}" width="${i % 3 === 0 ? 18 : 5}" height="${i % 3 === 0 ? 5 : 13}" rx="2" fill="${i % 2 ? accent : secondary}" opacity=".35" transform="rotate(${i * 23} ${x} ${y})"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="560" viewBox="0 0 1600 560"><defs><linearGradient id="bg"><stop stop-color="#edf4f9"/><stop offset="1" stop-color="#dfeaf3"/></linearGradient><radialGradient id="glow"><stop stop-color="${accent}" stop-opacity=".34"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient><linearGradient id="ribbon"><stop stop-color="${accent}"/><stop offset="1" stop-color="${secondary}"/></linearGradient></defs><rect width="1600" height="560" fill="url(#bg)"/><ellipse cx="1300" cy="220" rx="600" ry="470" fill="url(#glow)"/>${confetti}<circle cx="1320" cy="290" r="190" fill="none" stroke="${accent}" stroke-opacity=".22" stroke-width="2"/><circle cx="1320" cy="290" r="148" fill="none" stroke="${secondary}" stroke-opacity=".3" stroke-dasharray="3 12" stroke-width="2"/><path d="M970 560C1150 480 1020 250 1260 190S1480 300 1640 80" fill="none" stroke="url(#ribbon)" stroke-width="45" opacity=".3"/><path d="M1190 120v85m-42-42h84m-72-30 60 60m0-60-60 60" stroke="${accent}" stroke-width="3" stroke-linecap="round" opacity=".65"/><path d="M1430 330v65m-32-32h64m-55-23 46 46m0-46-46 46" stroke="${secondary}" stroke-width="3" stroke-linecap="round" opacity=".8"/><path d="M0 550h1600" stroke="url(#ribbon)" stroke-width="8"/></svg>`;
}
