import { z } from "zod";

const sentimentSchema = z.enum(["POS", "NEU", "NEG"]);

export const reportContentSchema = z.object({
  reportType: z.literal("VOICE_OF_CUSTOMER"),

  executiveSummary: z.object({
    overview: z.string().trim().min(1).max(3000),
    overallSentiment: z.string().trim().min(1).max(1000),
    majorConcerns: z
      .array(z.string().trim().min(1).max(500))
      .max(10),
    positiveSignals: z
      .array(z.string().trim().min(1).max(500))
      .max(10),
  }),

  topThemes: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200),
        summary: z.string().trim().min(1).max(1000),
        evidenceCount: z.number().int().nonnegative(),
        percentage: z.number().min(0).max(100),
      })
    )
    .max(10),

  sentiment: z.object({
    summary: z.string().trim().min(1).max(1500),
    positive: z.object({
      count: z.number().int().nonnegative(),
      percentage: z.number().min(0).max(100),
    }),
    neutral: z.object({
      count: z.number().int().nonnegative(),
      percentage: z.number().min(0).max(100),
    }),
    negative: z.object({
      count: z.number().int().nonnegative(),
      percentage: z.number().min(0).max(100),
    }),
  }),

  sentimentShifts: z
    .array(
      z.object({
        sentiment: sentimentSchema,
        changePercentagePoints: z.number(),
        interpretation: z.string().trim().min(1).max(750),
      })
    )
    .max(3),

  representativeFeedback: z
    .array(
      z.object({
        feedbackId: z.string().min(1),
        quote: z.string().trim().min(1).max(2000),
        whyItMatters: z.string().trim().min(1).max(750),
      })
    )
    .max(12),

  recommendedActions: z
    .array(
      z.object({
        action: z.string().trim().min(1).max(500),
        rationale: z.string().trim().min(1).max(1000),
        relatedThemes: z
          .array(z.string().trim().min(1).max(200))
          .max(5),
        priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
      })
    )
    .max(10),
});

export type ReportContent = z.infer<typeof reportContentSchema>;