"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

type CsvPreviewRow = {
  content: string;
  channel: string;
  customerLabel: string;
  sourceRef: string;
};

type SessionResponse = {
  user?: {
    id?: string;
    name?: string | null;
    role?: "ADMIN" | "ANALYST" | "VIEWER";
    workspaceId?: string;
  } | null;
};

function parseCsvLine(line: string) {
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

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function parseCsvPreview(csvText: string): CsvPreviewRow[] {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error(
      "The CSV must contain a header row and at least one feedback row."
    );
  }

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);

  const contentIndex = headers.indexOf("content");
  const channelIndex = headers.indexOf("channel");
  const customerIndex = headers.indexOf("customerlabel");
  const sourceIndex = headers.indexOf("sourceref");

  if (contentIndex === -1) {
    throw new Error('The CSV must contain a "content" column.');
  }

  if (channelIndex === -1) {
    throw new Error('The CSV must contain a "channel" column.');
  }

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);

    const content = values[contentIndex]?.trim() ?? "";
    const channel = values[channelIndex]?.trim() ?? "";
    const customerLabel =
      customerIndex === -1 ? "" : values[customerIndex]?.trim() ?? "";
    const sourceRef =
      sourceIndex === -1 ? "" : values[sourceIndex]?.trim() ?? "";

    if (!content) {
      throw new Error(`Row ${index + 2} is missing feedback content.`);
    }

    if (!channel) {
      throw new Error(`Row ${index + 2} is missing a channel.`);
    }

    return {
      content,
      channel,
      customerLabel,
      sourceRef,
    };
  });
}

function truncateText(value: string, length = 90) {
  if (value.length <= length) {
    return value;
  }

  return `${value.slice(0, length)}...`;
}

function formatChannel(channel: string) {
  return channel
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function ImportFeedbackPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<CsvPreviewRow[]>([]);
  const [fileError, setFileError] = useState("");
  const [importError, setImportError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [role, setRole] = useState<
    "ADMIN" | "ANALYST" | "VIEWER" | null
  >(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  const canImport = role === "ADMIN" || role === "ANALYST";

  const previewCountLabel = useMemo(() => {
    if (previewRows.length === 1) {
      return "1 feedback item ready to import";
    }

    return `${previewRows.length} feedback items ready to import`;
  }, [previewRows.length]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;

    setFileError("");
    setImportError("");
    setSuccessMessage("");
    setPreviewRows([]);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setFile(null);
      setFileError("Please select a CSV file.");
      return;
    }

    if (selectedFile.size === 0) {
      setFile(null);
      setFileError("The selected CSV file is empty.");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setFile(null);
      setFileError("CSV files must be 5 MB or smaller.");
      return;
    }

    try {
      setLoadingPreview(true);

      const csvText = await selectedFile.text();
      const rows = parseCsvPreview(csvText);

      if (rows.length > 500) {
        throw new Error(
          "A maximum of 500 feedback rows can be imported at once."
        );
      }

      setFile(selectedFile);
      setPreviewRows(rows);
    } catch (error) {
      setFile(null);
      setFileError(
        error instanceof Error
          ? error.message
          : "Failed to read the CSV file."
      );
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleImport() {
    if (!file || previewRows.length === 0) {
      setImportError("Please select a valid CSV file first.");
      return;
    }

    setImportError("");
    setSuccessMessage("");
    setImporting(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/feedback/import", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as {
        message?: string;
        importedCount?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to import feedback.");
      }

      setSuccessMessage(
        `${data.importedCount ?? previewRows.length} feedback items imported successfully.`
      );

      setFile(null);
      setPreviewRows([]);

      const fileInput = document.getElementById(
        "csv-file"
      ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "Failed to import feedback."
      );
    } finally {
      setImporting(false);
    }
  }

  function clearSelection() {
    setFile(null);
    setPreviewRows([]);
    setFileError("");
    setImportError("");
    setSuccessMessage("");

    const fileInput = document.getElementById(
      "csv-file"
    ) as HTMLInputElement | null;

    if (fileInput) {
      fileInput.value = "";
    }
  }

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
        });

        const data = response.ok
          ? ((await response.json()) as SessionResponse)
          : null;

        if (cancelled) {
          return;
        }

        setRole(data?.user?.role ?? null);
        setSessionLoading(false);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("Import page session error:", error);
        setRole(null);
        setSessionLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  if (sessionLoading) {
    return (
      <section className="min-h-[calc(100vh-3.5rem)] bg-[#030712] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="h-6 w-44 animate-pulse rounded bg-slate-800" />
          <div className="mt-3 h-4 w-80 animate-pulse rounded bg-slate-900" />
          <div className="mt-8 h-48 animate-pulse rounded-xl border border-slate-800 bg-[#080d18]" />
        </div>
      </section>
    );
  }

  if (!canImport) {
    return (
      <section className="min-h-[calc(100vh-3.5rem)] bg-[#030712] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-xl border border-slate-800 bg-[#080d18] p-6">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Import Feedback
            </p>

            <h1 className="mt-3 text-2xl font-semibold text-white">
              Access restricted
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
              Only workspace admins and analysts can import customer
              feedback.
            </p>

            <Link
              href="/feedback"
              className="mt-6 inline-flex rounded-md border border-slate-700 px-4 py-2 text-xs font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-900"
            >
              Back to Feedback
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-[calc(100vh-3.5rem)] bg-[#030712] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Feedback ingestion
            </p>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Import Feedback
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Upload customer feedback from a CSV file, review the data, and
              import it into your workspace.
            </p>
          </div>

          <Link
            href="/feedback"
            className="inline-flex w-fit items-center rounded-md border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-900 hover:text-white"
          >
            View All Feedback
          </Link>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="rounded-xl border border-slate-800 bg-[#080d18] p-5 sm:p-6">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Upload CSV
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Required columns:{" "}
                <span className="text-slate-300">content</span> and{" "}
                <span className="text-slate-300">channel</span>. Optional
                columns:{" "}
                <span className="text-slate-300">customerLabel</span> and{" "}
                <span className="text-slate-300">sourceRef</span>.
              </p>
            </div>

            <label
              htmlFor="csv-file"
              className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-[#050914] px-6 py-10 text-center transition hover:border-slate-600 hover:bg-[#070c16]"
            >
              <span className="text-sm font-medium text-slate-200">
                {file ? file.name : "Choose a CSV file"}
              </span>

              <span className="mt-2 text-xs text-slate-500">
                CSV files up to 5 MB · Maximum 500 rows
              </span>

              <span className="mt-5 rounded-md border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300">
                Browse Files
              </span>

              <input
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={handleFileChange}
              />
            </label>

            {loadingPreview && (
              <p className="mt-4 text-xs text-slate-500">
                Reading CSV and preparing preview...
              </p>
            )}

            {fileError && (
              <div className="mt-4 rounded-md border border-red-900/60 bg-red-950/20 px-4 py-3 text-xs text-red-300">
                {fileError}
              </div>
            )}

            {importError && (
              <div className="mt-4 rounded-md border border-red-900/60 bg-red-950/20 px-4 py-3 text-xs text-red-300">
                {importError}
              </div>
            )}

            {successMessage && (
              <div className="mt-4 rounded-md border border-emerald-900/60 bg-emerald-950/20 px-4 py-3 text-xs text-emerald-300">
                {successMessage}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#080d18] p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-white">
              Import workflow
            </h2>

            <div className="mt-5 space-y-5">
              <div>
                <p className="text-xs font-medium text-slate-300">
                  01 · Upload
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Select a CSV containing your customer feedback.
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-300">
                  02 · Review
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Check the imported rows before sending them to LOOP.
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-300">
                  03 · Import
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Confirm the import and add the feedback to your workspace.
                </p>
              </div>
            </div>
          </div>
        </div>

        {previewRows.length > 0 && (
          <div className="mt-6 overflow-hidden rounded-xl border border-slate-800 bg-[#080d18]">
            <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  CSV Preview
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {previewCountLabel}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={importing}
                  className="rounded-md border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={handleImport}
                  disabled={importing}
                  className="rounded-md bg-white px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {importing ? "Importing..." : "Import Feedback"}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="border-b border-slate-800 bg-[#070b14]">
                  <tr>
                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:px-6">
                      Feedback
                    </th>

                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Channel
                    </th>

                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Customer
                    </th>

                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Source
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {previewRows.slice(0, 10).map((row, index) => (
                    <tr key={`${row.content}-${index}`}>
                      <td className="max-w-md px-5 py-4 text-xs leading-5 text-slate-300 sm:px-6">
                        {truncateText(row.content)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-400">
                        {formatChannel(row.channel)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-400">
                        {row.customerLabel || "—"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                        {row.sourceRef || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {previewRows.length > 10 && (
              <div className="border-t border-slate-800 px-5 py-3 text-xs text-slate-500 sm:px-6">
                Showing the first 10 rows of {previewRows.length}. All
                validated rows will be imported.
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}