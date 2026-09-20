import { prisma } from "@/lib/db";

function getStartOfCurrentWeek(): Date {
  const now = new Date();

  const day = now.getUTCDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;

  const start = new Date(now);
  start.setUTCDate(now.getUTCDate() - daysSinceMonday);
  start.setUTCHours(0, 0, 0, 0);

  return start;
}

export async function getFeedbackStats(workspaceId: string) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required.");
  }

  const baseWhere = {
    workspaceId,
    deletedAt: null,
  };

  const [
    total,
    positive,
    neutral,
    negative,
    newCount,
    reviewed,
    actioned,
    newThisWeek,
  ] = await Promise.all([
    prisma.feedback.count({
      where: baseWhere,
    }),

    prisma.feedback.count({
      where: {
        ...baseWhere,
        sentiment: "POS",
      },
    }),

    prisma.feedback.count({
      where: {
        ...baseWhere,
        sentiment: "NEU",
      },
    }),

    prisma.feedback.count({
      where: {
        ...baseWhere,
        sentiment: "NEG",
      },
    }),

    prisma.feedback.count({
      where: {
        ...baseWhere,
        status: "NEW",
      },
    }),

    prisma.feedback.count({
      where: {
        ...baseWhere,
        status: "REVIEWED",
      },
    }),

    prisma.feedback.count({
      where: {
        ...baseWhere,
        status: "ACTIONED",
      },
    }),

    prisma.feedback.count({
      where: {
        ...baseWhere,
        createdAt: {
          gte: getStartOfCurrentWeek(),
        },
      },
    }),
  ]);

  const negativePercentage = total === 0 ? 0 : (negative / total) * 100;

  return {
    total,
    sentiment: {
      positive,
      neutral,
      negative,
    },
    status: {
      new: newCount,
      reviewed,
      actioned,
    },
    newThisWeek,
    negativePercentage,
  };
}

export async function getChannelStats(workspaceId: string) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required.");
  }

  const feedback = await prisma.feedback.groupBy({
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

  return feedback.map((item) => ({
    channel: item.channel,
    count: item._count._all,
  }));
}

export async function getThemeStats(workspaceId: string) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required.");
  }

  const themeFeedback = await prisma.feedbackTheme.findMany({
    where: {
      feedback: {
        workspaceId,
        deletedAt: null,
      },
      theme: {
        workspaceId,
      },
    },
    select: {
      themeId: true,
      theme: {
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
        },
      },
    },
  });

  const counts = new Map<
    string,
    {
      id: string;
      name: string;
      description: string | null;
      isActive: boolean;
      count: number;
    }
  >();

  for (const item of themeFeedback) {
    const existing = counts.get(item.themeId);

    if (existing) {
      existing.count += 1;
      continue;
    }

    counts.set(item.themeId, {
      id: item.theme.id,
      name: item.theme.name,
      description: item.theme.description,
      isActive: item.theme.isActive,
      count: 1,
    });
  }

  return Array.from(counts.values()).sort((a, b) => b.count - a.count);
}

export async function getWorkspaceAnalytics(workspaceId: string) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required.");
  }

  const [feedbackStats, channelStats, themeStats] = await Promise.all([
    getFeedbackStats(workspaceId),
    getChannelStats(workspaceId),
    getThemeStats(workspaceId),
  ]);

  return {
    feedback: feedbackStats,
    channels: channelStats,
    themes: themeStats,
  };
}