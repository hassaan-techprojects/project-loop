"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type FeedbackAnalysis = {
  sentiment: "POS" | "NEU" | "NEG";
  sentimentScore: number;
  confidence: number;
  themes: string[];
  featureArea: string;
  signals: string[];
  explanation: string;
};

type AnalysisResult = {
  id: number;
  analysis: FeedbackAnalysis;
};

type AnalysisSummaryProps = {
  results: AnalysisResult[];
};

const sentimentLabels = {
  POS: "Positive",
  NEU: "Neutral",
  NEG: "Negative",
} as const;

function getAverageConfidence(results: AnalysisResult[]) {
  if (results.length === 0) {
    return 0;
  }

  const total = results.reduce(
    (sum, result) => sum + result.analysis.confidence,
    0
  );

  return Math.round(total / results.length);
}

function getPercentage(
  count: number,
  total: number
) {
  if (total === 0) {
    return 0;
  }

  return Math.round((count / total) * 100);
}

export default function AnalysisSummary({
  results,
}: AnalysisSummaryProps) {
  const total = results.length;

  const positiveCount = results.filter(
    (result) => result.analysis.sentiment === "POS"
  ).length;

  const neutralCount = results.filter(
    (result) => result.analysis.sentiment === "NEU"
  ).length;

  const negativeCount = results.filter(
    (result) => result.analysis.sentiment === "NEG"
  ).length;

  const positivePercentage = getPercentage(
    positiveCount,
    total
  );

  const negativePercentage = getPercentage(
    negativeCount,
    total
  );

  const averageConfidence = getAverageConfidence(results);

  const sentimentData = [
    {
      name: sentimentLabels.POS,
      value: positiveCount,
    },
    {
      name: sentimentLabels.NEU,
      value: neutralCount,
    },
    {
      name: sentimentLabels.NEG,
      value: negativeCount,
    },
  ];

  const themeCounts = new Map<string, number>();

  for (const result of results) {
    for (const theme of result.analysis.themes) {
      themeCounts.set(
        theme,
        (themeCounts.get(theme) ?? 0) + 1
      );
    }
  }

  const themeData = Array.from(themeCounts.entries())
    .map(([theme, count]) => ({
      theme,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const confidenceData = [
    {
      range: "0–59%",
      count: results.filter(
        (result) => result.analysis.confidence < 60
      ).length,
    },
    {
      range: "60–79%",
      count: results.filter(
        (result) =>
          result.analysis.confidence >= 60 &&
          result.analysis.confidence < 80
      ).length,
    },
    {
      range: "80–100%",
      count: results.filter(
        (result) => result.analysis.confidence >= 80
      ).length,
    },
  ];

  if (total === 0) {
    return null;
  }

  return (
    <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">
          Analysis summary
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Summary of the feedback currently visible after
          applying your filters.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Analyzed
          </p>

          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {total}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            feedback items
          </p>
        </div>

        <div className="rounded-xl bg-emerald-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
            Positive
          </p>

          <p className="mt-2 text-2xl font-semibold text-emerald-800">
            {positivePercentage}%
          </p>

          <p className="mt-1 text-xs text-emerald-600">
            {positiveCount} items
          </p>
        </div>

        <div className="rounded-xl bg-red-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-red-600">
            Negative
          </p>

          <p className="mt-2 text-2xl font-semibold text-red-800">
            {negativePercentage}%
          </p>

          <p className="mt-1 text-xs text-red-600">
            {negativeCount} items
          </p>
        </div>

        <div className="rounded-xl bg-violet-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-violet-600">
            Avg. confidence
          </p>

          <p className="mt-2 text-2xl font-semibold text-violet-800">
            {averageConfidence}%
          </p>

          <p className="mt-1 text-xs text-violet-600">
            AI classification confidence
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-800">
              Sentiment breakdown
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Distribution across the filtered feedback.
            </p>
          </div>

          <div className="h-64">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <PieChart>
                <Pie
                  data={sentimentData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  label={({ name, value }) =>
                    `${name}: ${value}`
                  }
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#94a3b8" />
                  <Cell fill="#ef4444" />
                </Pie>

                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-800">
              Confidence distribution
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              How confidently LOOP classified the feedback.
            </p>
          </div>

          <div className="h-64">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart data={confidenceData}>
                <XAxis dataKey="range" />

                <YAxis allowDecimals={false} />

                <Tooltip />

                <Bar
                  dataKey="count"
                  name="Feedback"
                  fill="#7c3aed"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 p-4">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-800">
            Top themes
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Most frequently detected themes in the filtered
            feedback.
          </p>
        </div>

        {themeData.length === 0 ? (
          <div className="rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No themes available.
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={themeData}
                layout="vertical"
                margin={{
                  left: 20,
                  right: 20,
                  top: 5,
                  bottom: 5,
                }}
              >
                <XAxis
                  type="number"
                  allowDecimals={false}
                />

                <YAxis
                  type="category"
                  dataKey="theme"
                  width={120}
                />

                <Tooltip />

                <Bar
                  dataKey="count"
                  name="Feedback"
                  fill="#8b5cf6"
                  radius={[0, 6, 6, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}