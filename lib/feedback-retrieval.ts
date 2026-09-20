import { prisma } from "./db";
import {
  retrieveRelevantFeedback,
  type SearchableFeedback,
} from "./semantic-search";

export async function searchWorkspaceFeedback(
  workspaceId: string,
  question: string,
  limit = 5
) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required.");
  }

  const feedbackRecords = await prisma.feedback.findMany({
    where: {
      workspaceId,
      deletedAt: null,
      embedding: {
        isNot: null,
      },
    },
    select: {
      id: true,
      content: true,
      channel: true,
      customerLabel: true,
      createdAt: true,
      sentiment: true,
      status: true,
      embedding: {
        select: {
          vector: true,
        },
      },
    },
  });

  const searchableFeedback: SearchableFeedback[] = feedbackRecords
    .filter(
      (
        item
      ): item is typeof item & {
        embedding: {
          vector: number[];
        };
      } => item.embedding !== null
    )
    .map((item) => ({
      id: item.id,
      content: item.content,
      channel: item.channel,
      customerLabel: item.customerLabel,
      createdAt: item.createdAt,
      sentiment: item.sentiment,
      status: item.status,
      embedding: item.embedding.vector,
    }));

  return retrieveRelevantFeedback(question, searchableFeedback, limit);
}