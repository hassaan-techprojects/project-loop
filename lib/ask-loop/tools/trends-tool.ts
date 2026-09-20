import { prisma } from "@/lib/db";

type TrendsToolResult = {
  days: 7 | 30 | 90;
  currentPeriod: {
    start: string;
    end: string;
  };
  previousPeriod: {
    start: string;
    end: string;
  };
  totalFeedback: number;
  volumeOverTime: Array<{
    date: string;
    total: number;
  }>;
  themeTrends: Array<{
    id: string;
    name: string;
    currentCount: number;
    previousCount: number;
    growthPercentage: number;
    isNew: boolean;
    isSpiking: boolean;
  }>;
  emergingThemes: Array<{
    id: string;
    name: string;
    currentCount: number;
    previousCount: number;
    growthPercentage: number;
    isNew: boolean;
    isSpiking: boolean;
  }>;
  newThemes: Array<{
    id: string;
    name: string;
    currentCount: number;
    previousCount: number;
    growthPercentage: number;
    isNew: boolean;
    isSpiking: boolean;
  }>;
};

function validateWorkspaceId(workspaceId: string) {
  if (!workspaceId) {
    throw new Error("Workspace ID is required.");
  }
}

function getStartOfDay(date: Date) {
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getGrowthPercentage(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return Math.round(((current - previous) / previous) * 100);
}

function normalizeDays(days: number): 7 | 30 | 90 {
  if (days === 7) return 7;
  if (days === 90) return 90;

  return 30;
}

export async function getWorkspaceTrends(
  workspaceId: string,
  days = 30
): Promise<TrendsToolResult> {
  validateWorkspaceId(workspaceId);

  const safeDays = normalizeDays(days);
  const now = new Date();

  const currentPeriodStart = getStartOfDay(
    new Date(
      now.getTime() -
        (safeDays - 1) * 24 * 60 * 60 * 1000
    )
  );

  const previousPeriodStart = new Date(
    currentPeriodStart.getTime() -
      safeDays * 24 * 60 * 60 * 1000
  );

  const feedback = await prisma.feedback.findMany({
    where: {
      workspaceId,
      deletedAt: null,
      createdAt: {
        gte: previousPeriodStart,
        lte: now,
      },
    },
    select: {
      id: true,
      createdAt: true,
      feedbackThemes: {
        select: {
          themeId: true,
          theme: {
            select: {
              id: true,
              name: true,
              isActive: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const volumeByDate = new Map<string, number>();

  for (let index = 0; index < safeDays; index += 1) {
    const date = new Date(
      currentPeriodStart.getTime() +
        index * 24 * 60 * 60 * 1000
    );

    volumeByDate.set(formatDate(date), 0);
  }

  for (const item of feedback) {
    if (item.createdAt < currentPeriodStart) {
      continue;
    }

    const dateKey = formatDate(item.createdAt);

    volumeByDate.set(
      dateKey,
      (volumeByDate.get(dateKey) ?? 0) + 1
    );
  }

  const volumeOverTime = Array.from(
    volumeByDate.entries()
  ).map(([date, total]) => ({
    date,
    total,
  }));

  const previousPeriodFeedbackCount = feedback.filter(
    (item) => item.createdAt < currentPeriodStart
  ).length;

  const currentPeriodFeedbackCount = feedback.filter(
    (item) => item.createdAt >= currentPeriodStart
  ).length;

  const themeStats = new Map<
    string,
    {
      id: string;
      name: string;
      currentCount: number;
      previousCount: number;
    }
  >();

  for (const item of feedback) {
    for (const feedbackTheme of item.feedbackThemes) {
      const theme = feedbackTheme.theme;

      if (!theme.isActive) {
        continue;
      }

      const existing = themeStats.get(theme.id) ?? {
        id: theme.id,
        name: theme.name,
        currentCount: 0,
        previousCount: 0,
      };

      if (item.createdAt >= currentPeriodStart) {
        existing.currentCount += 1;
      } else {
        existing.previousCount += 1;
      }

      themeStats.set(theme.id, existing);
    }
  }

  const themeTrends = Array.from(themeStats.values())
    .map((theme) => {
      const growthPercentage = getGrowthPercentage(
        theme.currentCount,
        theme.previousCount
      );

      const isNew =
        theme.previousCount === 0 &&
        theme.currentCount > 0;

      const isSpiking =
        previousPeriodFeedbackCount > 0 &&
        theme.currentCount >= 3 &&
        growthPercentage >= 50;

      return {
        ...theme,
        growthPercentage,
        isNew,
        isSpiking,
      };
    })
    .sort((a, b) => {
      if (b.currentCount !== a.currentCount) {
        return b.currentCount - a.currentCount;
      }

      return b.growthPercentage - a.growthPercentage;
    });

  const emergingThemes = themeTrends
    .filter((theme) => theme.isSpiking)
    .sort((a, b) => {
      if (b.growthPercentage !== a.growthPercentage) {
        return b.growthPercentage - a.growthPercentage;
      }

      return b.currentCount - a.currentCount;
    })
    .slice(0, 10);

  const newThemes = themeTrends
    .filter((theme) => theme.isNew)
    .sort((a, b) => b.currentCount - a.currentCount)
    .slice(0, 10);

  return {
    days: safeDays,
    currentPeriod: {
      start: currentPeriodStart.toISOString(),
      end: now.toISOString(),
    },
    previousPeriod: {
      start: previousPeriodStart.toISOString(),
      end: currentPeriodStart.toISOString(),
    },
    totalFeedback: currentPeriodFeedbackCount,
    volumeOverTime,
    themeTrends,
    emergingThemes,
    newThemes,
  };
}