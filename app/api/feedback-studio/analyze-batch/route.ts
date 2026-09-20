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
  themes: z.array(z.string().trim().min(1).max(100)).max(5),
  featureArea: z.string().trim().min(1).max(100),
  signals: z.array(z.string().trim().min(1).max(200)).max(5),
  explanation: z.string().trim().min(1).max(500),
});

const requestSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.number().int().positive(),
        feedback: z
          .string()
          .trim()
          .min(3, "Feedback must be at least 3 characters long.")
          .max(5000, "Feedback must not exceed 5000 characters."),
      })
    )
    .min(1, "At least one feedback item is required.")
    .max(50, "You can analyze a maximum of 50 feedback items at once."),
});

const systemPrompt = `
You are LOOP's Feedback Studio classification engine.

Analyze each customer feedback item provided by the user.

Return ONLY valid JSON using this exact structure:

{
  "results": [
    {
      "id": 1,
      "analysis": {
        "sentiment": "POS",
        "sentimentScore": 0,
        "confidence": 0,
        "themes": [],
        "featureArea": "",
        "signals": [],
        "explanation": ""
      }
    }
  ]
}

Rules:

1. sentiment:
   - POS = positive
   - NEU = neutral or mixed without a clearly dominant positive or negative feeling
   - NEG = negative

2. sentimentScore:
   - Number from 0 to 100.
   - Represents how strongly the feedback expresses its detected sentiment.
   - 0 means almost no sentiment.
   - 100 means extremely strong sentiment.

3. confidence:
   - Number from 0 to 100.
   - Represents how confident you are in the classification.

4. themes:
   - Up to 5 concise themes.
   - Describe the actual topic, issue, need, or area mentioned in the feedback.
   - Examples: Performance, Billing, Mobile Experience, Onboarding, Support, Integrations, File Upload.

5. featureArea:
   - The main product or business area related to the feedback.

6. signals:
   - Up to 5 short phrases showing evidence from the actual feedback.
   - Do not invent information.

7. explanation:
   - Short explanation of the classification.
   - Use only information present in the corresponding feedback item.

Important:
- Analyze every item.
- Preserve every input id exactly.
- Do not omit any item.
- Do not invent customer information.
- Do not invent product features.
- Do not invent facts.
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

const groqResultSchema = z.object({
  results: z.array(
    z.object({
      id: z.number().int().positive(),
      analysis: feedbackAnalysisSchema,
    })
  ),
});

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    if (!session.user.role) {
      return NextResponse.json(
        { error: "User role is missing." },
        { status: 403 }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "Groq API key is not configured." },
        { status: 500 }
      );
    }

    const body: unknown = await request.json();

    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error:
            validation.error.issues[0]?.message ??
            "Invalid feedback items.",
        },
        { status: 400 }
      );
    }

    const { items } = validation.data;

    const feedbackPayload = items
      .map(
        (item) =>
          `ID: ${item.id}\nFeedback: ${item.feedback}`
      )
      .join("\n\n");

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
          content: feedbackPayload,
        },
      ],
      response_format: {
        type: "json_object",
      },
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "Groq returned an empty response." },
        { status: 502 }
      );
    }

    const parsedJson = extractJson(content);

    const resultValidation = groqResultSchema.safeParse(parsedJson);

    if (!resultValidation.success) {
      console.error(
        "Feedback Studio batch validation error:",
        resultValidation.error.flatten()
      );

      return NextResponse.json(
        {
          error:
            "Groq returned a response that did not match the required batch analysis format.",
        },
        { status: 502 }
      );
    }

    const expectedIds = new Set(items.map((item) => item.id));
    const returnedIds = new Set(
      resultValidation.data.results.map((item) => item.id)
    );

    if (
      returnedIds.size !== expectedIds.size ||
      returnedIds.size !== resultValidation.data.results.length
    ) {
      return NextResponse.json(
        {
          error:
            "Groq did not return exactly one analysis for every feedback item.",
        },
        { status: 502 }
      );
    }

    for (const id of expectedIds) {
      if (!returnedIds.has(id)) {
        return NextResponse.json(
          {
            error:
              "Groq returned incomplete feedback analysis results.",
          },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({
      results: resultValidation.data.results,
    });
  } catch (error) {
    console.error(
      "Feedback Studio batch analyze error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to analyze feedback items.",
      },
      { status: 500 }
    );
  }
}