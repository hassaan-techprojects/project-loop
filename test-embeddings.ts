import dotenv from "dotenv";
import { InferenceClient } from "@huggingface/inference";

dotenv.config({ path: ".env.local" });

async function main() {
  const apiKey = process.env.HUGGINGFACE_API_KEY;

  if (!apiKey) {
    throw new Error("HUGGINGFACE_API_KEY is not configured.");
  }

  const client = new InferenceClient(apiKey);

  const result = await client.featureExtraction({
    model: "sentence-transformers/all-MiniLM-L6-v2",
    inputs: "Customers are having problems with billing and payments.",
  });

  console.log("Embedding generated successfully.");
  console.log("Result type:", typeof result);

  if (Array.isArray(result)) {
    console.log("Embedding length:", result.length);
    console.log("First 5 values:", result.slice(0, 5));
  } else {
    console.log("Embedding result:", result);
  }
}

main().catch((error) => {
  console.error("Embedding test failed:", error);
  process.exit(1);
});