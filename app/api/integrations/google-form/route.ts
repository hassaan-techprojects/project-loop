import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.workspaceId) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        {
          error: "Only workspace admins can configure Google Form integration.",
        },
        { status: 403 }
      );
    }

    const workspaceId = session.user.workspaceId;

    const existingIntegration =
      await prisma.googleFormIntegration.findUnique({
        where: {
          workspaceId,
        },
        select: {
          id: true,
        },
      });

    if (existingIntegration) {
      return NextResponse.json(
        {
          error:
            "Google Form integration is already configured for this workspace.",
        },
        { status: 409 }
      );
    }

    const webhookSecret = randomBytes(32).toString("hex");

    const integration = await prisma.googleFormIntegration.create({
      data: {
        workspaceId,
        webhookSecret,
      },
      select: {
        id: true,
        workspaceId: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "Google Form integration created successfully.",
        integration: {
          id: integration.id,
          workspaceId: integration.workspaceId,
          webhookSecret,
          createdAt: integration.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Google Form integration creation error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to create Google Form integration.",
      },
      { status: 500 }
    );
  }
}