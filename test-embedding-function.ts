import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const { createEmbedding } = await import("./lib/embeddings");

  const embedding = await createEmbedding(
    "Customers are having problems with billing and payments."
  );

  console.log("Embedding function works successfully.");
  console.log("Embedding length:", embedding.length);
  console.log("First 5 values:", embedding.slice(0, 5));
}

main().catch((error) => {
  console.error("Embedding function test failed:", error);
  process.exit(1);
});