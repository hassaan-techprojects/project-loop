import { createEmbedding } from "./embeddings";

export type SearchableFeedback = {
  id: string;
  content: string;
  channel: string;
  customerLabel: string | null;
  createdAt: Date;
  sentiment: "POS" | "NEU" | "NEG" | null;
  status: "NEW" | "REVIEWED" | "ACTIONED";
  embedding: number[];
};

export type RetrievedFeedback = SearchableFeedback & {
  similarity: number;
};

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    throw new Error("Embedding vectors must have the same non-zero length.");
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let index = 0; index < a.length; index += 1) {
    dotProduct += a[index] * b[index];
    magnitudeA += a[index] * a[index];
    magnitudeB += b[index] * b[index];
  }

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

export async function retrieveRelevantFeedback(
  question: string,
  feedback: SearchableFeedback[],
  limit = 5
): Promise<RetrievedFeedback[]> {
  const queryEmbedding = await createEmbedding(question);

  return feedback
    .map((item) => ({
      ...item,
      similarity: cosineSimilarity(queryEmbedding, item.embedding),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}