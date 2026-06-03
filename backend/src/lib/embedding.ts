// Handles cosineSimilarity logic.
export const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / ((Math.sqrt(normA) * Math.sqrt(normB)) || 1);
};

// Handles parseVector logic.
export const parseVector = (raw: unknown): number[] => {
  if (Array.isArray(raw)) {
    return raw.filter((v): v is number => typeof v === "number");
  }
  return [];
};
