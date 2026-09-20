"use client";

type FeedbackAnalysis = {
  sentiment: "POS" | "NEU" | "NEG";
  sentimentScore: number;
  confidence: number;
  themes: string[];
  featureArea: string;
  signals: string[];
  explanation: string;
};

type ExportableAnalysis = {
  id: number;
  feedback: string;
  analysis: FeedbackAnalysis;
};

type ExportAnalysisButtonProps = {
  results: ExportableAnalysis[];
};

function escapeCsvValue(value: string | number) {
  const text = String(value);

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n") ||
    text.includes("\r")
  ) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
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

export default function ExportAnalysisButton({
  results,
}: ExportAnalysisButtonProps) {
  function exportCsv() {
    if (results.length === 0) {
      return;
    }

    const headers = [
      "Feedback",
      "Sentiment",
      "Sentiment Score",
      "Confidence",
      "Feature Area",
      "Themes",
      "Signals",
      "Explanation",
    ];

    const rows = results.map((result) => [
      result.feedback,
      getSentimentLabel(result.analysis.sentiment),
      result.analysis.sentimentScore,
      result.analysis.confidence,
      result.analysis.featureArea,
      result.analysis.themes.join("; "),
      result.analysis.signals.join("; "),
      result.analysis.explanation,
    ]);

    const csvContent = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map((value) => escapeCsvValue(value))
          .join(",")
      )
      .join("\r\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = `loop-feedback-analysis-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={exportCsv}
      disabled={results.length === 0}
      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-violet-300 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      Export CSV
    </button>
  );
}