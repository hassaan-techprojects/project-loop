"use client";

import { ChangeEvent, useState } from "react";

type CsvRow = {
  id: number;
  feedback: string;
};

type CsvUploaderProps = {
  onRowsLoaded: (rows: CsvRow[]) => void;
};

function parseCsvText(text: string): string[] {
  const rows: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (character === '"') {
      if (insideQuotes && text[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }

      continue;
    }

    if (character === "\n" && !insideQuotes) {
      rows.push(current.trim());
      current = "";
      continue;
    }

    if (character !== "\r") {
      current += character;
    }
  }

  if (current.trim()) {
    rows.push(current.trim());
  }

  return rows;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (insideQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }

      continue;
    }

    if (character === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current.trim());

  return values;
}

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/^\uFEFF/, "")
    .replace(/[\s_-]+/g, "");
}

function findFeedbackColumn(headers: string[]): number {
  const possibleNames = [
    "feedback",
    "comment",
    "comments",
    "review",
    "message",
    "content",
    "text",
    "customerfeedback",
  ];

  return headers.findIndex((header) =>
    possibleNames.includes(normalizeHeader(header))
  );
}

export default function CsvUploader({ onRowsLoaded }: CsvUploaderProps) {
  const [fileName, setFileName] = useState("");
  const [rowCount, setRowCount] = useState(0);
  const [error, setError] = useState("");

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setFileName("");
    setRowCount(0);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please select a CSV file.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("CSV file must be smaller than 5 MB.");
      event.target.value = "";
      return;
    }

    try {
      const text = await file.text();
      const lines = parseCsvText(text);

      if (lines.length < 2) {
        throw new Error(
          "The CSV file must contain a header row and at least one feedback row."
        );
      }

      const headers = parseCsvLine(lines[0] ?? "");
      const feedbackColumn = findFeedbackColumn(headers);

      if (feedbackColumn === -1) {
        throw new Error(
          'The CSV must contain a feedback column such as "feedback", "comment", "review", "message", or "text".'
        );
      }

      const rows: CsvRow[] = [];

      for (let index = 1; index < lines.length; index += 1) {
        const line = lines[index];

        if (!line?.trim()) {
          continue;
        }

        const values = parseCsvLine(line);
        const feedback = values[feedbackColumn]?.trim() ?? "";

        if (!feedback) {
          continue;
        }

        rows.push({
          id: rows.length + 1,
          feedback,
        });
      }

      if (rows.length === 0) {
        throw new Error("No feedback rows were found in the CSV file.");
      }

      onRowsLoaded(rows);
      setFileName(file.name);
      setRowCount(rows.length);
    } catch (parseError) {
      setError(
        parseError instanceof Error
          ? parseError.message
          : "Failed to read the CSV file."
      );

      onRowsLoaded([]);
    }

    event.target.value = "";
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">CSV upload</h2>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          Upload a CSV containing customer feedback. LOOP will read the
          feedback rows and prepare them for AI analysis.
        </p>
      </div>

      <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 text-center transition hover:border-violet-300 hover:bg-violet-50/40">
        <span className="text-sm font-semibold text-slate-700">
          Choose a CSV file
        </span>

        <span className="mt-1 text-xs text-slate-400">
          Maximum file size: 5 MB
        </span>

        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFileChange}
        />
      </label>

      {fileName && !error ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm font-semibold text-emerald-800">
            {fileName}
          </p>

          <p className="mt-1 text-xs text-emerald-700">
            {rowCount} feedback {rowCount === 1 ? "row" : "rows"} loaded.
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}