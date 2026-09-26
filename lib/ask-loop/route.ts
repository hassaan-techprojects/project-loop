import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { runAskLoopAgent } from "@/lib/ask-loop/agent";

const askLoopSchema = z.object({
  question: z
    .string()
    .trim()
    .min(3, "Question must be at least 3 characters long.")
    .max(1000, "Question must not exceed 1000 characters."),

  previousMessages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(5000),
      })
    )
    .max(12)
    .optional()
    .default([]),

  attachment: z
    .object({
      name: z.string().trim().min(1).max(255),
      type: z.enum(["CSV", "PDF"]),
      text: z.string().min(1).max(60000),
    })
    .optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.workspaceId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body: unknown = await request.json();
    const validation = askLoopSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error:
            validation.error.issues[0]?.message ?? "Invalid request.",
        },
        { status: 400 }
      );
    }

    const result = await runAskLoopAgent(
      session.user.workspaceId,
      validation.data.question,
      validation.data.previousMessages,
      validation.data.attachment
    );

    return NextResponse.json({
      answer: result.answer,
      citations: result.citations,
      toolsUsed: result.toolsUsed,
    });
  } catch (error) {
    console.error("Ask LOOP API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while processing your question.",
      },
      { status: 500 }
    );
  }
}
