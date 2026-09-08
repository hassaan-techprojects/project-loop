import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const workspaceId = session.user.workspaceId;

    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const startOfChartPeriod = new Date();
    startOfChartPeriod.setHours(0, 0, 0, 0);
    startOfChartPeriod.setDate(startOfChartPeriod.getDate() - 29);

    const [
      totalFeedback,
      positive,
      neutral,
      negative,
      newThisWeek,
      activeThemes,
      recentFeedback,
      chartFeedback,
      topThemeData,
    ] = await Promise.all([
      prisma.feedback.count({
        where: {
          workspaceId,
        },
      }),

      prisma.feedback.count({
        where: {
          workspaceId,
          sentiment: "POS",
        },
      }),

      prisma.feedback.count({
        where: {
          workspaceId,
          sentiment: "NEU",
        },
      }),

      prisma.feedback.count({
        where: {
          workspaceId,
          sentiment: "NEG",
        },
      }),

      prisma.feedback.count({
        where: {
          workspaceId,
          createdAt: {
            gte: startOfWeek,
          },
        },
      }),

      prisma.theme.count({
        where: {
          workspaceId,
        },
      }),

      prisma.feedback.findMany({
        where: {
          workspaceId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
        select: {
          id: true,
          content: true,
          channel: true,
          customerLabel: true,
          sentiment: true,
          status: true,
          createdAt: true,
        },
      }),

      prisma.feedback.findMany({
        where: {
          workspaceId,
          createdAt: {
            gte: startOfChartPeriod,
          },
        },
        select: {
          createdAt: true,
          sentiment: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      }),

      prisma.feedbackTheme.findMany({
        where: {
          feedback: {
            workspaceId,
          },
        },
        select: {
          theme: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    const negativePercentage =
      totalFeedback > 0
        ? Number(((negative / totalFeedback) * 100).toFixed(1))
        : 0;

    const volumeMap = new Map<
      string,
      {
        date: string;
        total: number;
      }
    >();

    for (let i = 0; i < 30; i++) {
      const date = new Date(startOfChartPeriod);
      date.setDate(startOfChartPeriod.getDate() + i);

      const dateKey = date.toISOString().slice(0, 10);

      volumeMap.set(dateKey, {
        date: dateKey,
        total: 0,
      });
    }

    for (const feedback of chartFeedback) {
      const dateKey = feedback.createdAt.toISOString().slice(0, 10);

      const existing = volumeMap.get(dateKey);

      if (existing) {
        existing.total += 1;
      }
    }

    const volumeOverTime = Array.from(volumeMap.values());

    const sentimentBreakdown = [
      {
        sentiment: "POS",
        label: "Positive",
        count: positive,
      },
      {
        sentiment: "NEU",
        label: "Neutral",
        count: neutral,
      },
      {
        sentiment: "NEG",
        label: "Negative",
        count: negative,
      },
    ];

    const themeCounts = new Map<
      string,
      {
        id: string;
        name: string;
        count: number;
      }
    >();

    for (const item of topThemeData) {
      const existing = themeCounts.get(item.theme.id);

      if (existing) {
        existing.count += 1;
      } else {
        themeCounts.set(item.theme.id, {
          id: item.theme.id,
          name: item.theme.name,
          count: 1,
        });
      }
    }

    const topThemes = Array.from(themeCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return NextResponse.json({
      stats: {
        totalFeedback,
        positive,
        neutral,
        negative,
        negativePercentage,
        newThisWeek,
        activeThemes,
      },
      charts: {
        volumeOverTime,
        sentimentBreakdown,
        topThemes,
      },
      recentFeedback,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);

    return NextResponse.json(
      { error: "Failed to load dashboard data." },
      { status: 500 }
    );
  }
}