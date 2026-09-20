import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const { prisma } = await import("./lib/db");
  const { getWorkspaceAnalytics } =
    await import("./lib/ask-loop/analytics");

  const workspace = await prisma.workspace.findFirst({
    select: {
      id: true,
      name: true,
    },
  });

  if (!workspace) {
    throw new Error("No workspace found.");
  }

  console.log("Workspace:", workspace.name);
  console.log("Workspace ID:", workspace.id);

  const analytics = await getWorkspaceAnalytics(workspace.id);

  console.log("\n=== FEEDBACK ===");
  console.log("Total:", analytics.feedback.total);
  console.log("Positive:", analytics.feedback.sentiment.positive);
  console.log("Neutral:", analytics.feedback.sentiment.neutral);
  console.log("Negative:", analytics.feedback.sentiment.negative);
  console.log(
    "Negative percentage:",
    analytics.feedback.negativePercentage.toFixed(2) + "%"
  );

  console.log("\n=== STATUS ===");
  console.log("New:", analytics.feedback.status.new);
  console.log("Reviewed:", analytics.feedback.status.reviewed);
  console.log("Actioned:", analytics.feedback.status.actioned);

  console.log(
    "New this week:",
    analytics.feedback.newThisWeek
  );

  console.log("\n=== CHANNELS ===");

  for (const channel of analytics.channels) {
    console.log(`${channel.channel}: ${channel.count}`);
  }

  console.log("\n=== THEMES ===");

  for (const theme of analytics.themes) {
    console.log(`${theme.name}: ${theme.count}`);
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("Ask LOOP analytics test failed:", error);
  process.exit(1);
});