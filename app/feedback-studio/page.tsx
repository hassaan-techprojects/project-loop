"use client";

import { useMemo, useState } from "react";

import AnalysisSummary from "@/components/feedback-studio/analysis-summary";
import CsvUploader from "@/components/feedback-studio/csv-uploader";
import ExportAnalysisButton from "@/components/feedback-studio/export-analysis-button";

type FeedbackAnalysis = {
  sentiment: "POS" | "NEU" | "NEG";
  sentimentScore: number;
  confidence: number;
  themes: string[];
  featureArea: string;
  signals: string[];
  explanation: string;
};

type CsvRow = {
  id: number;
  feedback: string;
};

type BatchAnalysisResult = {
  id: number;
  analysis: FeedbackAnalysis;
};

type SentimentFilter = "ALL" | "POS" | "NEU" | "NEG";

type ConfidenceFilter = "ALL" | "HIGH" | "MEDIUM" | "LOW";

function isFeedbackAnalysis(value: unknown): value is FeedbackAnalysis {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("sentiment" in value) || !("sentimentScore" in value)) {
    return false;
  }

  if (!("confidence" in value) || !("themes" in value)) {
    return false;
  }

  if (!("featureArea" in value) || !("signals" in value)) {
    return false;
  }

  if (!("explanation" in value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    (candidate.sentiment === "POS" ||
      candidate.sentiment === "NEU" ||
      candidate.sentiment === "NEG") &&
    typeof candidate.sentimentScore === "number" &&
    typeof candidate.confidence === "number" &&
    Array.isArray(candidate.themes) &&
    candidate.themes.every((item) => typeof item === "string") &&
    typeof candidate.featureArea === "string" &&
    Array.isArray(candidate.signals) &&
    candidate.signals.every((item) => typeof item === "string") &&
    typeof candidate.explanation === "string"
  );
}

function isBatchAnalysisResult(
  value: unknown
): value is BatchAnalysisResult[] {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every((item) => {
    if (typeof item !== "object" || item === null) {
      return false;
    }

    if (!("id" in item) || !("analysis" in item)) {
      return false;
    }

    const candidate = item as Record<string, unknown>;

    return (
      typeof candidate.id === "number" &&
      Number.isInteger(candidate.id) &&
      isFeedbackAnalysis(candidate.analysis)
    );
  });
}

export default function FeedbackStudioPage() {
  const [feedback, setFeedback] = useState("");
  const [analysis, setAnalysis] =
    useState<FeedbackAnalysis | null>(null);

  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvResults, setCsvResults] = useState<
    BatchAnalysisResult[]
  >([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [sentimentFilter, setSentimentFilter] =
    useState<SentimentFilter>("ALL");
  const [confidenceFilter, setConfidenceFilter] =
    useState<ConfidenceFilter>("ALL");

  const [loading, setLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);

  const [error, setError] = useState("");
  const [csvError, setCsvError] = useState("");

  async function analyzeFeedback() {
    const trimmedFeedback = feedback.trim();

    if (trimmedFeedback.length < 3) {
      setError("Please enter at least 3 characters of feedback.");
      return;
    }

    setLoading(true);
    setError("");
    setAnalysis(null);

    try {
      const response = await fetch("/api/feedback-studio/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          feedback: trimmedFeedback,
        }),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Failed to analyze feedback.";

        throw new Error(message);
      }

      if (
        typeof data !== "object" ||
        data === null ||
        !("analysis" in data) ||
        !isFeedbackAnalysis(data.analysis)
      ) {
        throw new Error("The analysis response was invalid.");
      }

      setAnalysis(data.analysis);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to analyze feedback."
      );
    } finally {
      setLoading(false);
    }
  }

  async function analyzeCsvFeedback() {
    if (csvRows.length === 0) {
      setCsvError("Please upload a CSV file first.");
      return;
    }

    setCsvLoading(true);
    setCsvError("");
    setCsvResults([]);

    try {
      const response = await fetch(
        "/api/feedback-studio/analyze-batch",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: csvRows,
          }),
        }
      );

      const data: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Failed to analyze CSV feedback.";

        throw new Error(message);
      }

      if (
        typeof data !== "object" ||
        data === null ||
        !("results" in data) ||
        !isBatchAnalysisResult(data.results)
      ) {
        throw new Error(
          "The batch analysis response was invalid."
        );
      }

      setCsvResults(data.results);
    } catch (requestError) {
      setCsvError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to analyze CSV feedback."
      );
    } finally {
      setCsvLoading(false);
    }
  }

  function handleCsvRowsLoaded(rows: CsvRow[]) {
    setCsvRows(rows);
    setCsvResults([]);
    setCsvError("");
    setSearchQuery("");
    setSentimentFilter("ALL");
    setConfidenceFilter("ALL");
  }

  function getSentimentLabel(
    sentiment: FeedbackAnalysis["sentiment"]
  ) {
    if (sentiment === "POS") {
      return "Positive";
    }

    if (sentiment === "NEG") {
      return "Negative";
    }

    return "Neutral";
  }

  function getSentimentBadgeClass(
    sentiment: FeedbackAnalysis["sentiment"]
  ) {
    if (sentiment === "POS") {
      return "bg-emerald-50 text-emerald-700";
    }

    if (sentiment === "NEG") {
      return "bg-red-50 text-red-700";
    }

    return "bg-slate-100 text-slate-700";
  }

  const filteredResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return csvResults.filter((result) => {
      const row = csvRows.find(
        (item) => item.id === result.id
      );

      const feedbackText = row?.feedback ?? "";

      const searchableText = [
        feedbackText,
        result.analysis.featureArea,
        ...result.analysis.themes,
        ...result.analysis.signals,
        result.analysis.explanation,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        query.length === 0 || searchableText.includes(query);

      const matchesSentiment =
        sentimentFilter === "ALL" ||
        result.analysis.sentiment === sentimentFilter;

      const matchesConfidence =
        confidenceFilter === "ALL" ||
        (confidenceFilter === "HIGH" &&
          result.analysis.confidence >= 80) ||
        (confidenceFilter === "MEDIUM" &&
          result.analysis.confidence >= 60 &&
          result.analysis.confidence < 80) ||
        (confidenceFilter === "LOW" &&
          result.analysis.confidence < 60);

      return (
        matchesSearch &&
        matchesSentiment &&
        matchesConfidence
      );
    });
  }, [
    csvResults,
    csvRows,
    searchQuery,
    sentimentFilter,
    confidenceFilter,
  ]);

  const exportResults = filteredResults.map((result) => ({
    id: result.id,
    feedback:
      csvRows.find((row) => row.id === result.id)?.feedback ?? "",
    analysis: result.analysis,
  }));

  return (
    <main className="min-h-screen bg-[#f7f7fb] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-violet-600">
            LOOP
          </p>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Feedback Studio
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Analyze customer feedback with AI before adding it to
            your LOOP workspace.
          </p>
        </div>

        <div className="space-y-6">
          <CsvUploader onRowsLoaded={handleCsvRowsLoaded} />

          {csvRows.length > 0 ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    Uploaded feedback
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {csvRows.length} feedback{" "}
                    {csvRows.length === 1 ? "row" : "rows"} are
                    ready for AI analysis.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={analyzeCsvFeedback}
                  disabled={csvLoading}
                  className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {csvLoading
                    ? "Analyzing CSV..."
                    : `Analyze ${csvRows.length} feedback ${
                        csvRows.length === 1 ? "item" : "items"
                      } with AI`}
                </button>
              </div>

              {csvError ? (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                  {csvError}
                </div>
              ) : null}

              <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                {csvRows.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Feedback {row.id}
                    </p>

                    <p className="text-sm leading-6 text-slate-700">
                      {row.feedback}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {csvLoading ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-semibold">
                  AI analysis
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  LOOP is analyzing your uploaded feedback.
                </p>
              </div>

              <div className="space-y-3">
                <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
              </div>
            </section>
          ) : null}

          {csvResults.length > 0 ? (
            <>
              <AnalysisSummary results={filteredResults} />

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">
                      AI analysis results
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Showing {filteredResults.length} of{" "}
                      {csvResults.length} analyzed feedback{" "}
                      {csvResults.length === 1
                        ? "item."
                        : "items."}
                    </p>
                  </div>

                  <ExportAnalysisButton
                    results={exportResults}
                  />
                </div>

                <div className="mb-5 grid gap-3 md:grid-cols-[1.5fr_1fr_1fr]">
                  <div>
                    <label
                      htmlFor="feedback-search"
                      className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400"
                    >
                      Search
                    </label>

                    <input
                      id="feedback-search"
                      type="search"
                      value={searchQuery}
                      onChange={(event) =>
                        setSearchQuery(event.target.value)
                      }
                      placeholder="Search feedback, themes, signals..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="sentiment-filter"
                      className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400"
                    >
                      Sentiment
                    </label>

                    <select
                      id="sentiment-filter"
                      value={sentimentFilter}
                      onChange={(event) =>
                        setSentimentFilter(
                          event.target.value as SentimentFilter
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                    >
                      <option value="ALL">All sentiment</option>
                      <option value="POS">Positive</option>
                      <option value="NEU">Neutral</option>
                      <option value="NEG">Negative</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="confidence-filter"
                      className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400"
                    >
                      Confidence
                    </label>

                    <select
                      id="confidence-filter"
                      value={confidenceFilter}
                      onChange={(event) =>
                        setConfidenceFilter(
                          event.target.value as ConfidenceFilter
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                    >
                      <option value="ALL">All confidence</option>
                      <option value="HIGH">High — 80%+</option>
                      <option value="MEDIUM">
                        Medium — 60–79%
                      </option>
                      <option value="LOW">
                        Low — below 60%
                      </option>
                    </select>
                  </div>
                </div>

                {filteredResults.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                    <p className="text-sm font-medium text-slate-600">
                      No feedback matches these filters.
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setSentimentFilter("ALL");
                        setConfidenceFilter("ALL");
                      }}
                      className="mt-3 text-sm font-semibold text-violet-600 hover:text-violet-700"
                    >
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredResults.map((result) => (
                      <article
                        key={result.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Feedback {result.id}
                            </p>

                            <p className="mt-2 text-sm leading-6 text-slate-700">
                              {csvRows.find(
                                (row) => row.id === result.id
                              )?.feedback ?? ""}
                            </p>
                          </div>

                          <span
                            className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${getSentimentBadgeClass(
                              result.analysis.sentiment
                            )}`}
                          >
                            {getSentimentLabel(
                              result.analysis.sentiment
                            )}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-lg bg-white p-3">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                              Score
                            </p>

                            <p className="mt-1 text-sm font-semibold">
                              {result.analysis.sentimentScore}%
                            </p>
                          </div>

                          <div className="rounded-lg bg-white p-3">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                              Confidence
                            </p>

                            <p className="mt-1 text-sm font-semibold">
                              {result.analysis.confidence}%
                            </p>
                          </div>

                          <div className="rounded-lg bg-white p-3">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                              Feature area
                            </p>

                            <p className="mt-1 text-sm font-semibold">
                              {result.analysis.featureArea}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                            Themes
                          </p>

                          <div className="mt-2 flex flex-wrap gap-2">
                            {result.analysis.themes.map(
                              (theme) => (
                                <span
                                  key={theme}
                                  className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700"
                                >
                                  {theme}
                                </span>
                              )
                            )}
                          </div>
                        </div>

                        <div className="mt-4">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                            Signals
                          </p>

                          <ul className="mt-2 space-y-1">
                            {result.analysis.signals.map(
                              (signal) => (
                                <li
                                  key={signal}
                                  className="text-sm leading-6 text-slate-600"
                                >
                                  • {signal}
                                </li>
                              )
                            )}
                          </ul>
                        </div>

                        <div className="mt-4 rounded-lg bg-white p-3">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                            Explanation
                          </p>

                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            {result.analysis.explanation}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-semibold">
                  Analyze feedback
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Enter one customer feedback message and let LOOP
                  analyze it.
                </p>
              </div>

              <textarea
                value={feedback}
                onChange={(event) =>
                  setFeedback(event.target.value)
                }
                placeholder="Example: The app is extremely slow and keeps crashing whenever I try to upload a file."
                className="min-h-52 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                disabled={loading}
              />

              <div className="mt-4 flex items-center justify-between gap-4">
                <p className="text-xs text-slate-400">
                  {feedback.length} / 5000 characters
                </p>

                <button
                  type="button"
                  onClick={analyzeFeedback}
                  disabled={
                    loading || feedback.trim().length < 3
                  }
                  className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "Analyzing..."
                    : "Analyze with AI"}
                </button>
              </div>

              {error ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-semibold">
                  AI analysis
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Your structured manual feedback analysis will
                  appear here.
                </p>
              </div>

              {!analysis && !loading ? (
                <div className="flex min-h-52 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      No analysis yet
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Enter feedback on the left and select
                      “Analyze with AI”.
                    </p>
                  </div>
                </div>
              ) : null}

              {loading ? (
                <div className="space-y-4">
                  <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
                  <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
                  <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
                </div>
              ) : null}

              {analysis ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Sentiment
                      </p>

                      <p className="mt-2 text-lg font-semibold">
                        {getSentimentLabel(
                          analysis.sentiment
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Score
                      </p>

                      <p className="mt-2 text-lg font-semibold">
                        {analysis.sentimentScore}%
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Confidence
                      </p>

                      <p className="mt-2 text-lg font-semibold">
                        {analysis.confidence}%
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Feature area
                    </p>

                    <p className="mt-2 text-sm font-semibold text-slate-800">
                      {analysis.featureArea}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Themes
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {analysis.themes.map((theme) => (
                        <span
                          key={theme}
                          className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700"
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Signals
                    </p>

                    <ul className="mt-3 space-y-2">
                      {analysis.signals.map((signal) => (
                        <li
                          key={signal}
                          className="text-sm leading-6 text-slate-600"
                        >
                          • {signal}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Explanation
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {analysis.explanation}
                    </p>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}