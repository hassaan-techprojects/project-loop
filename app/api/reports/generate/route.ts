import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { generateReportContent } from "@/lib/reports/report-generator";
import { getReportData } from "@/lib/reports/report-data";

const generateReportSchema = z
  .object({
    periodStart: z.coerce.date(),
    periodEnd: z.coerce.date(),
  })
  .superRefine((value, context) => {
    if (Number.isNaN(value.periodStart.getTime())) {
      context.addIssue({
        code: "custom",
        path: ["periodStart"],
        message: "Invalid period start date.",
      });
    }

    if (Number.isNaN(value.periodEnd.getTime())) {
      context.addIssue({
        code: "custom",
        path: ["periodEnd"],
        message: "Invalid period end date.",
      });
    }

    if (
      !Number.isNaN(value.periodStart.getTime()) &&
      !Number.isNaN(value.periodEnd.getTime()) &&
      value.periodEnd < value.periodStart
    ) {
      context.addIssue({
        code: "custom",
        path: ["periodEnd"],
        message: "Period end must be on or after period start.",
      });
    }
  });

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const parsedBody = generateReportSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "Invalid report parameters.",
          details: parsedBody.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { periodStart, periodEnd } = parsedBody.data;

    const reportData = await getReportData(
      session.user.workspaceId,
      {
        start: periodStart,
        end: periodEnd,
      }
    );

    if (reportData.feedback.total === 0) {
      return NextResponse.json(
        {
          error:
            "There is no customer feedback in the selected period.",
        },
        { status: 400 }
      );
    }

    const content = await generateReportContent(reportData);

    const report = await prisma.report.create({
      data: {
        title: "Voice of Customer Report",
        periodStart: new Date(reportData.period.start),
        periodEnd: new Date(reportData.period.end),
        contentJson: content,
        workspaceId: session.user.workspaceId,
        generatedById: session.user.id,
      },
      select: {
        id: true,
        title: true,
        periodStart: true,
        periodEnd: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        report,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Generate report API error:", error);

    return NextResponse.json(
      {
        error: "Failed to generate report.",
      },
      { status: 500 }
    );
  }
}