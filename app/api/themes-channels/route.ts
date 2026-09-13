import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  type: z.enum(["theme", "channel"]),
  name: z.string().trim().min(1, "Name is required").max(100),
  description: z
    .string()
    .trim()
    .max(500, "Description must be 500 characters or less")
    .optional(),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color")
    .optional(),
});

const updateSchema = z
  .object({
    type: z.enum(["theme", "channel"]),
    id: z.string().min(1, "ID is required"),
    name: z.string().trim().min(1, "Name is required").max(100).optional(),
    description: z.string().trim().max(500).optional(),
    color: z
      .string()
      .trim()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color")
      .optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.description !== undefined ||
      data.color !== undefined ||
      data.isActive !== undefined,
    { message: "At least one field must be provided for update." },
  );

const saveSchema = z.object({
  themes: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().trim().min(1).max(100),
        description: z
          .string()
          .trim()
          .max(500)
          .optional()
          .or(z.literal("")),
        color: z
          .string()
          .trim()
          .regex(/^#[0-9A-Fa-f]{6}$/)
          .optional(),
        isActive: z.boolean(),
      }),
    )
    .max(200),
  channels: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().trim().min(1).max(100),
        isActive: z.boolean(),
      }),
    )
    .max(200),
});

function canManage(role: string | undefined): boolean {
  return role === "ADMIN" || role === "ANALYST";
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
  await prisma.$transaction(
    DEFAULT_CHANNELS.map((name) =>
      prisma.channel.upsert({
        where: {
          workspaceId_name: {
            workspaceId,
            name,
          },
        },
        update: {},
        create: {
          workspaceId,
          name,
          isActive: true,
        },
      }),
    ),
  );
}

async function getSession() {
  const session = await auth();

  if (!session?.user?.workspaceId) {
    return null;
  }

  return session;
}

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  const workspaceId = session.user.workspaceId;

  try {
    await ensureDefaultChannels(workspaceId);

    const [themes, channels] = await Promise.all([
      prisma.theme.findMany({
        where: { workspaceId },
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: {
              feedbackThemes: true,
            },
          },
        },
      }),
      prisma.channel.findMany({
        where: { workspaceId },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({
      themes: themes.map((theme) => ({
        id: theme.id,
        name: theme.name,
        description: theme.description,
        color: theme.color,
        isActive: theme.isActive,
        createdAt: theme.createdAt,
        feedbackCount: theme._count.feedbackThemes,
      })),
      channels: channels.map((channel) => ({
        id: channel.id,
        name: channel.name,
        isActive: channel.isActive,
        createdAt: channel.createdAt,
        updatedAt: channel.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Themes and channels GET failed:", error);

    return NextResponse.json(
      { error: "Failed to load themes and channels." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  if (!canManage(session.user.role)) {
    return NextResponse.json(
      {
        error:
          "You do not have permission to manage themes or channels.",
      },
      { status: 403 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? "Invalid input.",
      },
      { status: 400 },
    );
  }

  const { type, name, description, color } = parsed.data;
  const workspaceId = session.user.workspaceId;

  try {
    if (type === "theme") {
      const theme = await prisma.theme.create({
        data: {
          name,
          description: description || null,
          color: color || null,
          isActive: true,
          workspaceId,
        },
      });

      return NextResponse.json(
        {
          theme: {
            id: theme.id,
            name: theme.name,
            description: theme.description,
            color: theme.color,
            isActive: theme.isActive,
            feedbackCount: 0,
          },
        },
        { status: 201 },
      );
    }

    const channel = await prisma.channel.create({
      data: {
        name,
        isActive: true,
        workspaceId,
      },
    });

    return NextResponse.json(
      {
        channel: {
          id: channel.id,
          name: channel.name,
          isActive: channel.isActive,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error:
            "A theme or channel with this name already exists in this workspace.",
        },
        { status: 409 },
      );
    }

    console.error("Theme or channel creation failed:", error);

    return NextResponse.json(
      { error: "Failed to create theme or channel." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  if (!canManage(session.user.role)) {
    return NextResponse.json(
      {
        error:
          "You do not have permission to manage themes or channels.",
      },
      { status: 403 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const parsed = saveSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ??
          "Invalid settings data.",
      },
      { status: 400 },
    );
  }

  const workspaceId = session.user.workspaceId;
  const { themes, channels } = parsed.data;

  try {
    const themeIds = themes.map((theme) => theme.id);
    const channelIds = channels.map((channel) => channel.id);

    const [themeCount, channelCount] = await Promise.all([
      themeIds.length > 0
        ? prisma.theme.count({
            where: {
              workspaceId,
              id: {
                in: themeIds,
              },
            },
          })
        : Promise.resolve(0),

      channelIds.length > 0
        ? prisma.channel.count({
            where: {
              workspaceId,
              id: {
                in: channelIds,
              },
            },
          })
        : Promise.resolve(0),
    ]);

    if (
      themeCount !== themes.length ||
      channelCount !== channels.length
    ) {
      return NextResponse.json(
        {
          error:
            "One or more settings items do not belong to this workspace.",
        },
        { status: 400 },
      );
    }

    /*
     * Use Prisma's array transaction instead of an interactive
     * transaction with sequential awaits.
     *
     * This keeps the updates transactional while avoiding a long-lived
     * interactive transaction that can close on Vercel/Neon.
     */
    const operations = [
      ...themes.map((theme) =>
        prisma.theme.update({
          where: {
            id: theme.id,
          },
          data: {
            name: theme.name,
            description: theme.description || null,
            color: theme.color || null,
            isActive: theme.isActive,
          },
        }),
      ),

      ...channels.map((channel) =>
        prisma.channel.update({
          where: {
            id: channel.id,
          },
          data: {
            name: channel.name,
            isActive: channel.isActive,
          },
        }),
      ),
    ];

    if (operations.length > 0) {
      await prisma.$transaction(operations);
    }

    return NextResponse.json({
      message: "Workspace settings saved successfully.",
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error:
            "A theme or channel with one of these names already exists in this workspace.",
        },
        { status: 409 },
      );
    }

    console.error(
      "Themes and channels bulk save failed:",
      error,
    );

    return NextResponse.json(
      { error: "Failed to save themes and channels." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  if (!canManage(session.user.role)) {
    return NextResponse.json(
      {
        error:
          "You do not have permission to manage themes or channels.",
      },
      { status: 403 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ??
          "Invalid input.",
      },
      { status: 400 },
    );
  }

  const {
    type,
    id,
    name,
    description,
    color,
    isActive,
  } = parsed.data;

  const workspaceId = session.user.workspaceId;

  try {
    if (type === "theme") {
      const existingTheme = await prisma.theme.findFirst({
        where: {
          id,
          workspaceId,
        },
        select: {
          id: true,
        },
      });

      if (!existingTheme) {
        return NextResponse.json(
          { error: "Theme not found." },
          { status: 404 },
        );
      }

      const theme = await prisma.theme.update({
        where: {
          id: existingTheme.id,
        },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(description !== undefined
            ? { description: description || null }
            : {}),
          ...(color !== undefined
            ? { color: color || null }
            : {}),
          ...(isActive !== undefined ? { isActive } : {}),
        },
      });

      return NextResponse.json({
        theme: {
          id: theme.id,
          name: theme.name,
          description: theme.description,
          color: theme.color,
          isActive: theme.isActive,
        },
      });
    }

    const existingChannel = await prisma.channel.findFirst({
      where: {
        id,
        workspaceId,
      },
      select: {
        id: true,
      },
    });

    if (!existingChannel) {
      return NextResponse.json(
        { error: "Channel not found." },
        { status: 404 },
      );
    }

    const channel = await prisma.channel.update({
      where: {
        id: existingChannel.id,
      },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    return NextResponse.json({
      channel: {
        id: channel.id,
        name: channel.name,
        isActive: channel.isActive,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error:
            "A theme or channel with this name already exists in this workspace.",
        },
        { status: 409 },
      );
    }

    console.error(
      "Theme or channel update failed:",
      error,
    );

    return NextResponse.json(
      { error: "Failed to update theme or channel." },
      { status: 500 },
    );
  }
}