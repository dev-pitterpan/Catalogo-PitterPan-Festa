import type { Occasion } from "./occasions.ts";
/** Themes follow the current title, including customized dates. */
export function occasionTheme(item: Pick<Occasion, "title" | "kind">) {
  const name = item.title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const themes: [RegExp, string, string][] = [
    [/halloween|dia das bruxas/, "🎃", "Abóbora de Halloween"],
    [/natal|papai noel/, "🎅", "Papai Noel"],
    [/pascoa/, "🐰", "Coelhinho da Páscoa"],
    [/crianca/, "🎈", "Balões do Dia das Crianças"],
    [/carnaval/, "🎭", "Máscara de Carnaval"],
    [/sao joao|junina|julina/, "🏮", "Balão de festa junina"],
    [/outubro rosa/, "🎀", "Laço do Outubro Rosa"],
    [/novembro azul/, "💙", "Coração do Novembro Azul"],
    [/namorado|dia das maes|dia dos pais/, "💝", "Presente e carinho"],
    [/black friday|consumidor|dia do cliente/, "🛍️", "Compras e presentes"],
    [/ano novo|reveillon|confraternizacao/, "🎉", "Celebração de Ano Novo"],
    [/independencia|republica|tiradentes/, "🇧🇷", "Brasil"],
    [/finados|paixao|corpus|aparecida/, "🕊️", "Pomba de paz"],
    [/mulher/, "🌷", "Flor do Dia da Mulher"],
    [/consciencia negra|zumbi/, "✊🏿", "Consciência Negra"],
    [/trabalho/, "🧑‍💼", "Dia do Trabalho"],
    [/aniversario/, "🎂", "Bolo de aniversário"],
    [/patricio|patrick/, "☘️", "Trevo de São Patrício"],
  ];
  const match = themes.find(([pattern]) => pattern.test(name));
  return match
    ? { symbol: match[1], label: match[2] }
    : {
        symbol: item.kind === "holiday" ? "📅" : "✨",
        label: item.kind === "holiday" ? "Feriado" : "Data especial",
      };
}
