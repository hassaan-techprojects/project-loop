import {
  getChannelStats,
  getFeedbackStats,
  getThemeStats,
} from "@/lib/ask-loop/analytics";
import type { AskLoopIntent } from "@/lib/ask-loop/intent";

export type AnalyticsAnswer = {
  answer: string;
  source: "analytics";
  data: unknown;
};

export async function getAnalyticsAnswer(
  workspaceId: string,
  intent: AskLoopIntent
): Promise<AnalyticsAnswer | null> {
  if (!workspaceId) {
    throw new Error("Workspace ID is required.");
  }

  switch (intent) {
    case "FEEDBACK_TOTAL": {
      const stats = await getFeedbackStats(workspaceId);

      return {
        answer: `Your workspace currently has ${stats.total} active customer feedback items.`,
        source: "analytics",
        data: {
          total: stats.total,
        },
      };
    }

    case "SENTIMENT_COUNTS": {
      const stats = await getFeedbackStats(workspaceId);

      return {
        answer:
          `Your feedback sentiment breakdown is: ` +
          `${stats.sentiment.positive} positive, ` +
          `${stats.sentiment.neutral} neutral, and ` +
          `${stats.sentiment.negative} negative.`,
        source: "analytics",
        data: {
          positive: stats.sentiment.positive,
          neutral: stats.sentiment.neutral,
          negative: stats.sentiment.negative,
        },
      };
    }

    case "NEGATIVE_PERCENTAGE": {
      const stats = await getFeedbackStats(workspaceId);

      return {
        answer: `${stats.negativePercentage.toFixed(
          2
        )}% of your active feedback is negative.`,
        source: "analytics",
        data: {
          negative: stats.sentiment.negative,
          total: stats.total,
          negativePercentage: stats.negativePercentage,
        },
      };
    }

    case "STATUS_COUNTS": {
      const stats = await getFeedbackStats(workspaceId);

      return {
        answer:
          `Your feedback status breakdown is: ` +
          `${stats.status.new} new, ` +
          `${stats.status.reviewed} reviewed, and ` +
          `${stats.status.actioned} actioned.`,
        source: "analytics",
        data: {
          new: stats.status.new,
          reviewed: stats.status.reviewed,
          actioned: stats.status.actioned,
        },
      };
    }

    case "NEW_FEEDBACK_THIS_WEEK": {
      const stats = await getFeedbackStats(workspaceId);

      return {
        answer: `You received ${stats.newThisWeek} new feedback items this week.`,
        source: "analytics",
        data: {
          newThisWeek: stats.newThisWeek,
        },
      };
    }

    case "CHANNEL_COUNTS": {
      const channels = await getChannelStats(workspaceId);

      if (channels.length === 0) {
        return {
          answer: "There is no active feedback available by channel.",
          source: "analytics",
          data: {
            channels: [],
          },
        };
      }

      const channelSummary = channels
        .map((channel) => `${channel.channel}: ${channel.count}`)
        .join(", ");

      return {
        answer: `Your feedback by channel is: ${channelSummary}.`,
        source: "analytics",
        data: {
          channels,
        },
      };
    }

    case "THEME_COUNTS": {
      const themes = await getThemeStats(workspaceId);

      if (themes.length === 0) {
        return {
          answer: "There is no feedback currently assigned to themes.",
          source: "analytics",
          data: {
            themes: [],
          },
        };
      }

      const themeSummary = themes
        .map((theme) => `${theme.name}: ${theme.count}`)
        .join(", ");

      return {
        answer: `Your feedback by theme is: ${themeSummary}.`,
        source: "analytics",
        data: {
          themes,
        },
      };
    }

    default:
      return null;
  }
}