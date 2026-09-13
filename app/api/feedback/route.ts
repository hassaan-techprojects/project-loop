import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const querySchema = z.object({
  search: z.string().trim().max(200).default(""),
  channel: z.string().trim().max(100).default("ALL"),
  sentiment: z.enum(["ALL", "POS", "NEU", "NEG"]).default("ALL"),
  theme: z.string().trim().max(100).default("ALL"),
  status: z.enum(["ALL", "NEW", "REVIEWED", "ACTIONED"]).default("ALL"),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const createFeedbackSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  channel: z.string().trim().min(1).max(100),
  themeName: z.string().trim().max(100).optional().or(z.literal("")),
  sourceRef: z.string().trim().max(500).optional().or(z.literal("")),
  customerLabel: z.string().trim().max(200).optional().or(z.literal("")),
  sentiment: z.enum(["POS", "NEU", "NEG"]).optional(),
  sentimentScore: z.number().min(-1).max(1).optional(),
  status: z.enum(["NEW", "REVIEWED", "ACTIONED"]).default("NEW"),
});

const updateFeedbackSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["NEW", "REVIEWED", "ACTIONED"]),
});

const deleteFeedbackSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["trash", "restore", "permanent"]),
});

function startOfUtcDay(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function endOfUtcDay(date: string) {
  return new Date(`${date}T23:59:59.999Z`);
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

const DEFAULT_CHANNELS = [
  "manual",
  "support_ticket",
  "app_store_review",
  "nps_survey",
  "sales_call",
  "sales_call_note",
  "community_post",
  "email",
  "website_feedback",
  "chat",
  "social",
  "GOOGLE_FORM",
] as const;

async function ensureDefaultChannels(workspaceId: string) {
  const existingChannels = await prisma.channel.findMany({
    where: {
      workspaceId,
    },
    select: {
      name: true,
    },
  });

  const existingNames = new Set(
    existingChannels.map((channel) => channel.name),
  );

  const missingChannels = DEFAULT_CHANNELS.filter(
    (name) => !existingNames.has(name),
  );

  if (missingChannels.length === 0) {
    return;
  }

  await prisma.channel.createMany({
    data: missingChannels.map((name) => ({
      name,
      workspaceId,
      isActive: true,
    })),
    skipDuplicates: true,
  });
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.workspaceId) {
      return json({ error: "Unauthorized." }, 401);
    }

    const workspaceId = session.user.workspaceId;

    await ensureDefaultChannels(workspaceId);

    const { searchParams } = new URL(request.url);

    const parsed = querySchema.safeParse({
      search: searchParams.get("search") ?? "",
      channel: searchParams.get("channel") ?? "ALL",
      sentiment: searchParams.get("sentiment") ?? "ALL",
      theme: searchParams.get("theme") ?? "ALL",
      status: searchParams.get("status") ?? "ALL",
      dateFrom: searchParams.get("dateFrom") ?? "",
      dateTo: searchParams.get("dateTo") ?? "",
      page: searchParams.get("page") ?? "1",
      limit: searchParams.get("limit") ?? "10",
    });

    if (!parsed.success) {
      return json({ error: "Invalid feedback filters." }, 400);
    }

    const {
      search,
      channel,
      sentiment,
      theme,
      status,
      dateFrom,
      dateTo,
      page,
      limit,
    } = parsed.data;

    const trash = searchParams.get("trash") === "true";

    const where: Prisma.FeedbackWhereInput = {
      workspaceId,
      deletedAt: trash ? { not: null } : null,
      ...(search
        ? {
            OR: [
              {
                content: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                customerLabel: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                channel: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
      ...(channel !== "ALL" ? { channel } : {}),
      ...(sentiment !== "ALL" ? { sentiment } : {}),
      ...(status !== "ALL" ? { status } : {}),
      ...(theme !== "ALL"
        ? {
            feedbackThemes: {
              some: {
                theme: {
                  workspaceId,
                  name: theme,
                },
              },
            },
          }
        : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: startOfUtcDay(dateFrom) } : {}),
              ...(dateTo ? { lte: endOfUtcDay(dateTo) } : {}),
            },
          }
        : {}),
    };

    const [
      feedback,
      total,
      activeChannels,
      activeThemes,
      historicalChannels,
      historicalThemes,
    ] = await Promise.all([
      prisma.feedback.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          content: true,
          channel: true,
          sourceRef: true,
          customerLabel: true,
          sentiment: true,
          sentimentScore: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      prisma.feedback.count({
        where,
      }),

      prisma.channel.findMany({
        where: {
          workspaceId,
          isActive: true,
        },
        orderBy: { name: "asc" },
        select: {
          name: true,
        },
      }),

      prisma.theme.findMany({
        where: {
          workspaceId,
          isActive: true,
        },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
        },
      }),

      prisma.feedback.findMany({
        where: {
          workspaceId,
          deletedAt: null,
        },
        distinct: ["channel"],
        orderBy: { channel: "asc" },
        select: {
          channel: true,
        },
      }),

      prisma.feedbackTheme.findMany({
        where: {
          feedback: {
            workspaceId,
            deletedAt: null,
          },
          theme: {
            workspaceId,
          },
        },
        distinct: ["themeId"],
        select: {
          theme: {
            select: {
              name: true,
            },
          },
        },
      }),
    ]);

    const feedbackIds = feedback.map((item) => item.id);

    const feedbackThemes = feedbackIds.length
      ? await prisma.feedbackTheme.findMany({
          where: {
            feedbackId: {
              in: feedbackIds,
            },
          },
          select: {
            feedbackId: true,
            confidence: true,
            theme: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            confidence: "desc",
          },
        })
      : [];

    const themeMap = new Map<string, FeedbackItemTheme[]>();

    for (const item of feedbackThemes) {
      const list = themeMap.get(item.feedbackId) ?? [];

      if (list.length < 3) {
        list.push({
          confidence: item.confidence,
          theme: {
            name: item.theme.name,
          },
        });

        themeMap.set(item.feedbackId, list);
      }
    }

    const filterChannels = Array.from(
      new Set([
        ...activeChannels.map((item) => item.name),
        ...historicalChannels.map((item) => item.channel),
      ]),
    ).sort((a, b) => a.localeCompare(b));

    const filterThemes = Array.from(
      new Set([
        ...activeThemes.map((item) => item.name),
        ...historicalThemes.map((item) => item.theme.name),
      ]),
    ).sort((a, b) => a.localeCompare(b));

    return json({
      feedback: feedback.map((item) => ({
        ...item,
        feedbackThemes: themeMap.get(item.id) ?? [],
      })),

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasPreviousPage: page > 1,
        hasNextPage:
          page < Math.max(1, Math.ceil(total / limit)),
      },

      filters: {
        channels: filterChannels,
        themes: filterThemes,
        activeChannels: activeChannels.map((item) => item.name),
        activeThemes: activeThemes.map((item) => item.name),
      },
    });
  } catch (error) {
    console.error("Feedback GET failed:", error);

    return json(
      {
        error: "Failed to load feedback.",
      },
      500,
    );
  }
}

type FeedbackItemTheme = {
  confidence: number;
  theme: {
    name: string;
  };
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.workspaceId) {
      return json({ error: "Unauthorized." }, 401);
    }

    if (
      session.user.role !== "ADMIN" &&
      session.user.role !== "ANALYST"
    ) {
      return json(
        {
          error: "You do not have permission to create feedback.",
        },
        403,
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return json(
        {
          error: "Invalid request body.",
        },
        400,
      );
    }

    const parsed = createFeedbackSchema.safeParse(body);

    if (!parsed.success) {
      return json(
        {
          error:
            parsed.error.issues[0]?.message ??
            "Invalid feedback data.",
        },
        400,
      );
    }

    const workspaceId = session.user.workspaceId;

    const {
      content,
      channel,
      themeName,
      sourceRef,
      customerLabel,
      sentiment,
      sentimentScore,
      status,
    } = parsed.data;

    const managedChannel = await prisma.channel.findFirst({
      where: {
        workspaceId,
        name: channel,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!managedChannel) {
      return json(
        {
          error:
            "This channel is disabled or unavailable in this workspace.",
        },
        400,
      );
    }

    let managedThemeId: string | null = null;

    if (themeName) {
      const managedTheme = await prisma.theme.findFirst({
        where: {
          name: themeName,
          workspaceId,
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      if (!managedTheme) {
        return json(
          {
            error:
              "This theme is disabled or unavailable in this workspace.",
          },
          400,
        );
      }

      managedThemeId = managedTheme.id;
    }

    const feedback = await prisma.$transaction(async (tx) => {
      const created = await tx.feedback.create({
        data: {
          content,
          channel,
          sourceRef: sourceRef || null,
          customerLabel: customerLabel || null,
          sentiment: sentiment ?? null,
          sentimentScore: sentimentScore ?? null,
          status,
          workspaceId,
        },
        select: {
          id: true,
          content: true,
          channel: true,
          sourceRef: true,
          customerLabel: true,
          sentiment: true,
          sentimentScore: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (managedThemeId) {
        await tx.feedbackTheme.create({
          data: {
            feedbackId: created.id,
            themeId: managedThemeId,
            confidence: 1,
          },
        });
      }

      return created;
    });

    return json(
      {
        message: "Feedback created successfully.",
        feedback,
      },
      201,
    );
  } catch (error) {
    console.error("Feedback POST failed:", error);

    return json(
      {
        error: "Failed to create feedback.",
      },
      500,
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.workspaceId) {
      return json({ error: "Unauthorized." }, 401);
    }

    if (
      session.user.role !== "ADMIN" &&
      session.user.role !== "ANALYST"
    ) {
      return json(
        {
          error: "You do not have permission to update feedback.",
        },
        403,
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return json(
        {
          error: "Invalid request body.",
        },
        400,
      );
    }

    const parsed = updateFeedbackSchema.safeParse(body);

    if (!parsed.success) {
      return json(
        {
          error: "Invalid feedback update data.",
        },
        400,
      );
    }

    const existing = await prisma.feedback.findFirst({
      where: {
        id: parsed.data.id,
        workspaceId: session.user.workspaceId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return json(
        {
          error: "Feedback not found.",
        },
        404,
      );
    }

    const updated = await prisma.feedback.update({
      where: {
        id: existing.id,
      },
      data: {
        status: parsed.data.status,
      },
      select: {
        id: true,
        content: true,
        channel: true,
        sourceRef: true,
        customerLabel: true,
        sentiment: true,
        sentimentScore: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return json({
      message: "Feedback status updated successfully.",
      feedback: updated,
    });
  } catch (error) {
    console.error("Feedback PATCH failed:", error);

    return json(
      {
        error: "Failed to update feedback.",
      },
      500,
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.workspaceId) {
      return json(
        {
          error: "Unauthorized.",
        },
        401,
      );
    }

    if (
      session.user.role !== "ADMIN" &&
      session.user.role !== "ANALYST"
    ) {
      return json(
        {
          error:
            "You do not have permission to manage feedback trash.",
        },
        403,
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return json(
        {
          error: "Invalid request body.",
        },
        400,
      );
    }

    const parsed = deleteFeedbackSchema.safeParse(body);

    if (!parsed.success) {
      return json(
        {
          error:
            parsed.error.issues[0]?.message ??
            "Invalid feedback trash action.",
        },
        400,
      );
    }

    const workspaceId = session.user.workspaceId;
    const { id, action } = parsed.data;

    const existing = await prisma.feedback.findFirst({
      where: {
        id,
        workspaceId,
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });

    if (!existing) {
      return json(
        {
          error: "Feedback not found.",
        },
        404,
      );
    }

    if (action === "trash") {
      if (existing.deletedAt) {
        return json({
          message: "Feedback is already in Trash.",
        });
      }

      await prisma.feedback.update({
        where: {
          id: existing.id,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      return json({
        message: "Feedback moved to Trash successfully.",
      });
    }

    if (action === "restore") {
      if (!existing.deletedAt) {
        return json({
          message: "Feedback is already active.",
        });
      }

      await prisma.feedback.update({
        where: {
          id: existing.id,
        },
        data: {
          deletedAt: null,
        },
      });

      return json({
        message: "Feedback restored successfully.",
      });
    }

    await prisma.feedback.delete({
      where: {
        id: existing.id,
      },
    });

    return json({
      message: "Feedback permanently deleted.",
    });
  } catch (error) {
    console.error("Feedback DELETE failed:", error);

    return json(
      {
        error: "Failed to update feedback trash.",
      },
      500,
    );
  }
}