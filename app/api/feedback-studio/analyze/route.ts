import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { z } from "zod";

import { auth } from "@/auth";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const feedbackAnalysisSchema = z.object({
  sentiment: z.enum(["POS", "NEU", "NEG"]),
  sentimentScore: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  themes: z
    .array(z.string().trim().min(1).max(100))
    .max(5),
  featureArea: z
    .string()
    .trim()
    .min(1)
    .max(100),
  signals: z
    .array(z.string().trim().min(1).max(200))
    .max(5),
  explanation: z
    .string()
    .trim()
    .min(1)
    .max(500),
});

const requestSchema = z.object({
  feedback: z
    .string()
    .trim()
    .min(3, "Feedback must be at least 3 characters long.")
    .max(5000, "Feedback must not exceed 5000 characters."),
});

const systemPrompt = `
You are LOOP's Feedback Studio classification engine.

Analyze one piece of customer feedback and return ONLY valid JSON.

Your job is to identify:

1. sentiment:
   - POS = positive
   - NEU = neutral or mixed without a clearly dominant negative or positive feeling
   - NEG = negative

2. sentimentScore:
   - A number from 0 to 100.
   - This represents how strongly the feedback expresses its detected sentiment.
   - 0 means no meaningful sentiment.
   - 100 means extremely strong sentiment.

3. confidence:
   - A number from 0 to 100.
   - This represents how confident you are in the classification.

4. themes:
   - Up to 5 concise themes describing the customer issue, need, or topic.
   - Examples: Performance, Billing, Mobile Experience, Onboarding, Support, Integrations, File Upload.

5. featureArea:
   - The main product or business area related to the feedback.

6. signals:
   - Up to 5 short phrases describing the evidence in the feedback.
   - Do not invent information that is not present in the feedback.

7. explanation:
   - A short explanation of why the sentiment and classification were selected.
   - Only use information present in the feedback.

Important rules:
- Do not invent facts.
- Do not invent customer information.
- Do not invent product features.
- Do not rewrite the customer's feedback.
- Return JSON only.
`;

function extractJson(content: string): unknown {
  const trimmed = content.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("Groq returned an invalid JSON response.");
    }

    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.workspaceId) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    if (!session.user.role) {
      return NextResponse.json(
        {
          error: "User role is missing.",
        },
        {
          status: 403,
        }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        {
          error: "Groq API key is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const body: unknown = await request.json();

    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error:
            validation.error.issues[0]?.message ??
            "Invalid feedback.",
        },
        {
          status: 400,
        }
      );
    }

    const { feedback } = validation.data;

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: feedback,
        },
      ],
      response_format: {
        type: "json_object",
      },
    });

    const content =
      completion.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        {
          error: "Groq returned an empty response.",
        },
        {
          status: 502,
        }
      );
    }

    const parsedJson = extractJson(content);

    const analysis =
      feedbackAnalysisSchema.safeParse(parsedJson);

    if (!analysis.success) {
      console.error(
        "Feedback Studio validation error:",
        analysis.error.flatten()
      );

      return NextResponse.json(
        {
          error:
            "Groq returned a response that did not match the required feedback analysis format.",
        },
        {
          status: 502,
        }
      );
    }

    return NextResponse.json({
      analysis: analysis.data,
    });
  } catch (error) {
    console.error(
      "Feedback Studio analyze error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to analyze feedback.",
      },
      {
        status: 500,
      }
    );
  }
}