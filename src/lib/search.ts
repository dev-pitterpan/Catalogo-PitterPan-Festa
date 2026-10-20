// Busca original preservada: pesos por campo, acentos, prefixos e tolerância a digitação.
import type { Product } from "../types/catalog";
const SEARCH_STOPWORDS = new Set([
  "a",
  "o",
  "as",
  "os",
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "para",
  "por",
  "com",
  "um",
  "uma",
  "uns",
  "umas",
  "the",
]);

const normalizeSearchText = (value: unknown) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const tokenizeSearch = (value: unknown) =>
  normalizeSearchText(value)
    .split(" ")
    .filter(Boolean)
    .filter((token) => !SEARCH_STOPWORDS.has(token))
    .filter((token) => token.length > 2 || /\d/.test(token));

const levenshteinDistance = (a: string, b: string) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = new Array(b.length + 1);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      );
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }

  return previous[b.length];
};

const fuzzyTokenScore = (queryToken: string, candidateToken: string) => {
  if (!queryToken || !candidateToken) return 0;
  if (queryToken === candidateToken) return 1;

  if (
    candidateToken.startsWith(queryToken) ||
    queryToken.startsWith(candidateToken)
  ) {
    const ratio =
      Math.min(queryToken.length, candidateToken.length) /
      Math.max(queryToken.length, candidateToken.length);
    return 0.88 + 0.1 * ratio;
  }

  if (
    candidateToken.includes(queryToken) ||
    queryToken.includes(candidateToken)
  ) {
    return 0.82;
  }

  const maxLength = Math.max(queryToken.length, candidateToken.length);
  if (maxLength < 4) return 0;

  const distance = levenshteinDistance(queryToken, candidateToken);
  const similarity = 1 - distance / maxLength;

  if (queryToken.length <= 4) return similarity >= 0.76 ? similarity : 0;
  if (queryToken.length <= 7) return similarity >= 0.7 ? similarity : 0;
  return similarity >= 0.66 ? similarity : 0;
};

const fieldTokens = (value: unknown) => tokenizeSearch(value);

const bestTokenMatch = (queryToken: string, tokens: string[]) =>
  tokens.reduce(
    (best, candidate) => Math.max(best, fuzzyTokenScore(queryToken, candidate)),
    0,
  );

export const productSearchScore = (
  product: Product,
  rawQuery: string,
  catalogName = "",
) => {
  const query = normalizeSearchText(rawQuery);
  const queryTokens = tokenizeSearch(rawQuery);
  if (!queryTokens.length) return 1;

  const fields = [
    { value: product.name, weight: 9 },
    { value: product.category, weight: 6 },
    {
      value: Array.isArray(product.keywords) ? product.keywords.join(" ") : "",
      weight: 7,
    },
    { value: product.description, weight: 3 },
    { value: product.id, weight: 5 },
    { value: catalogName, weight: 2 },
  ].map((field) => ({
    ...field,
    normalized: normalizeSearchText(field.value),
    tokens: fieldTokens(field.value),
  }));

  let score = 0;
  let matchedTokens = 0;

  fields.forEach((field) => {
    if (!field.normalized) return;
    if (field.normalized === query) score += field.weight * 3.2;
    else if (field.normalized.includes(query)) score += field.weight * 2.2;
  });

  queryTokens.forEach((queryToken) => {
    let bestWeighted = 0;

    fields.forEach((field) => {
      const tokenScore = bestTokenMatch(queryToken, field.tokens);
      if (tokenScore > 0) {
        bestWeighted = Math.max(bestWeighted, tokenScore * field.weight);
      }
    });

    if (bestWeighted > 0) {
      matchedTokens += 1;
      score += bestWeighted;
    }
  });

  const coverage = matchedTokens / queryTokens.length;

  // Exige que a maior parte da intenção tenha sido encontrada.
  if (coverage < 0.66) return 0;

  // Quanto mais palavras da busca forem atendidas, maior a relevância.
  score += coverage * 12;

  return score;
};
