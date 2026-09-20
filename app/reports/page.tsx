"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/app-shell";

type ReportHistoryItem = {
  id: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  generatedBy: {
    id: string;
    name: string | null;
    email: string | null;
  };
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDefaultStartDate() {
  const date = new Date();
  date.setDate(date.getDate() - 29);

  return getDateInputValue(date);
}

function getDefaultEndDate() {
  return getDateInputValue(new Date());
}

function getGeneratorName(report: ReportHistoryItem) {
  return (
    report.generatedBy.name ||
    report.generatedBy.email ||
    "Workspace user"
  );
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [periodStart, setPeriodStart] = useState(
    getDefaultStartDate()
  );
  const [periodEnd, setPeriodEnd] = useState(
    getDefaultEndDate()
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  const loadReports = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError("");

      const response = await fetch("/api/reports", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to load reports."
        );
      }

      setReports(data.reports ?? []);
    } catch (error) {
      console.error("Reports page load error:", error);

      setLoadError(
        error instanceof Error
          ? error.message
          : "Failed to load reports."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  function openGeneratePanel() {
    setGenerateError("");
    setPeriodStart(getDefaultStartDate());
    setPeriodEnd(getDefaultEndDate());
    setIsGenerateOpen(true);
  }

  function closeGeneratePanel() {
    if (isGenerating) {
      return;
    }

    setIsGenerateOpen(false);
    setGenerateError("");
  }

  async function handleGenerateReport() {
    setGenerateError("");

    if (!periodStart || !periodEnd) {
      setGenerateError("Please select both dates.");
      return;
    }

    if (periodEnd < periodStart) {
      setGenerateError(
        "The end date must be on or after the start date."
      );
      return;
    }

    try {
      setIsGenerating(true);

      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          periodStart,
          periodEnd,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to generate report."
        );
      }

      if (!data?.report?.id) {
        throw new Error(
          "Report was generated but no report ID was returned."
        );
      }

      window.location.href = `/reports/${data.report.id}`;
    } catch (error) {
      console.error("Report generation error:", error);

      setGenerateError(
        error instanceof Error
          ? error.message
          : "Failed to generate report."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <AppShell>
      <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p
                className="mb-2 text-sm font-semibold tracking-wide"
                style={{ color: "var(--primary)" }}
              >
                Insights
              </p>

              <h1
                className="text-3xl font-semibold tracking-tight sm:text-4xl"
                style={{ color: "var(--text)" }}
              >
                Reports
              </h1>

              <p
                className="mt-2 max-w-2xl text-sm leading-6"
                style={{ color: "var(--text-muted)" }}
              >
                Generate and review Voice of Customer reports based on
                your workspace feedback.
              </p>
            </div>

            <button
              type="button"
              onClick={openGeneratePanel}
              className="inline-flex shrink-0 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                backgroundColor: "var(--primary)",
                color: "#FFFFFF",
              }}
              disabled={isLoading}
            >
              Generate Report
            </button>
          </div>

          {isGenerateOpen && (
            <section
              className="mb-8 rounded-2xl border p-5 shadow-sm sm:p-6"
              style={{
                backgroundColor: "var(--surface)",
                borderColor: "rgba(82, 103, 125, 0.45)",
              }}
            >
              <div className="mb-5">
                <h2
                  className="text-lg font-semibold"
                  style={{ color: "var(--text)" }}
                >
                  Generate a Voice of Customer report
                </h2>

                <p
                  className="mt-1 text-sm leading-6"
                  style={{ color: "var(--text-muted)" }}
                >
                  Choose the feedback period you want LOOP to analyze.
                  The report will use actual workspace feedback,
                  deterministic statistics, and grounded AI analysis.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="report-period-start"
                    className="mb-2 block text-sm font-medium"
                    style={{ color: "var(--text)" }}
                  >
                    Start date
                  </label>

                  <input
                    id="report-period-start"
                    type="date"
                    value={periodStart}
                    onChange={(event) =>
                      setPeriodStart(event.target.value)
                    }
                    disabled={isGenerating}
                    className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      backgroundColor: "var(--bg)",
                      borderColor: "rgba(82, 103, 125, 0.45)",
                      color: "var(--text)",
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="report-period-end"
                    className="mb-2 block text-sm font-medium"
                    style={{ color: "var(--text)" }}
                  >
                    End date
                  </label>

                  <input
                    id="report-period-end"
                    type="date"
                    value={periodEnd}
                    onChange={(event) =>
                      setPeriodEnd(event.target.value)
                    }
                    disabled={isGenerating}
                    className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      backgroundColor: "var(--bg)",
                      borderColor: "rgba(82, 103, 125, 0.45)",
                      color: "var(--text)",
                    }}
                  />
                </div>
              </div>

              {generateError && (
                <div
                  className="mt-5 rounded-lg border px-4 py-3 text-sm"
                  style={{
                    backgroundColor: "rgba(240, 103, 122, 0.08)",
                    borderColor: "rgba(240, 103, 122, 0.35)",
                    color: "var(--text)",
                  }}
                >
                  {generateError}
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeGeneratePanel}
                  disabled={isGenerating}
                  className="inline-flex items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    backgroundColor: "var(--surface)",
                    borderColor: "rgba(82, 103, 125, 0.45)",
                    color: "var(--text)",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleGenerateReport}
                  disabled={isGenerating}
                  className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "#FFFFFF",
                  }}
                >
                  {isGenerating
                    ? "Generating report..."
                    : "Generate report"}
                </button>
              </div>
            </section>
          )}

          <section>
            <div className="mb-4">
              <h2
                className="text-lg font-semibold"
                style={{ color: "var(--text)" }}
              >
                Report history
              </h2>

              <p
                className="mt-1 text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                Previously generated reports for your workspace will
                appear here.
              </p>
            </div>

            {isLoading ? (
              <div
                className="flex min-h-[360px] items-center justify-center rounded-2xl border p-6 text-center shadow-sm"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "rgba(82, 103, 125, 0.45)",
                }}
              >
                <div>
                  <div
                    className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-transparent"
                    style={{
                      borderTopColor: "var(--primary)",
                      borderRightColor: "var(--primary)",
                    }}
                  />

                  <p
                    className="text-sm"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Loading report history...
                  </p>
                </div>
              </div>
            ) : loadError ? (
              <div
                className="rounded-2xl border p-6 shadow-sm"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "rgba(82, 103, 125, 0.45)",
                }}
              >
                <p
                  className="text-sm"
                  style={{ color: "var(--text)" }}
                >
                  {loadError}
                </p>

                <button
                  type="button"
                  onClick={() => void loadReports()}
                  className="mt-4 inline-flex items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
                  style={{
                    borderColor: "rgba(82, 103, 125, 0.45)",
                    color: "var(--text)",
                    backgroundColor: "var(--surface)",
                  }}
                >
                  Try again
                </button>
              </div>
            ) : reports.length === 0 ? (
              <div
                className="flex min-h-[360px] items-center justify-center rounded-2xl border p-6 text-center shadow-sm"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "rgba(82, 103, 125, 0.45)",
                }}
              >
                <div className="max-w-md">
                  <div
                    className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl border"
                    style={{
                      borderColor: "rgba(82, 103, 125, 0.45)",
                      backgroundColor: "var(--surface-muted)",
                      color: "var(--primary)",
                    }}
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M6 3h9l4 4v14H6z" />
                      <path d="M14 3v5h5" />
                      <path d="M9 13h6" />
                      <path d="M9 17h6" />
                    </svg>
                  </div>

                  <h3
                    className="text-base font-semibold"
                    style={{ color: "var(--text)" }}
                  >
                    No reports yet
                  </h3>

                  <p
                    className="mt-2 text-sm leading-6"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Generate your first Voice of Customer report to
                    turn customer feedback into a clear summary of
                    themes, sentiment, evidence, and recommended
                    actions.
                  </p>

                  <button
                    type="button"
                    onClick={openGeneratePanel}
                    className="mt-5 inline-flex items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
                    style={{
                      borderColor: "rgba(82, 103, 125, 0.45)",
                      color: "var(--text)",
                      backgroundColor: "var(--surface)",
                    }}
                  >
                    Generate your first report
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="rounded-2xl border p-5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 sm:p-6"
                    style={{
                      backgroundColor: "var(--surface)",
                      borderColor: "rgba(82, 103, 125, 0.45)",
                    }}
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            className="text-base font-semibold"
                            style={{ color: "var(--text)" }}
                          >
                            {report.title}
                          </h3>

                          <span
                            className="rounded-full border px-2.5 py-1 text-xs font-medium"
                            style={{
                              backgroundColor:
                                "var(--surface-muted)",
                              borderColor:
                                "rgba(82, 103, 125, 0.35)",
                              color: "var(--text-secondary)",
                            }}
                          >
                            Voice of Customer
                          </span>
                        </div>

                        <div
                          className="mt-2 flex flex-col gap-1 text-sm sm:flex-row sm:flex-wrap sm:gap-x-4"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <span>
                            {formatDate(report.periodStart)} –{" "}
                            {formatDate(report.periodEnd)}
                          </span>

                          <span>
                            Generated {formatDate(report.createdAt)}
                          </span>

                          <span>
                            By {getGeneratorName(report)}
                          </span>
                        </div>
                      </div>

                      <Link
                        href={`/reports/${report.id}`}
                        className="inline-flex shrink-0 items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
                        style={{
                          backgroundColor: "var(--surface)",
                          borderColor:
                            "rgba(82, 103, 125, 0.45)",
                          color: "var(--text)",
                        }}
                      >
                        View report
                        <span
                          className="ml-2"
                          style={{ color: "var(--primary)" }}
                          aria-hidden="true"
                        >
                          →
                        </span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </AppShell>
  );
}