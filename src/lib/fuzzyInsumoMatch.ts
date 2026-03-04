/**
 * Fuzzy matching for insumo names to detect near-duplicates.
 * Handles accent variations (ô/ó/o), case differences, and token overlap.
 */

/** Remove accents and lowercase */
function normalize(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Tokenize into alphanumeric words */
function tokenize(str: string): string[] {
  return normalize(str)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1);
}

/** Calculate Levenshtein distance between two strings */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

export interface FuzzyMatch {
  name: string;
  id: string;
  score: number; // 0-1, higher = more similar
  reason: string;
}

/**
 * Find near-duplicate insumos by name.
 * Returns matches sorted by similarity score (highest first).
 */
export function findDuplicateInsumos(
  newName: string,
  existingInsumos: Array<{ id: string; nome: string }>,
  excludeId?: string,
): FuzzyMatch[] {
  if (!newName.trim()) return [];

  const normNew = normalize(newName);
  const tokensNew = tokenize(newName);
  const matches: FuzzyMatch[] = [];

  for (const insumo of existingInsumos) {
    if (excludeId && insumo.id === excludeId) continue;

    const normExisting = normalize(insumo.nome);

    // 1. Exact normalized match
    if (normNew === normExisting) {
      matches.push({ name: insumo.nome, id: insumo.id, score: 1.0, reason: 'Nome idêntico' });
      continue;
    }

    // 2. One contains the other
    if (normNew.includes(normExisting) || normExisting.includes(normNew)) {
      matches.push({ name: insumo.nome, id: insumo.id, score: 0.85, reason: 'Nome contido' });
      continue;
    }

    // 3. Levenshtein on normalized full string (for accent-only diffs like Amônio/Amônia)
    const maxLen = Math.max(normNew.length, normExisting.length);
    if (maxLen > 0) {
      const dist = levenshtein(normNew, normExisting);
      const similarity = 1 - dist / maxLen;
      if (similarity >= 0.80) {
        matches.push({ name: insumo.nome, id: insumo.id, score: similarity, reason: 'Nome muito semelhante' });
        continue;
      }
    }

    // 4. Token overlap (Jaccard-like)
    const tokensExisting = tokenize(insumo.nome);
    if (tokensNew.length > 0 && tokensExisting.length > 0) {
      const union = new Set([...tokensNew, ...tokensExisting]);
      const intersection = tokensNew.filter((t) => tokensExisting.includes(t));
      const jaccard = intersection.length / union.size;
      if (jaccard >= 0.5) {
        matches.push({ name: insumo.nome, id: insumo.id, score: jaccard * 0.8, reason: 'Termos semelhantes' });
      }
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}
