import { prisma } from "@/lib/db";

export type ReportPeriod = {
  start: Date;
  end: Date;
};

export type ReportSentimentStats = {
  positive: number;
  neutral: number;
  negative: number;
  unknown: number;
  total: number;
  positivePercentage: number;
  neutralPercentage: number;
  negativePercentage: number;
};

export type ReportThemeStats = {
  id: string;
  name: string;
  description: string | null;
  count: number;
  percentage: number;
};

export type ReportSentimentShift = {
  sentiment: "POS" | "NEU" | "NEG";
  previousCount: number;
  currentCount: number;
  previousPercentage: number;
  currentPercentage: number;
  changePercentagePoints: number;
};

export type ReportRepresentativeFeedback = {
  id: string;
  content: string;
  channel: string;
  customerLabel: string | null;
  sentiment: "POS" | "NEU" | "NEG" | null;
  status: "NEW" | "REVIEWED" | "ACTIONED";
  createdAt: string;
  themes: string[];
};

export type ReportChannelStats = {
  channel: string;
  count: number;
  percentage: number;
};

export type ReportData = {
  period: {
    start: string;
    end: string;
  };
  comparisonPeriod: {
    start: string;
    end: string;
  };
  feedback: {
    total: number;
    withSentiment: number;
    withoutSentiment: number;
  };
  sentiment: ReportSentimentStats;
  sentimentShifts: ReportSentimentShift[];
  topThemes: ReportThemeStats[];
  channels: ReportChannelStats[];
  representativeFeedback: ReportRepresentativeFeedback[];
};

type SentimentValue = "POS" | "NEU" | "NEG";

function getPercentage(count: number, total: number) {
  if (total === 0) {
    return 0;
  }

  return Math.round((count / total) * 100);
}

function getPercentagePoints(
  currentCount: number,
  currentTotal: number,
  previousCount: number,
  previousTotal: number
) {
  const currentPercentage =
    currentTotal === 0 ? 0 : (currentCount / currentTotal) * 100;

  const previousPercentage =
    previousTotal === 0 ? 0 : (previousCount / previousTotal) * 100;

  return Math.round((currentPercentage - previousPercentage) * 10) / 10;
}

function getStartOfDay(date: Date) {
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

function getEndExclusive(date: Date) {
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  result.setUTCDate(result.getUTCDate() + 1);
  return result;
}

function getPreviousPeriodStart(
  periodStart: Date,
  periodEndExclusive: Date
) {
  const duration = periodEndExclusive.getTime() - periodStart.getTime();

  return new Date(periodStart.getTime() - duration);
}

function calculateSentimentStats(
  feedback: Array<{
    sentiment: "POS" | "NEU" | "NEG" | null;
  }>
): ReportSentimentStats {
  let positive = 0;
  let neutral = 0;
  let negative = 0;
  let unknown = 0;

  for (const item of feedback) {
    if (item.sentiment === "POS") {
      positive += 1;
    } else if (item.sentiment === "NEU") {
      neutral += 1;
    } else if (item.sentiment === "NEG") {
      negative += 1;
    } else {
      unknown += 1;
    }
  }

  const total = feedback.length;
  const withSentiment = positive + neutral + negative;

  return {
    positive,
    neutral,
    negative,
    unknown,
    total,
    positivePercentage: getPercentage(positive, withSentiment),
    neutralPercentage: getPercentage(neutral, withSentiment),
    negativePercentage: getPercentage(negative, withSentiment),
  };
}

function calculateSentimentShifts(
  currentFeedback: Array<{
    sentiment: "POS" | "NEU" | "NEG" | null;
  }>,
  previousFeedback: Array<{
    sentiment: "POS" | "NEU" | "NEG" | null;
  }>
): ReportSentimentShift[] {
  const sentiments: SentimentValue[] = ["POS", "NEU", "NEG"];

  const currentTotal = currentFeedback.filter(
    (item) => item.sentiment !== null
  ).length;

  const previousTotal = previousFeedback.filter(
    (item) => item.sentiment !== null
  ).length;

  return sentiments.map((sentiment) => {
    const currentCount = currentFeedback.filter(
      (item) => item.sentiment === sentiment
    ).length;

    const previousCount = previousFeedback.filter(
      (item) => item.sentiment === sentiment
    ).length;

    const currentPercentage =
      currentTotal === 0
        ? 0
        : Math.round((currentCount / currentTotal) * 1000) / 10;

    const previousPercentage =
      previousTotal === 0
        ? 0
        : Math.round((previousCount / previousTotal) * 1000) / 10;

    return {
      sentiment,
      previousCount,
      currentCount,
      previousPercentage,
      currentPercentage,
      changePercentagePoints: getPercentagePoints(
        currentCount,
        currentTotal,
        previousCount,
        previousTotal
      ),
    };
  });
}

function calculateThemeStats(
  feedback: Array<{
    feedbackThemes: Array<{
      theme: {
        id: string;
        name: string;
        description: string | null;
      };
    }>;
  }>,
  totalFeedback: number
): ReportThemeStats[] {
  const themeCounts = new Map<
    string,
    {
      id: string;
      name: string;
      description: string | null;
      count: number;
    }
  >();

  for (const item of feedback) {
    const countedThemeIds = new Set<string>();

    for (const feedbackTheme of item.feedbackThemes) {
      const theme = feedbackTheme.theme;

      if (countedThemeIds.has(theme.id)) {
        continue;
      }

      countedThemeIds.add(theme.id);

      const existing = themeCounts.get(theme.id);

      if (existing) {
        existing.count += 1;
      } else {
        themeCounts.set(theme.id, {
          id: theme.id,
          name: theme.name,
          description: theme.description,
          count: 1,
        });
      }
    }
  }

  return Array.from(themeCounts.values())
    .map((theme) => ({
      ...theme,
      percentage: getPercentage(theme.count, totalFeedback),
    }))
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }

      return a.name.localeCompare(b.name);
    })
    .slice(0, 10);
}

function calculateChannelStats(
  feedback: Array<{
    channel: string;
  }>
): ReportChannelStats[] {
  const channelCounts = new Map<string, number>();

  for (const item of feedback) {
    channelCounts.set(
      item.channel,
      (channelCounts.get(item.channel) ?? 0) + 1
    );
  }

  const total = feedback.length;

  return Array.from(channelCounts.entries())
    .map(([channel, count]) => ({
      channel,
      count,
      percentage: getPercentage(count, total),
    }))
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }

      return a.channel.localeCompare(b.channel);
    });
}

function normalizeFeedbackContent(content: string) {
  return content.trim().replace(/\s+/g, " ").toLowerCase();
}

function selectRepresentativeFeedback(
  feedback: Array<{
    id: string;
    content: string;
    channel: string;
    customerLabel: string | null;
    sentiment: "POS" | "NEU" | "NEG" | null;
    status: "NEW" | "REVIEWED" | "ACTIONED";
    createdAt: Date;
    feedbackThemes: Array<{
      theme: {
        name: string;
      };
    }>;
  }>
): ReportRepresentativeFeedback[] {
  const sentimentPriority: Record<
    "POS" | "NEU" | "NEG",
    number
  > = {
    NEG: 0,
    POS: 1,
    NEU: 2,
  };

  const sortedFeedback = [...feedback].sort((a, b) => {
    const aPriority =
      a.sentiment === null
        ? 3
        : sentimentPriority[a.sentiment];

    const bPriority =
      b.sentiment === null
        ? 3
        : sentimentPriority[b.sentiment];

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const selectedFeedback = [];
  const seenContent = new Set<string>();

  for (const item of sortedFeedback) {
    const normalizedContent = normalizeFeedbackContent(
      item.content
    );

    if (!normalizedContent || seenContent.has(normalizedContent)) {
      continue;
    }

    seenContent.add(normalizedContent);
    selectedFeedback.push(item);

    if (selectedFeedback.length === 12) {
      break;
    }
  }

  return selectedFeedback.map((item) => ({
    id: item.id,
    content: item.content,
    channel: item.channel,
    customerLabel: item.customerLabel,
    sentiment: item.sentiment,
    status: item.status,
    createdAt: item.createdAt.toISOString(),
    themes: Array.from(
      new Set(item.feedbackThemes.map((item) => item.theme.name))
    ),
  }));
}

export async function getReportData(
  workspaceId: string,
  period: ReportPeriod
): Promise<ReportData> {
  if (!workspaceId) {
    throw new Error("Workspace ID is required.");
  }

  if (
    Number.isNaN(period.start.getTime()) ||
    Number.isNaN(period.end.getTime())
  ) {
    throw new Error("Invalid report period.");
  }

  const periodStart = getStartOfDay(period.start);
  const periodEndExclusive = getEndExclusive(period.end);

  if (periodEndExclusive <= periodStart) {
    throw new Error("Report period end must be after the start date.");
  }

  const previousPeriodStart = getPreviousPeriodStart(
    periodStart,
    periodEndExclusive
  );

  const [currentFeedback, previousFeedback] =
    await Promise.all([
      prisma.feedback.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          createdAt: {
            gte: periodStart,
            lt: periodEndExclusive,
          },
        },
        select: {
          id: true,
          content: true,
          channel: true,
          customerLabel: true,
          sentiment: true,
          status: true,
          createdAt: true,
          feedbackThemes: {
            select: {
              theme: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.feedback.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          createdAt: {
            gte: previousPeriodStart,
            lt: periodStart,
          },
        },
        select: {
          sentiment: true,
        },
      }),
    ]);

  const sentiment = calculateSentimentStats(currentFeedback);

  const sentimentShifts = calculateSentimentShifts(
    currentFeedback,
    previousFeedback
  );

  const topThemes = calculateThemeStats(
    currentFeedback,
    currentFeedback.length
  );

  const channels = calculateChannelStats(currentFeedback);

  const representativeFeedback =
    selectRepresentativeFeedback(currentFeedback);

  const withSentiment = currentFeedback.filter(
    (item) => item.sentiment !== null
  ).length;

  return {
    period: {
      start: periodStart.toISOString(),
      end: period.end.toISOString(),
    },
    comparisonPeriod: {
      start: previousPeriodStart.toISOString(),
      end: periodStart.toISOString(),
    },
    feedback: {
      total: currentFeedback.length,
      withSentiment,
      withoutSentiment: currentFeedback.length - withSentiment,
    },
    sentiment,
    sentimentShifts,
    topThemes,
    channels,
    representativeFeedback,
  };
}