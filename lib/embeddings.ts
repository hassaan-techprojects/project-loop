import { InferenceClient } from "@huggingface/inference";

const EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2";

function getHuggingFaceClient() {
  const apiKey = process.env.HUGGINGFACE_API_KEY;

  if (!apiKey) {
    throw new Error("HUGGINGFACE_API_KEY is not configured.");
  }

  return new InferenceClient(apiKey);
}

export async function createEmbedding(text: string): Promise<number[]> {
  const input = text.trim();

  if (!input) {
    throw new Error("Cannot create an embedding from empty text.");
  }

  const client = getHuggingFaceClient();

  const result = await client.featureExtraction({
    model: EMBEDDING_MODEL,
    inputs: input,
  });

  if (!Array.isArray(result)) {
    throw new Error("Hugging Face returned an invalid embedding response.");
  }

  if (
    result.length === 0 ||
    !result.every((value) => typeof value === "number")
  ) {
    throw new Error("Hugging Face returned an invalid embedding vector.");
  }

  return result;
}