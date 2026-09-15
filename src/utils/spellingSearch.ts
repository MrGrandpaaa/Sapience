import { VocabularyItem } from '../core/models/vocabulary';

/**
 * Normalizes French text for spelling comparison:
 * - Converts to lowercase
 * - Strips diacritics / accents (e.g., é, è, ê, ç, à, ô)
 * - Trims whitespace
 */
export function normalizeSpelling(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Standard Levenshtein distance between two strings.
 * Used for detecting close typos in spelling.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost, // substitution
      );
    }
  }

  return dp[m][n];
}

export interface SpellingSearchResult {
  item: VocabularyItem;
  score: number; // 0 = exact match, higher = more distant
}

/**
 * Searches saved vocabulary items strictly based on SPELLING similarity.
 *
 * Rules:
 * 1. Only considers surface spelling similarity (forms, accents, typos).
 * 2. Does NOT merge distinct items (returns each distinct saved item).
 * 3. Does NOT filter by semantic similarity, lexical sense, or POS.
 * 4. Empty query returns empty array.
 */
export function searchBySpelling(
  items: VocabularyItem[],
  query: string,
): VocabularyItem[] {
  const cleanQuery = normalizeSpelling(query);
  if (!cleanQuery) return [];

  const matches: SpellingSearchResult[] = [];

  for (const item of items) {
    const cleanSurface = normalizeSpelling(item.surface_form);
    const cleanNormalized = normalizeSpelling(item.normalized_form || '');

    // 1. Exact match (accented or unaccented)
    if (cleanSurface === cleanQuery || cleanNormalized === cleanQuery) {
      matches.push({ item, score: 0 });
      continue;
    }

    // 2. Starts with query (prefix match)
    if (cleanSurface.startsWith(cleanQuery)) {
      matches.push({ item, score: 1 });
      continue;
    }

    // 3. Substring match
    if (cleanSurface.includes(cleanQuery)) {
      matches.push({ item, score: 2 });
      continue;
    }

    // 4. Query starts with item (e.g. query has extra prefix/suffix)
    if (cleanQuery.includes(cleanSurface) && cleanSurface.length >= 3) {
      matches.push({ item, score: 3 });
      continue;
    }

    // 5. Fuzzy spelling similarity via Levenshtein distance
    // Allow distance up to 2 for words longer than 3 characters
    const maxAllowedDistance = cleanQuery.length <= 3 ? 1 : 2;
    const distance = Math.min(
      levenshteinDistance(cleanSurface, cleanQuery),
      cleanNormalized ? levenshteinDistance(cleanNormalized, cleanQuery) : 99,
    );

    if (distance <= maxAllowedDistance) {
      matches.push({ item, score: 4 + distance });
    }
  }

  // Sort by closest match first
  matches.sort((a, b) => a.score - b.score);

  return matches.map((m) => m.item);
}
