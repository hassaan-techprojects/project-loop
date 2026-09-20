"use client";
import ReportExportButton from "@/components/report-export-button";
import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "@/components/app-shell";

type Sentiment = "POS" | "NEU" | "NEG";

type ReportContent = {
  reportType: "VOICE_OF_CUSTOMER";

  executiveSummary: {
    overview: string;
    overallSentiment: string;
    majorConcerns: string[];
    positiveSignals: string[];
  };

  topThemes: Array<{
    name: string;
    summary: string;
    evidenceCount: number;
    percentage: number;
  }>;

  sentiment: {
    summary: string;
    positive: {
      count: number;
      percentage: number;
    };
    neutral: {
      count: number;
      percentage: number;
    };
    negative: {
      count: number;
      percentage: number;
    };
  };

  sentimentShifts: Array<{
    sentiment: Sentiment;
    changePercentagePoints: number;
    interpretation: string;
  }>;

  representativeFeedback: Array<{
    feedbackId: string;
    quote: string;
    whyItMatters: string;
  }>;

  recommendedActions: Array<{
    action: string;
    rationale: string;
    relatedThemes: string[];
    priority: "HIGH" | "MEDIUM" | "LOW";
  }>;
};

type ReportResponse = {
  report: {
    id: string;
    title: string;
    periodStart: string;
    periodEnd: string;
    contentJson: ReportContent;
    createdAt: string;
    generatedBy: {
      id: string;
      name: string | null;
      email: string | null;
    };
  };
};

type ReportPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatPercentage(value: number) {
  return `${Math.round(value)}%`;
}

function getSentimentLabel(sentiment: Sentiment) {
  if (sentiment === "POS") {
    return "Positive";
  }

  if (sentiment === "NEG") {
    return "Negative";
  }

  return "Neutral";
}

function getSentimentChangeLabel(value: number) {
  if (value > 0) {
    return `+${value} pts`;
  }

  return `${value} pts`;
}

function getPriorityStyles(
  priority: "HIGH" | "MEDIUM" | "LOW"
) {
  if (priority === "HIGH") {
    return {
      backgroundColor: "rgba(240, 103, 122, 0.10)",
      borderColor: "rgba(240, 103, 122, 0.35)",
      color: "var(--text)",
    };
  }

  if (priority === "MEDIUM") {
    return {
      backgroundColor: "rgba(224, 168, 87, 0.10)",
      borderColor: "rgba(224, 168, 87, 0.35)",
      color: "var(--text)",
    };
  }

  return {
    backgroundColor: "rgba(52, 200, 138, 0.10)",
    borderColor: "rgba(52, 200, 138, 0.35)",
    color: "var(--text)",
  };
}

function getSentimentStyles(sentiment: Sentiment) {
  if (sentiment === "POS") {
    return {
      backgroundColor: "rgba(52, 200, 138, 0.10)",
      borderColor: "rgba(52, 200, 138, 0.35)",
      color: "var(--text)",
    };
  }

  if (sentiment === "NEG") {
    return {
      backgroundColor: "rgba(240, 103, 122, 0.10)",
      borderColor: "rgba(240, 103, 122, 0.35)",
      color: "var(--text)",
    };
  }

  return {
    backgroundColor: "rgba(224, 168, 87, 0.10)",
    borderColor: "rgba(224, 168, 87, 0.35)",
    color: "var(--text)",
  };
}

function getGeneratorName(report: ReportResponse["report"]) {
  return (
    report.generatedBy.name ||
    report.generatedBy.email ||
    "Workspace user"
  );
}

export default function ReportViewerPage({
  params,
}: ReportPageProps) {
  const [report, setReport] = useState<
    ReportResponse["report"] | null
  >(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      try {
        setIsLoading(true);
        setError("");

        const { id } = await params;

        const response = await fetch(`/api/reports/${id}`, {
          method: "GET",
          cache: "no-store",
        });

        const data =
          (await response.json()) as
            | ReportResponse
            | { error?: string };

        if (!response.ok) {
          throw new Error(
            "error" in data && data.error
              ? data.error
              : "Failed to load report."
          );
        }

        if (
          !("report" in data) ||
          !data.report
        ) {
          throw new Error(
            "Report data was not returned."
          );
        }

        if (!cancelled) {
          setReport(data.report);
        }
      } catch (loadError) {
        console.error(
          "Report viewer load error:",
          loadError
        );

        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load report."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadReport();

    return () => {
      cancelled = true;
    };
  }, [params]);

  if (isLoading) {
    return (
      <AppShell>
        <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center">
            <div className="text-center">
              <div
                className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-transparent"
                style={{
                  borderTopColor: "var(--primary)",
                  borderRightColor: "var(--primary)",
                }}
              />

              <p
                className="text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                Loading report...
              </p>
            </div>
          </div>
        </main>
      </AppShell>
    );
  }

  if (error || !report) {
    return (
      <AppShell>
        <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Link
              href="/reports"
              className="inline-flex items-center text-sm font-medium transition-opacity hover:opacity-80"
              style={{ color: "var(--primary)" }}
            >
              ← Back to Reports
            </Link>

            <div
              className="mt-6 rounded-2xl border p-6 shadow-sm"
              style={{
                backgroundColor: "var(--surface)",
                borderColor:
                  "rgba(82, 103, 125, 0.45)",
              }}
            >
              <h1
                className="text-xl font-semibold"
                style={{ color: "var(--text)" }}
              >
                Report unavailable
              </h1>

              <p
                className="mt-2 text-sm leading-6"
                style={{ color: "var(--text-muted)" }}
              >
                {error || "The requested report could not be loaded."}
              </p>
            </div>
          </div>
        </main>
      </AppShell>
    );
  }

  const content = report.contentJson;

  return (
    <AppShell>
      <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <Link
              href="/reports"
              className="inline-flex items-center text-sm font-medium transition-opacity hover:opacity-80"
              style={{ color: "var(--primary)" }}
            >
              ← Back to Reports
            </Link>

            <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p
                  className="mb-2 text-sm font-semibold tracking-wide"
                  style={{ color: "var(--primary)" }}
                >
                  Voice of Customer
                </p>

                <h1
                  className="text-3xl font-semibold tracking-tight sm:text-4xl"
                  style={{ color: "var(--text)" }}
                >
                  {report.title}
                </h1>

                <p
                  className="mt-3 text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  {formatDate(report.periodStart)} –{" "}
                  {formatDate(report.periodEnd)}
                </p>

                <p
                  className="mt-1 text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  Generated {formatDate(report.createdAt)} by{" "}
                  {getGeneratorName(report)}
                </p>
              </div>
              <div className="shrink-0 print:hidden">
  <ReportExportButton />
</div>
            </div>
          </div>

          <section
            className="mb-6 rounded-2xl border p-6 shadow-sm sm:p-7"
            style={{
              backgroundColor: "var(--surface)",
              borderColor:
                "rgba(82, 103, 125, 0.45)",
            }}
          >
            <div className="mb-5">
              <p
                className="text-sm font-semibold tracking-wide"
                style={{ color: "var(--primary)" }}
              >
                Executive summary
              </p>

              <h2
                className="mt-1 text-xl font-semibold"
                style={{ color: "var(--text)" }}
              >
                What customers are telling you
              </h2>
            </div>

            <p
              className="text-sm leading-7"
              style={{ color: "var(--text)" }}
            >
              {content.executiveSummary.overview}
            </p>

            <div
              className="mt-6 rounded-xl border p-4"
              style={{
                backgroundColor: "var(--surface-muted)",
                borderColor:
                  "rgba(82, 103, 125, 0.30)",
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-muted)" }}
              >
                Overall sentiment
              </p>

              <p
                className="mt-2 text-sm leading-6"
                style={{ color: "var(--text)" }}
              >
                {content.executiveSummary.overallSentiment}
              </p>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div>
                <h3
                  className="text-sm font-semibold"
                  style={{ color: "var(--text)" }}
                >
                  Major concerns
                </h3>

                {content.executiveSummary.majorConcerns.length ===
                0 ? (
                  <p
                    className="mt-3 text-sm"
                    style={{ color: "var(--text-muted)" }}
                  >
                    No major concerns were identified from the
                    available evidence.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {content.executiveSummary.majorConcerns.map(
                      (item, index) => (
                        <li
                          key={`${item}-${index}`}
                          className="flex gap-3 text-sm leading-6"
                          style={{ color: "var(--text)" }}
                        >
                          <span
                            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{
                              backgroundColor:
                                "var(--negative)",
                            }}
                          />

                          <span>{item}</span>
                        </li>
                      )
                    )}
                  </ul>
                )}
              </div>

              <div>
                <h3
                  className="text-sm font-semibold"
                  style={{ color: "var(--text)" }}
                >
                  Positive signals
                </h3>

                {content.executiveSummary.positiveSignals
                  .length === 0 ? (
                  <p
                    className="mt-3 text-sm"
                    style={{ color: "var(--text-muted)" }}
                  >
                    No strong positive signals were identified from
                    the available evidence.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {content.executiveSummary.positiveSignals.map(
                      (item, index) => (
                        <li
                          key={`${item}-${index}`}
                          className="flex gap-3 text-sm leading-6"
                          style={{ color: "var(--text)" }}
                        >
                          <span
                            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{
                              backgroundColor:
                                "var(--positive)",
                            }}
                          />

                          <span>{item}</span>
                        </li>
                      )
                    )}
                  </ul>
                )}
              </div>
            </div>
          </section>

          <section className="mb-6">
            <div className="mb-4">
              <p
                className="text-sm font-semibold tracking-wide"
                style={{ color: "var(--primary)" }}
              >
                Sentiment
              </p>

              <h2
                className="mt-1 text-xl font-semibold"
                style={{ color: "var(--text)" }}
              >
                Customer sentiment
              </h2>
            </div>

            <div
              className="mb-4 rounded-2xl border p-5 shadow-sm"
              style={{
                backgroundColor: "var(--surface)",
                borderColor:
                  "rgba(82, 103, 125, 0.45)",
              }}
            >
              <p
                className="text-sm leading-6"
                style={{ color: "var(--text-muted)" }}
              >
                {content.sentiment.summary}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {(
                [
                  {
                    key: "positive",
                    label: "Positive",
                    value: content.sentiment.positive,
                    sentiment: "POS" as const,
                  },
                  {
                    key: "neutral",
                    label: "Neutral",
                    value: content.sentiment.neutral,
                    sentiment: "NEU" as const,
                  },
                  {
                    key: "negative",
                    label: "Negative",
                    value: content.sentiment.negative,
                    sentiment: "NEG" as const,
                  },
                ] as const
              ).map((item) => (
                <div
                  key={item.key}
                  className="rounded-2xl border p-5 shadow-sm"
                  style={{
                    backgroundColor: "var(--surface)",
                    borderColor:
                      "rgba(82, 103, 125, 0.45)",
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className="rounded-full border px-2.5 py-1 text-xs font-semibold"
                      style={getSentimentStyles(
                        item.sentiment
                      )}
                    >
                      {item.label}
                    </span>

                    <span
                      className="text-2xl font-semibold"
                      style={{ color: "var(--text)" }}
                    >
                      {formatPercentage(
                        item.value.percentage
                      )}
                    </span>
                  </div>

                  <p
                    className="mt-4 text-sm"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {item.value.count} feedback item
                    {item.value.count === 1 ? "" : "s"}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-6">
            <div className="mb-4">
              <p
                className="text-sm font-semibold tracking-wide"
                style={{ color: "var(--primary)" }}
              >
                Sentiment shifts
              </p>

              <h2
                className="mt-1 text-xl font-semibold"
                style={{ color: "var(--text)" }}
              >
                Change versus the previous period
              </h2>
            </div>

            <div
              className="overflow-hidden rounded-2xl border shadow-sm"
              style={{
                backgroundColor: "var(--surface)",
                borderColor:
                  "rgba(82, 103, 125, 0.45)",
              }}
            >
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {content.sentimentShifts.map((item) => (
                  <div
                    key={item.sentiment}
                    className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <span
                          className="rounded-full border px-2.5 py-1 text-xs font-semibold"
                          style={getSentimentStyles(
                            item.sentiment
                          )}
                        >
                          {getSentimentLabel(
                            item.sentiment
                          )}
                        </span>

                        <span
                          className="text-sm font-semibold"
                          style={{ color: "var(--text)" }}
                        >
                          {getSentimentChangeLabel(
                            item.changePercentagePoints
                          )}
                        </span>
                      </div>

                      <p
                        className="mt-2 text-sm leading-6"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {item.interpretation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mb-6">
            <div className="mb-4">
              <p
                className="text-sm font-semibold tracking-wide"
                style={{ color: "var(--primary)" }}
              >
                Themes
              </p>

              <h2
                className="mt-1 text-xl font-semibold"
                style={{ color: "var(--text)" }}
              >
                What customers talk about most
              </h2>
            </div>

            {content.topThemes.length === 0 ? (
              <div
                className="rounded-2xl border p-6 shadow-sm"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor:
                    "rgba(82, 103, 125, 0.45)",
                }}
              >
                <p
                  className="text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  No themes were available for this reporting
                  period.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {content.topThemes.map((theme) => (
                  <div
                    key={theme.name}
                    className="rounded-2xl border p-5 shadow-sm"
                    style={{
                      backgroundColor: "var(--surface)",
                      borderColor:
                        "rgba(82, 103, 125, 0.45)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3
                          className="text-base font-semibold"
                          style={{ color: "var(--text)" }}
                        >
                          {theme.name}
                        </h3>

                        <p
                          className="mt-2 text-sm leading-6"
                          style={{
                            color: "var(--text-muted)",
                          }}
                        >
                          {theme.summary}
                        </p>
                      </div>

                      <span
                        className="shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold"
                        style={{
                          backgroundColor:
                            "var(--surface-muted)",
                          borderColor:
                            "rgba(82, 103, 125, 0.35)",
                          color: "var(--text)",
                        }}
                      >
                        {formatPercentage(
                          theme.percentage
                        )}
                      </span>
                    </div>

                    <p
                      className="mt-4 text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {theme.evidenceCount} feedback item
                      {theme.evidenceCount === 1 ? "" : "s"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mb-6">
            <div className="mb-4">
              <p
                className="text-sm font-semibold tracking-wide"
                style={{ color: "var(--primary)" }}
              >
                Customer evidence
              </p>

              <h2
                className="mt-1 text-xl font-semibold"
                style={{ color: "var(--text)" }}
              >
                Representative feedback
              </h2>
            </div>

            {content.representativeFeedback.length === 0 ? (
              <div
                className="rounded-2xl border p-6 shadow-sm"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor:
                    "rgba(82, 103, 125, 0.45)",
                }}
              >
                <p
                  className="text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  No representative feedback was available.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {content.representativeFeedback.map(
                  (item) => (
                    <article
                      key={item.feedbackId}
                      className="rounded-2xl border p-5 shadow-sm sm:p-6"
                      style={{
                        backgroundColor: "var(--surface)",
                        borderColor:
                          "rgba(82, 103, 125, 0.45)",
                      }}
                    >
                      <blockquote
                        className="text-sm leading-7 sm:text-base"
                        style={{ color: "var(--text)" }}
                      >
                        “{item.quote}”
                      </blockquote>

                      <div
                        className="mt-4 border-t pt-4"
                        style={{
                          borderColor:
                            "rgba(82, 103, 125, 0.25)",
                        }}
                      >
                        <p
                          className="text-sm leading-6"
                          style={{
                            color: "var(--text-muted)",
                          }}
                        >
                          <span
                            className="font-semibold"
                            style={{
                              color: "var(--text)",
                            }}
                          >
                            Why it matters:
                          </span>{" "}
                          {item.whyItMatters}
                        </p>
                      </div>
                    </article>
                  )
                )}
              </div>
            )}
          </section>

          <section>
            <div className="mb-4">
              <p
                className="text-sm font-semibold tracking-wide"
                style={{ color: "var(--primary)" }}
              >
                Recommended actions
              </p>

              <h2
                className="mt-1 text-xl font-semibold"
                style={{ color: "var(--text)" }}
              >
                What to consider next
              </h2>
            </div>

            {content.recommendedActions.length === 0 ? (
              <div
                className="rounded-2xl border p-6 shadow-sm"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor:
                    "rgba(82, 103, 125, 0.45)",
                }}
              >
                <p
                  className="text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  No recommended actions were generated from the
                  available evidence.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {content.recommendedActions.map(
                  (item, index) => (
                    <article
                      key={`${item.action}-${index}`}
                      className="rounded-2xl border p-5 shadow-sm sm:p-6"
                      style={{
                        backgroundColor: "var(--surface)",
                        borderColor:
                          "rgba(82, 103, 125, 0.45)",
                      }}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h3
                            className="text-base font-semibold"
                            style={{ color: "var(--text)" }}
                          >
                            {item.action}
                          </h3>

                          <p
                            className="mt-2 text-sm leading-6"
                            style={{
                              color: "var(--text-muted)",
                            }}
                          >
                            {item.rationale}
                          </p>
                        </div>

                        <span
                          className="w-fit shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold"
                          style={getPriorityStyles(
                            item.priority
                          )}
                        >
                          {item.priority}
                        </span>
                      </div>

                      {item.relatedThemes.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {item.relatedThemes.map(
                            (theme) => (
                              <span
                                key={theme}
                                className="rounded-full border px-2.5 py-1 text-xs"
                                style={{
                                  backgroundColor:
                                    "var(--surface-muted)",
                                  borderColor:
                                    "rgba(82, 103, 125, 0.30)",
                                  color:
                                    "var(--text-muted)",
                                }}
                              >
                                {theme}
                              </span>
                            )
                          )}
                        </div>
                      )}
                    </article>
                  )
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </AppShell>
  );
}