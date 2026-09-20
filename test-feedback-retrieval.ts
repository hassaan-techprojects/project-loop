import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const { prisma } = await import("./lib/db");
  const { searchWorkspaceFeedback } =
    await import("./lib/feedback-retrieval");

  const workspace = await prisma.workspace.findFirst({
    select: {
      id: true,
      name: true,
    },
  });

  if (!workspace) {
    throw new Error("No workspace found in the database.");
  }

  console.log("Testing workspace:", workspace.name);
  console.log("Workspace ID:", workspace.id);

  const results = await searchWorkspaceFeedback(
    workspace.id,
    "Customers are having problems with billing and payments.",
    5
  );

  console.log("\nRetrieved feedback:", results.length);

  for (const [index, result] of results.entries()) {
    console.log(`\n${index + 1}.`);
    console.log("Similarity:", result.similarity);
    console.log("Content:", result.content);
    console.log("Channel:", result.channel);
    console.log("Sentiment:", result.sentiment);
    console.log("Status:", result.status);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Feedback retrieval test failed:", error);
  process.exit(1);
});