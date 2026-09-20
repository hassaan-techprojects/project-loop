import { prisma } from "@/lib/db";

type AnalyticsToolResult =
  | {
      type: "summary";
      totalFeedback: number;
      negativeFeedback: number;
      negativePercentage: number;
      newThisWeek: number;
    }
  | {
      type: "sentiment";
      positive: number;
      neutral: number;
      negative: number;
      total: number;
    }
  | {
      type: "channels";
      channels: Array<{
        channel: string;
        count: number;
      }>;
    }
  | {
      type: "themes";
      themes: Array<{
        theme: string;
        count: number;
      }>;
    };

function validateWorkspaceId(workspaceId: string) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required.");
  }
}

function getStartOfWeek() {
  const now = new Date();
  const day = now.getDay();
  const difference = day === 0 ? 6 : day - 1;

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - difference);
  startOfWeek.setHours(0, 0, 0, 0);

  return startOfWeek;
}

export async function getWorkspaceAnalyticsSummary(
  workspaceId: string
): Promise<AnalyticsToolResult> {
  validateWorkspaceId(workspaceId);

  const startOfWeek = getStartOfWeek();

  const [
    totalFeedback,
    negativeFeedback,
    newThisWeek,
  ] = await Promise.all([
    prisma.feedback.count({
      where: {
        workspaceId,
        deletedAt: null,
      },
    }),

    prisma.feedback.count({
      where: {
        workspaceId,
        deletedAt: null,
        sentiment: "NEG",
      },
    }),

    prisma.feedback.count({
      where: {
        workspaceId,
        deletedAt: null,
        createdAt: {
          gte: startOfWeek,
        },
      },
    }),
  ]);

  const negativePercentage =
    totalFeedback === 0
      ? 0
      : Math.round((negativeFeedback / totalFeedback) * 100);

  return {
    type: "summary",
    totalFeedback,
    negativeFeedback,
    negativePercentage,
    newThisWeek,
  };
}

export async function getWorkspaceSentimentAnalytics(
  workspaceId: string
): Promise<AnalyticsToolResult> {
  validateWorkspaceId(workspaceId);

  const sentimentGroups = await prisma.feedback.groupBy({
    by: ["sentiment"],
    where: {
      workspaceId,
      deletedAt: null,
    },
    _count: {
      _all: true,
    },
  });

  let positive = 0;
  let neutral = 0;
  let negative = 0;

  for (const group of sentimentGroups) {
    if (group.sentiment === "POS") {
      positive = group._count._all;
    }

    if (group.sentiment === "NEU") {
      neutral = group._count._all;
    }

    if (group.sentiment === "NEG") {
      negative = group._count._all;
    }
  }

  return {
    type: "sentiment",
    positive,
    neutral,
    negative,
    total: positive + neutral + negative,
  };
}

export async function getWorkspaceChannelAnalytics(
  workspaceId: string
): Promise<AnalyticsToolResult> {
  validateWorkspaceId(workspaceId);

  const channelGroups = await prisma.feedback.groupBy({
    by: ["channel"],
    where: {
      workspaceId,
      deletedAt: null,
    },
    _count: {
      _all: true,
    },
    orderBy: {
      _count: {
        channel: "desc",
      },
    },
  });

  return {
    type: "channels",
    channels: channelGroups.map((group) => ({
      channel: group.channel,
      count: group._count._all,
    })),
  };
}

export async function getWorkspaceThemeAnalytics(
  workspaceId: string
): Promise<AnalyticsToolResult> {
  validateWorkspaceId(workspaceId);

  const themeGroups = await prisma.feedbackTheme.groupBy({
    by: ["themeId"],
    where: {
      feedback: {
        workspaceId,
        deletedAt: null,
      },
      theme: {
        workspaceId,
        isActive: true,
      },
    },
    _count: {
      _all: true,
    },
    orderBy: {
      _count: {
        themeId: "desc",
      },
    },
  });

  const themeIds = themeGroups.map((group) => group.themeId);

  if (themeIds.length === 0) {
    return {
      type: "themes",
      themes: [],
    };
  }

  const themes = await prisma.theme.findMany({
    where: {
      workspaceId,
      isActive: true,
      id: {
        in: themeIds,
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  const themeNames = new Map(
    themes.map((theme) => [theme.id, theme.name])
  );

  return {
    type: "themes",
    themes: themeGroups
      .map((group) => ({
        theme: themeNames.get(group.themeId) ?? "Unknown",
        count: group._count._all,
      }))
      .filter((theme) => theme.theme !== "Unknown"),
  };
}