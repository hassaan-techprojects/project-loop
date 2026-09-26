import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { getWorkspaceTrends } from "@/lib/trends";

const querySchema = z.object({
  days: z.enum(["7", "30", "90"]).default("30"),
  themeId: z.string().min(1).optional(),
});

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

    const days = Number(parsedQuery.data.days) as 7 | 30 | 90;
    const selectedThemeId = parsedQuery.data.themeId;

    const trends = await getWorkspaceTrends(
      workspaceId,
      days,
      selectedThemeId
    );

    return NextResponse.json(trends);
  } catch (error) {
    console.error("Trends API error:", error);

    return NextResponse.json(
      { error: "Failed to load trends data." },
      { status: 500 }
    );
  }
}