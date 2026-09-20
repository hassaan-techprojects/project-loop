import { searchWorkspaceFeedback } from "@/lib/feedback-retrieval";

export async function searchFeedbackTool(
  workspaceId: string,
  question: string,
  limit = 8
) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required.");
  }

  const trimmedQuestion = question.trim();

  if (!trimmedQuestion) {
    throw new Error("Feedback search question is required.");
  }

  const safeLimit = Math.min(Math.max(limit, 1), 20);

  const results = await searchWorkspaceFeedback(
    workspaceId,
    trimmedQuestion,
    safeLimit
  );

  return results.map((feedback) => ({
    id: feedback.id,
    content: feedback.content,
    channel: feedback.channel,
    customerLabel: feedback.customerLabel,
    sentiment: feedback.sentiment,
    status: feedback.status,
    createdAt: feedback.createdAt,
    similarity: feedback.similarity,
  }));
}