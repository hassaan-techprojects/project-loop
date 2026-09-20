import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const session = await auth();

    if (!session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Report ID is required." },
        { status: 400 }
      );
    }

    const report = await prisma.report.findFirst({
      where: {
        id,
        workspaceId: session.user.workspaceId,
      },
      select: {
        id: true,
        title: true,
        periodStart: true,
        periodEnd: true,
        contentJson: true,
        createdAt: true,
        generatedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json(
        { error: "Report not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      report,
    });
  } catch (error) {
    console.error("Report detail API error:", error);

    return NextResponse.json(
      {
        error: "Failed to load report.",
      },
      { status: 500 }
    );
  }
}