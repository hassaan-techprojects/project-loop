import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const querySchema = z.object({
  days: z.enum(["7", "30", "90"]).default("30"),
  themeId: z.string().min(1).optional(),
});

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

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const workspaceId = session.user.workspaceId;

    const { searchParams } = new URL(request.url);

    const parsedQuery = querySchema.safeParse({
      days: searchParams.get("days") ?? undefined,
      themeId: searchParams.get("themeId") ?? undefined,
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        { error: "Invalid trends parameters." },
        { status: 400 }
      );
    }

    const days = Number(parsedQuery.data.days);
    const selectedThemeId = parsedQuery.data.themeId;

    const now = new Date();

    const currentPeriodStart = getStartOfDay(
      new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000)
    );

    const previousPeriodStart = new Date(
      currentPeriodStart.getTime() - days * 24 * 60 * 60 * 1000
    );

    const feedback = await prisma.feedback.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        createdAt: {
          gte: previousPeriodStart,
          lte: now,
        },
        ...(selectedThemeId
          ? {
              feedbackThemes: {
                some: {
                  themeId: selectedThemeId,
                },
              },
            }
          : {}),
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

    for (let index = 0; index < days; index += 1) {
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

    const selectedThemeFeedback = selectedThemeId
      ? feedback
          .filter((item) =>
            item.feedbackThemes.some(
              (feedbackTheme) =>
                feedbackTheme.themeId === selectedThemeId
            )
          )
          .filter(
            (item) => item.createdAt >= currentPeriodStart
          )
          .map((item) => ({
            id: item.id,
            content: item.content,
            channel: item.channel,
            customerLabel: item.customerLabel,
            sentiment: item.sentiment,
            status: item.status,
            createdAt: item.createdAt.toISOString(),
          }))
      : [];

    return NextResponse.json({
      period: {
        days,
        currentStart: currentPeriodStart.toISOString(),
        previousStart: previousPeriodStart.toISOString(),
        end: now.toISOString(),
      },
      volumeOverTime,
      themeTrends,
      emergingThemes,
      newThemes,
      selectedThemeFeedback,
    });
  } catch (error) {
    console.error("Trends API error:", error);

    return NextResponse.json(
      { error: "Failed to load trends data." },
      { status: 500 }
    );
  }
}