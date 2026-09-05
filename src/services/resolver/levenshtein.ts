/**
 * Normalized Levenshtein edit distance and similarity calculator.
 */

export function calculateLevenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export function calculateStringSimilarity(str1: string, str2: string): number {
  if (!str1 && !str2) return 1.0;
  if (!str1 || !str2) return 0.0;
  if (str1 === str2) return 1.0;

  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1.0;

  const distance = calculateLevenshteinDistance(str1, str2);
  return Math.max(0, 1 - distance / maxLen);
}

// Token Set Similarity for names with swapped first/last name order or initials
export function calculateTokenSimilarity(name1: string, name2: string): number {
  const tokens1 = name1.split(' ').filter(Boolean);
  const tokens2 = name2.split(' ').filter(Boolean);

  if (tokens1.length === 0 || tokens2.length === 0) return 0.0;

  // Check matching tokens
  let matchedScores = 0;
  tokens1.forEach((t1) => {
    let bestMatch = 0;
    tokens2.forEach((t2) => {
      // If initial matching (e.g. 'r' vs 'ramesh')
      if ((t1.length === 1 || t2.length === 1) && t1[0] === t2[0]) {
        bestMatch = Math.max(bestMatch, 0.95);
      } else {
        const sim = calculateStringSimilarity(t1, t2);
        bestMatch = Math.max(bestMatch, sim);
      }
    });
    matchedScores += bestMatch;
  });

  return matchedScores / Math.max(tokens1.length, tokens2.length);
}
