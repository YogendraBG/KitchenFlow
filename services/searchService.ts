// Calculate Levenshtein distance between two strings
const levenshtein = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  // increment along the first column of each row
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // increment each column in the first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

/**
 * Fuzzy matches a query against a text target.
 * Returns true if:
 * 1. The query is a substring of the text (normalized).
 * 2. Or if all tokens in the query roughly match tokens in the text (Levenshtein distance).
 */
export const fuzzyMatch = (query: string, text: string): boolean => {
  if (!query) return true;
  if (!text) return false;

  const q = query.toLowerCase().trim();
  const t = text.toLowerCase();

  // 1. Direct substring match (Fastest & Most common)
  if (t.includes(q)) return true;

  // 2. Tokenize and Fuzzy Match
  const queryTokens = q.split(/\s+/).filter(x => x.length > 0);
  const textTokens = t.split(/\s+/);

  // We require ALL tokens in the query to find a match in the text
  // e.g., "chickn rice" should match "Chicken Fried Rice"
  return queryTokens.every(qToken => {
    return textTokens.some(tToken => {
      // Exact token match
      if (tToken === qToken) return true;
      
      // Substring match within token
      if (tToken.includes(qToken)) return true;

      // Fuzzy match for longer words
      // Allow 1 typo for words > 3 chars
      // Allow 2 typos for words > 6 chars
      if (qToken.length > 3) {
        const threshold = qToken.length > 6 ? 2 : 1;
        return levenshtein(qToken, tToken) <= threshold;
      }
      
      return false;
    });
  });
};
