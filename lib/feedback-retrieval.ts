import { prisma } from "./db";

import {
  retrieveRelevantFeedback,
  type SearchableFeedback,
} from "./semantic-search";

export type WorkspaceFeedbackRecord = {
  id: string;
  content: string;
  channel: string;
  customerLabel: string | null;
  createdAt: Date;
  sentiment: string | null;
  status: string;
  sourceRef: string | null;
  sentimentScore: number | null;
  themes: Array<{
    id: string;
    name: string;
    confidence: number;
  }>;
};

export type FeedbackInvestigationResult = {
  allFeedbackCount: number;
  matchedFeedbackCount: number;
  recentFeedback: WorkspaceFeedbackRecord[];
  directMatches: WorkspaceFeedbackRecord[];
  semanticMatches: Awaited<ReturnType<typeof retrieveRelevantFeedback>>;
  semanticSearchAvailable: boolean;
};

export async function getWorkspaceFeedback(
  workspaceId: string
): Promise<WorkspaceFeedbackRecord[]> {
  if (!workspaceId) {
    throw new Error("Workspace ID is required.");
  }

  const feedbackRecords = await prisma.feedback.findMany({
    where: {
      workspaceId,
      deletedAt: null,
    },
    select: {
      id: true,
      content: true,
      channel: true,
      sourceRef: true,
      customerLabel: true,
      createdAt: true,
      sentiment: true,
      sentimentScore: true,
      status: true,
      feedbackThemes: {
        select: {
          confidence: true,
          theme: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return feedbackRecords.map((item) => ({
    id: item.id,
    content: item.content,
    channel: item.channel,
    customerLabel: item.customerLabel,
    sourceRef: item.sourceRef,
    createdAt: item.createdAt,
    sentiment: item.sentiment,
    sentimentScore: item.sentimentScore,
    status: item.status,
    themes: item.feedbackThemes.map((feedbackTheme) => ({
      id: feedbackTheme.theme.id,
      name: feedbackTheme.theme.name,
      confidence: feedbackTheme.confidence,
    })),
  }));
}

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
      embedding: { isNot: null },
    },
    select: {
      id: true,
      content: true,
      channel: true,
      customerLabel: true,
      createdAt: true,
      sentiment: true,
      status: true,
      embedding: { select: { vector: true } },
    },
  });

  const searchableFeedback: SearchableFeedback[] = feedbackRecords
    .filter(
      (
        item
      ): item is typeof item & { embedding: { vector: number[] } } =>
        item.embedding !== null
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

  if (searchableFeedback.length === 0) {
    return [];
  }

  return retrieveRelevantFeedback(question, searchableFeedback, limit);
}

const STOP_WORDS = new Set([
  "the", "and", "are", "was", "were", "what", "when", "where", "which",
  "who", "how", "why", "does", "did", "has", "have", "had", "can",
  "could", "would", "should", "will", "about", "from", "with", "this",
  "that", "these", "those", "there", "their", "they", "them", "our",
  "your", "you", "feedback", "customer", "customers", "please", "show",
  "tell", "give", "find", "look", "me", "any", "some", "much", "many",
  "number", "count", "total", "today", "yesterday", "week", "month", "year",
  "into", "than", "rather", "instead", "item", "items", "every", "all",
]);

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getMeaningfulQuestionTerms(question: string): string[] {
  return Array.from(
    new Set(
      normalize(question)
        .split(" ")
        .map((term) => term.replace(/^['-]+|['-]+$/g, ""))
        .filter(
          (term) => term.length >= 3 && !STOP_WORDS.has(term)
        )
    )
  ).slice(0, 20);
}

function getTemporalRange(question: string): {
  start: Date | null;
  end: Date | null;
} {
  const normalized = normalize(question);
  const now = new Date();

  if (normalized.includes("today")) {
    const start = new Date(now);
    start.setUTCHours(0, 0, 0, 0);
    return { start, end: now };
  }

  if (normalized.includes("yesterday")) {
    const end = new Date(now);
    end.setUTCHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 1);
    return { start, end };
  }

  if (normalized.includes("last week")) {
    const end = new Date(now);
    const day = end.getUTCDay();
    const daysSinceMonday = day === 0 ? 6 : day - 1;
    end.setUTCDate(end.getUTCDate() - daysSinceMonday);
    end.setUTCHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 7);
    return { start, end };
  }

  if (normalized.includes("this week") || normalized.includes("weekly")) {
    const start = new Date(now);
    const day = start.getUTCDay();
    const daysSinceMonday = day === 0 ? 6 : day - 1;
    start.setUTCDate(start.getUTCDate() - daysSinceMonday);
    start.setUTCHours(0, 0, 0, 0);
    return { start, end: now };
  }

  if (normalized.includes("last month")) {
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    return { start, end };
  }

  if (normalized.includes("this month")) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return { start, end: now };
  }

  return { start: null, end: null };
}

function scoreDirectMatch(
  item: WorkspaceFeedbackRecord,
  terms: string[],
  temporal: { start: Date | null; end: Date | null }
) {
  if (temporal.start && item.createdAt < temporal.start) return -1;
  if (temporal.end && item.createdAt >= temporal.end) return -1;

  const fields = [
    item.content,
    item.customerLabel ?? "",
    item.channel,
    item.sentiment ?? "",
    item.status,
    item.sourceRef ?? "",
    ...item.themes.map((theme) => theme.name),
  ].map(normalize);

  if (terms.length === 0) {
    return 1;
  }

  let score = 0;

  for (const term of terms) {
    if (fields[0].includes(term)) score += 5;
    else if (fields.slice(1).some((field) => field.includes(term))) score += 3;
  }

  return score;
}

export async function investigateWorkspaceFeedback(
  workspaceId: string,
  question: string,
  semanticLimit = 10
): Promise<FeedbackInvestigationResult> {
  if (!workspaceId) {
    throw new Error("Workspace ID is required.");
  }

  const allFeedback = await getWorkspaceFeedback(workspaceId);
  const terms = getMeaningfulQuestionTerms(question);
  const temporal = getTemporalRange(question);

  const scored = allFeedback
    .map((item) => ({
      item,
      score: scoreDirectMatch(item, terms, temporal),
    }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.item.createdAt.getTime() - a.item.createdAt.getTime();
    });

  const directMatches = scored
    .filter((item) => item.score > 0 || terms.length === 0)
    .map((item) => item.item);

  const recentFeedback = allFeedback
    .filter((item) => {
      if (temporal.start && item.createdAt < temporal.start) return false;
      if (temporal.end && item.createdAt >= temporal.end) return false;
      return true;
    })
    .slice(0, 20);

  let semanticMatches: Awaited<ReturnType<typeof retrieveRelevantFeedback>> = [];
  let semanticSearchAvailable = true;

  try {
    semanticMatches = await searchWorkspaceFeedback(
      workspaceId,
      question,
      Math.min(Math.max(semanticLimit, 1), 20)
    );
  } catch (error) {
    semanticSearchAvailable = false;
    console.warn("Ask LOOP semantic feedback search unavailable:", error);
  }

  return {
    allFeedbackCount: allFeedback.length,
    matchedFeedbackCount: directMatches.length,
    recentFeedback,
    directMatches: directMatches.slice(0, 40),
    semanticMatches,
    semanticSearchAvailable,
  };
}
