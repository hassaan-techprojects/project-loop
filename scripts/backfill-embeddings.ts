import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const { prisma } = await import("../lib/db");
  const { createEmbedding } = await import("../lib/embeddings");

  const feedbackRecords = await prisma.feedback.findMany({
    where: {
      deletedAt: null,
      embedding: {
        is: null,
      },
    },
    select: {
      id: true,
      content: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  console.log(`Feedback items needing embeddings: ${feedbackRecords.length}`);

  if (feedbackRecords.length === 0) {
    console.log("All active feedback already has embeddings.");
    await prisma.$disconnect();
    return;
  }

  let created = 0;
  let failed = 0;

  for (const [index, feedback] of feedbackRecords.entries()) {
    try {
      console.log(
        `[${index + 1}/${feedbackRecords.length}] Creating embedding for ${feedback.id}...`
      );

      const vector = await createEmbedding(feedback.content);

      await prisma.embedding.create({
        data: {
          feedbackId: feedback.id,
          vector,
        },
      });

      created += 1;

      console.log(
        `[${index + 1}/${feedbackRecords.length}] Embedding saved.`
      );
    } catch (error) {
      failed += 1;

      console.error(
        `[${index + 1}/${feedbackRecords.length}] Failed for ${feedback.id}:`,
        error
      );
    }
  }

  console.log("\nEmbedding backfill complete.");
  console.log(`Created: ${created}`);
  console.log(`Failed: ${failed}`);

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("Embedding backfill failed:", error);
  process.exit(1);
});