import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";

const googleFormPayloadSchema = z.object({
  workspaceId: z.string().trim().min(1),
  secret: z.string().trim().min(1),
  name: z
    .string()
    .trim()
    .max(200, "Name must be 200 characters or fewer.")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("A valid email address is required.")
    .max(320)
    .optional()
    .or(z.literal("")),
  feedback: z
    .string()
    .trim()
    .min(1, "Feedback is required.")
    .max(5000, "Feedback must be 5000 characters or fewer."),
  sourceRef: z
    .string()
    .trim()
    .max(500, "Source reference must be 500 characters or fewer.")
    .optional()
    .or(z.literal("")),
});

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    const parsed = googleFormPayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid Google Form payload.",
        },
        { status: 400 }
      );
    }

    const {
      workspaceId,
      secret,
      name,
      email,
      feedback,
      sourceRef,
    } = parsed.data;

    const integration =
      await prisma.googleFormIntegration.findUnique({
        where: {
          workspaceId,
        },
        select: {
          id: true,
          workspaceId: true,
          webhookSecret: true,
        },
      });

    if (!integration) {
      return NextResponse.json(
        {
          error:
            "Google Form integration is not configured for this workspace.",
        },
        { status: 404 }
      );
    }

    if (secret !== integration.webhookSecret) {
      return NextResponse.json(
        {
          error: "Invalid integration secret.",
        },
        { status: 401 }
      );
    }

    const customerLabel =
      name && email
        ? `${name} (${email})`
        : name || email || null;

    const createdFeedback = await prisma.feedback.create({
      data: {
        content: feedback,
        channel: "GOOGLE_FORM",
        sourceRef: sourceRef || null,
        customerLabel,
        sentiment: null,
        sentimentScore: null,
        status: "NEW",
        workspaceId: integration.workspaceId,
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "Google Form feedback received successfully.",
        feedbackId: createdFeedback.id,
        createdAt: createdFeedback.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Google Form feedback API error:", error);

    return NextResponse.json(
      {
        error: "Failed to save Google Form feedback.",
      },
      { status: 500 }
    );
  }
}