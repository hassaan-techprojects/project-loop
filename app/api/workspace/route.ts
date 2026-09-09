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

    const workspace = await prisma.workspace.findFirst({
      where: {
        id: session.user.workspaceId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      workspace,
    });
  } catch (error) {
    console.error("Workspace API error:", error);

    return NextResponse.json(
      { error: "Failed to load workspace." },
      { status: 500 }
    );
  }
}