import {
  investigateWorkspaceFeedback,
} from "@/lib/feedback-retrieval";

export async function searchFeedbackTool(
  workspaceId: string,
  question: string,
  limit = 12
) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required.");
  }

  const trimmedQuestion = question.trim();

  if (!trimmedQuestion) {
    throw new Error("Feedback search question is required.");
  }

  const safeLimit = Math.min(Math.max(limit, 1), 30);
  const investigation = await investigateWorkspaceFeedback(
    workspaceId,
    trimmedQuestion,
    safeLimit
  );

  return investigation;
}
