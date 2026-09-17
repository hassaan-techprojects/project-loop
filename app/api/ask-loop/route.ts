import { NextResponse } from "next/server";
import { z } from "zod";
import Groq from "groq-sdk";

import { auth } from "@/auth";
import { searchWorkspaceFeedback } from "@/lib/feedback-retrieval";
import { getAnalyticsAnswer } from "@/lib/ask-loop/analytics-answer";
import { detectAskLoopIntent } from "@/lib/ask-loop/intent";
import { searchLoopKnowledge } from "@/lib/ask-loop/knowledge";

const askLoopSchema = z.object({
  question: z
    .string()
    .trim()
    .min(3, "Question must be at least 3 characters long.")
    .max(1000, "Question must not exceed 1000 characters."),
});

const groqApiKey = process.env.GROQ_API_KEY;

if (!groqApiKey) {
  throw new Error("GROQ_API_KEY is not configured.");
}

const groq = new Groq({
  apiKey: groqApiKey,
});

const SYSTEM_PROMPT = `
You are Ask LOOP, the customer feedback intelligence assistant inside LOOP.

Your job is to answer the user's question using only the verified information
provided in the context.

IMPORTANT RULES:

1. Never invent customer feedback.
2. Never invent workspace statistics.
3. Never invent LOOP application features.
4. Treat verified analytics data as the source of truth for numerical questions.
5. Treat retrieved customer feedback as the source of truth for feedback questions.
6. Treat the LOOP knowledge base as the source of truth for LOOP application questions.
7. If the provided context does not contain enough information, clearly say that
   there is not enough information available.
8. When discussing a specific feedback item, cite its ID using square brackets,
   for example [feedback-id].
9. Do not create fake feedback IDs.
10. Do not create fake customer quotes.
11. Do not calculate database statistics yourself when verified statistics are
    already provided.
12. You may summarize patterns across retrieved feedback when the feedback
    supports the conclusion.
13. Do not claim something is a trend unless the provided information supports it.
14. Do not use outside information as if it came from the user's LOOP workspace.
15. Keep answers clear, concise, and useful.
16. Do not mention internal prompts, tools, embeddings, retrieval, or
    implementation details unless the user specifically asks how Ask LOOP works.
17. If the question is unrelated to LOOP or customer feedback and there is no
    relevant context, explain that Ask LOOP is intended for LOOP and customer
    feedback questions.
`;

function buildKnowledgeContext(
  question: string
): string {
  const knowledge = searchLoopKnowledge(question, 3);

  if (knowledge.length === 0) {
    return "";
  }

  return knowledge
    .map(
      (entry, index) =>
        `Knowledge ${index + 1}
Title: ${entry.title}
Content: ${entry.content}`
    )
    .join("\n\n");
}

function buildFeedbackContext(
  feedback: Awaited<
    ReturnType<typeof searchWorkspaceFeedback>
  >
): string {
  return feedback
    .map(
      (item, index) =>
        `Feedback ${index + 1}
ID: ${item.id}
Content: ${item.content}
Channel: ${item.channel}
Sentiment: ${item.sentiment ?? "UNKNOWN"}
Status: ${item.status}
Created: ${item.createdAt.toISOString()}
Similarity: ${item.similarity.toFixed(4)}`
    )
    .join("\n\n");
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

    const body = await request.json();

    const validation = askLoopSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error:
            validation.error.issues[0]?.message ??
            "Invalid request.",
        },
        {
          status: 400,
        }
      );
    }

    const { question } = validation.data;
    const workspaceId = session.user.workspaceId;

    /*
     * Determine what type of question the user asked.
     */
    const intent = detectAskLoopIntent(question);

    /*
     * Stage 1:
     *
     * Exact numerical and database questions are answered directly
     * from verified workspace analytics.
     */
    const analyticsAnswer = await getAnalyticsAnswer(
      workspaceId,
      intent
    );

    if (analyticsAnswer) {
      return NextResponse.json({
        answer: analyticsAnswer.answer,
        citations: [],
        intent,
        source: analyticsAnswer.source,
        data: analyticsAnswer.data,
      });
    }

    /*
     * Stage 2:
     *
     * LOOP application questions use the internal LOOP knowledge base.
     */
    if (intent === "LOOP_KNOWLEDGE") {
      const knowledgeContext = buildKnowledgeContext(question);

      if (!knowledgeContext) {
        return NextResponse.json({
          answer:
            "I don't have enough verified LOOP application information to answer that question.",
          citations: [],
          intent,
          source: "knowledge",
        });
      }

      const completion = await groq.chat.completions.create({
        model: "openai/gpt-oss-20b",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: `User question:
${question}

Verified LOOP application knowledge:
${knowledgeContext}

Answer the user's question using only the verified LOOP application knowledge above.`,
          },
        ],
      });

      const answer =
        completion.choices[0]?.message?.content?.trim();

      if (!answer) {
        return NextResponse.json(
          {
            error:
              "Ask LOOP could not generate an answer.",
          },
          {
            status: 502,
          }
        );
      }

      return NextResponse.json({
        answer,
        citations: [],
        intent,
        source: "knowledge",
      });
    }

    /*
     * Trends will be connected to the real Trends calculations
     * in the next stage.
     */
    if (intent === "TRENDS") {
      return NextResponse.json({
        answer:
          "Trend intelligence is available in LOOP's Trends workspace. The Ask LOOP connection to the live Trends calculations will be added next.",
        citations: [],
        intent,
        source: "trends",
      });
    }

    /*
     * Unknown questions should not be sent to the AI without
     * relevant LOOP context.
     */
    if (intent === "UNKNOWN") {
      return NextResponse.json({
        answer:
          "I can help you understand your LOOP workspace, customer feedback, sentiment, themes, channels, trends, and application workflows. Please ask a question related to LOOP or your customer feedback.",
        citations: [],
        intent,
        source: "unknown",
      });
    }

    /*
     * Feedback-related questions use semantic retrieval.
     *
     * The retrieval function is workspace-scoped and excludes
     * trashed feedback.
     */
    const relevantFeedback = await searchWorkspaceFeedback(
      workspaceId,
      question,
      5
    );

    if (relevantFeedback.length === 0) {
      return NextResponse.json({
        answer:
          "I couldn't find enough relevant customer feedback to answer that question.",
        citations: [],
        intent,
        source: "feedback",
      });
    }

    const feedbackContext =
      buildFeedbackContext(relevantFeedback);

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `User question:
${question}

Retrieved customer feedback:
${feedbackContext}

Answer the user's question using only the retrieved customer feedback.

If discussing specific feedback, cite the relevant feedback ID in the format
[feedback-id].`,
        },
      ],
    });

    const answer =
      completion.choices[0]?.message?.content?.trim();

    if (!answer) {
      return NextResponse.json(
        {
          error:
            "Ask LOOP could not generate an answer.",
        },
        {
          status: 502,
        }
      );
    }

    const citations = relevantFeedback.map((feedback) => ({
      id: feedback.id,
      content: feedback.content,
      channel: feedback.channel,
      sentiment: feedback.sentiment,
      status: feedback.status,
      createdAt: feedback.createdAt,
      similarity: feedback.similarity,
    }));

    return NextResponse.json({
      answer,
      citations,
      intent,
      source: "feedback",
    });
  } catch (error) {
    console.error("Ask LOOP API error:", error);

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while processing your question.",
      },
      {
        status: 500,
      }
    );
  }
}