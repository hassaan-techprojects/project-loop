import Groq from "groq-sdk";

import {
  reportContentSchema,
  type ReportContent,
} from "@/lib/reports/report-schema";
import type { ReportData } from "@/lib/reports/report-data";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MODEL = "openai/gpt-oss-20b";

function extractJson(text: string) {
  const trimmed = text.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const fencedMatch = trimmed.match(
    /```(?:json)?\s*([\s\S]*?)\s*```/i
  );

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  throw new Error("Groq did not return a valid JSON object.");
}

function buildGroundedData(data: ReportData) {
  return {
    period: data.period,
    comparisonPeriod: data.comparisonPeriod,

    feedback: {
      total: data.feedback.total,
      withSentiment: data.feedback.withSentiment,
      withoutSentiment: data.feedback.withoutSentiment,
    },

    sentiment: data.sentiment,

    sentimentShifts: data.sentimentShifts,

    topThemes: data.topThemes,

    channels: data.channels,

    representativeFeedback:
      data.representativeFeedback.map((item) => ({
        feedbackId: item.id,
        quote: item.content,
        channel: item.channel,
        customerLabel: item.customerLabel,
        sentiment: item.sentiment,
        status: item.status,
        createdAt: item.createdAt,
        themes: item.themes,
      })),
  };
}

function buildSystemPrompt() {
  return `
You are the report-generation engine for LOOP, a customer feedback
intelligence application.

Your task is to generate a structured Voice of Customer report from
workspace feedback data supplied by the application.

STRICT GROUNDING RULES:

1. Use ONLY the data supplied in the user message.
2. Never invent feedback, customers, themes, counts, percentages,
   sentiment changes, dates, or evidence.
3. Numerical values must be derived from the supplied deterministic data.
4. Do not change the supplied sentiment counts or percentages.
5. Do not invent customer quotes.
6. Every representative feedback item MUST use an actual feedbackId
   supplied in representativeFeedback.
7. The "quote" field MUST contain the exact feedback content associated
   with that feedbackId. Do not rewrite, summarize, shorten, or alter
   the quote.
8. If there is not enough evidence for a claim, do not make the claim.
9. Recommended actions must be grounded in the supplied themes,
   sentiment, and representative feedback.
10. Do not mention information that is not supported by the supplied data.
11. Do not include markdown.
12. Return ONLY a valid JSON object.
13. Do not wrap the JSON in markdown fences.
14. Do not add explanations before or after the JSON.

REPORT INTERPRETATION:

- The report period is the current reporting period.
- The comparison period is the immediately preceding period of the same
  duration.
- "Sentiment shifts" must reflect the supplied percentage-point changes.
- Major concerns should focus on evidence-backed negative signals,
  themes, and feedback.
- Positive signals should focus on evidence-backed positive signals,
  themes, and feedback.
- Top themes should use the supplied theme evidence counts and
  percentages.
- Recommended actions should be practical and directly connected to
  observed customer feedback.
`.trim();
}

function buildUserPrompt(data: ReportData) {
  const groundedData = buildGroundedData(data);

  return `
Generate a Voice of Customer report using the following grounded
workspace data.

Return ONLY a single valid JSON object matching this exact structure:

{
  "reportType": "VOICE_OF_CUSTOMER",
  "executiveSummary": {
    "overview": "string",
    "overallSentiment": "string",
    "majorConcerns": ["string"],
    "positiveSignals": ["string"]
  },
  "topThemes": [
    {
      "name": "string",
      "summary": "string",
      "evidenceCount": 0,
      "percentage": 0
    }
  ],
  "sentiment": {
    "summary": "string",
    "positive": {
      "count": 0,
      "percentage": 0
    },
    "neutral": {
      "count": 0,
      "percentage": 0
    },
    "negative": {
      "count": 0,
      "percentage": 0
    }
  },
  "sentimentShifts": [
    {
      "sentiment": "POS",
      "changePercentagePoints": 0,
      "interpretation": "string"
    }
  ],
  "representativeFeedback": [
    {
      "feedbackId": "actual-feedback-id",
      "quote": "exact-original-feedback-content",
      "whyItMatters": "string"
    }
  ],
  "recommendedActions": [
    {
      "action": "string",
      "rationale": "string",
      "relatedThemes": ["string"],
      "priority": "HIGH"
    }
  ]
}

IMPORTANT OUTPUT RULES:

- The top-level object MUST contain reportType.
- reportType MUST be exactly "VOICE_OF_CUSTOMER".
- sentiment counts MUST exactly match the supplied deterministic data.
- sentiment percentages MUST exactly match the supplied deterministic
  data.
- top-theme evidenceCount MUST exactly match the supplied data.
- top-theme percentage MUST exactly match the supplied data.
- sentiment-shift changePercentagePoints MUST exactly match the supplied
  data.
- Only use actual feedback IDs supplied in representativeFeedback.
- Every quote MUST be copied exactly from the supplied feedback.
- Do not modify quotes.
- Do not summarize quotes.
- Do not shorten quotes.
- Keep representative feedback at or below the supplied number.
- If there are no representative feedback records, return [].
- If there are no themes, return [].
- If there is insufficient evidence for recommended actions, return [].
- Do not invent missing information.
- Do not return null for fields that require strings or arrays.
- Do not return markdown.
- Do not return commentary.
- Return valid JSON only.

GROUNDED DATA:

${JSON.stringify(groundedData, null, 2)}
`.trim();
}

async function requestReportFromGroq(data: ReportData) {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.1,
    response_format: {
      type: "json_object",
    },
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(),
      },
      {
        role: "user",
        content: buildUserPrompt(data),
      },
    ],
  });

  const responseText =
    completion.choices[0]?.message?.content;

  if (!responseText) {
    throw new Error("Groq returned an empty report response.");
  }

  return responseText;
}

export async function generateReportContent(
  data: ReportData
): Promise<ReportContent> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const responseText =
    await requestReportFromGroq(data);

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(extractJson(responseText));
  } catch (error) {
    console.error(
      "Groq report JSON parsing error:",
      error
    );

    console.error(
      "Groq raw report response:",
      responseText
    );

    throw new Error(
      "Groq returned invalid report JSON."
    );
  }

  const parsedReport =
    reportContentSchema.safeParse(parsedJson);

  if (!parsedReport.success) {
    console.error(
      "Invalid Groq report response:",
      parsedReport.error.flatten()
    );

    console.error(
      "Groq parsed report response:",
      parsedJson
    );

    throw new Error(
      "Groq report response failed validation."
    );
  }

  return parsedReport.data;
}