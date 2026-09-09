import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
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
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
    .optional()
    .or(z.literal("")),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
    .optional()
    .or(z.literal("")),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const createFeedbackSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Feedback content is required.")
    .max(5000, "Feedback content must be 5000 characters or less."),

  channel: z
    .string()
    .trim()
    .min(1, "Channel is required.")
    .max(100, "Channel must be 100 characters or less."),

  sourceRef: z
    .string()
    .trim()
    .max(500, "Source reference must be 500 characters or less.")
    .optional()
    .or(z.literal("")),

  customerLabel: z
    .string()
    .trim()
    .max(200, "Customer label must be 200 characters or less.")
    .optional()
    .or(z.literal("")),

  sentiment: z.enum(["POS", "NEU", "NEG"]).optional(),

  sentimentScore: z
    .number()
    .min(-1)
    .max(1)
    .optional(),

  status: z.enum(["NEW", "REVIEWED", "ACTIONED"]).default("NEW"),
});

function startOfUtcDay(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function endOfUtcDay(date: string): Date {
  return new Date(`${date}T23:59:59.999Z`);
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const workspaceId = session.user.workspaceId;

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
      return NextResponse.json(
        {
          error: "Invalid feedback filters.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
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

    const where: Prisma.FeedbackWhereInput = {
      workspaceId,

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

      ...(channel !== "ALL"
        ? {
            channel,
          }
        : {}),

      ...(sentiment !== "ALL"
        ? {
            sentiment,
          }
        : {}),

      ...(status !== "ALL"
        ? {
            status,
          }
        : {}),

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

    const [feedback, total, channels, themes] = await Promise.all([
      prisma.feedback.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
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
          feedbackThemes: {
            select: {
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
            take: 3,
          },
        },
      }),

      prisma.feedback.count({
        where,
      }),

      prisma.feedback.findMany({
        where: {
          workspaceId,
        },
        distinct: ["channel"],
        select: {
          channel: true,
        },
        orderBy: {
          channel: "asc",
        },
      }),

      prisma.theme.findMany({
        where: {
          workspaceId,
        },
        orderBy: {
          name: "asc",
        },
        select: {
          name: true,
        },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json({
      feedback,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      },
      filters: {
        channels: channels.map((item) => item.channel),
        themes: themes.map((item) => item.name),
      },
    });
  } catch (error) {
    console.error("Feedback API error:", error);

    return NextResponse.json(
      { error: "Failed to load feedback." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const role = session.user.role;
    const workspaceId = session.user.workspaceId;

    if (role !== "ADMIN" && role !== "ANALYST") {
      return NextResponse.json(
        {
          error: "You do not have permission to create feedback.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const parsed = createFeedbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid feedback data.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const {
      content,
      channel,
      sourceRef,
      customerLabel,
      sentiment,
      sentimentScore,
      status,
    } = parsed.data;

    const feedback = await prisma.feedback.create({
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

    return NextResponse.json(
      {
        message: "Feedback created successfully.",
        feedback,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create feedback API error:", error);

    return NextResponse.json(
      { error: "Failed to create feedback." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const role = session.user.role;
    const workspaceId = session.user.workspaceId;

    if (role !== "ADMIN" && role !== "ANALYST") {
      return NextResponse.json(
        {
          error: "You do not have permission to update feedback.",
        },
        { status: 403 }
      );
    }

    const bodySchema = z.object({
      id: z.string().min(1, "Feedback ID is required."),
      status: z.enum(["NEW", "REVIEWED", "ACTIONED"]),
    });

    const body = await request.json();

    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid feedback update data.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { id, status } = parsed.data;

    const existingFeedback = await prisma.feedback.findFirst({
      where: {
        id,
        workspaceId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existingFeedback) {
      return NextResponse.json(
        { error: "Feedback not found." },
        { status: 404 }
      );
    }

    const updatedFeedback = await prisma.feedback.update({
      where: {
        id: existingFeedback.id,
      },
      data: {
        status,
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

    return NextResponse.json({
      message: "Feedback status updated successfully.",
      feedback: updatedFeedback,
    });
  } catch (error) {
    console.error("Update feedback API error:", error);

    return NextResponse.json(
      { error: "Failed to update feedback." },
      { status: 500 }
    );
  }
}
