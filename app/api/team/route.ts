import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const createMemberSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(100, "Name must be 100 characters or fewer."),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .max(200, "Email must be 200 characters or fewer."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(100, "Password must be 100 characters or fewer."),
  role: z.enum(["ANALYST", "VIEWER"]),
});

const updateMemberSchema = z.object({
  id: z.string().min(1, "Member ID is required."),
  role: z.enum(["ADMIN", "ANALYST", "VIEWER"]),
});

async function getAdminSession() {
  const session = await auth();

  if (!session?.user?.id || !session.user.workspaceId) {
    return null;
  }

  if (session.user.role !== "ADMIN") {
    return null;
  }

  return session;
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const members = await prisma.user.findMany({
      where: {
        workspaceId: session.user.workspaceId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: [
        {
          role: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
    });

    return NextResponse.json({
      members,
    });
  } catch (error) {
    console.error("Team GET API error:", error);

    return NextResponse.json(
      { error: "Failed to load team members." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();

    if (!session) {
      return NextResponse.json(
        {
          error: "Only workspace admins can add team members.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const parsed = createMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid team member data.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { name, email, password, role } = parsed.data;

    const normalizedEmail = email.toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: "A user with this email already exists.",
        },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const member = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        role,
        workspaceId: session.user.workspaceId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "Team member created successfully.",
        member,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Team POST API error:", error);

    return NextResponse.json(
      { error: "Failed to create team member." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getAdminSession();

    if (!session) {
      return NextResponse.json(
        {
          error: "Only workspace admins can change member roles.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const parsed = updateMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid role update data.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { id, role } = parsed.data;

    if (id === session.user.id) {
      return NextResponse.json(
        {
          error: "You cannot change your own role.",
        },
        { status: 400 }
      );
    }

    const existingMember = await prisma.user.findFirst({
      where: {
        id,
        workspaceId: session.user.workspaceId,
      },
      select: {
        id: true,
      },
    });

    if (!existingMember) {
      return NextResponse.json(
        {
          error: "Team member not found.",
        },
        { status: 404 }
      );
    }

    const updatedMember = await prisma.user.update({
      where: {
        id: existingMember.id,
      },
      data: {
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      message: "Team member role updated successfully.",
      member: updatedMember,
    });
  } catch (error) {
    console.error("Team PATCH API error:", error);

    return NextResponse.json(
      { error: "Failed to update team member role." },
      { status: 500 }
    );
  }
}