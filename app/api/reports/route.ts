import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const reports = await prisma.report.findMany({
      where: {
        workspaceId: session.user.workspaceId,
      },
      select: {
        id: true,
        title: true,
        periodStart: true,
        periodEnd: true,
        createdAt: true,
        generatedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      reports,
    });
  } catch (error) {
    console.error("Reports API error:", error);

    return NextResponse.json(
      {
        error: "Failed to load reports.",
      },
      { status: 500 }
    );
  }
}