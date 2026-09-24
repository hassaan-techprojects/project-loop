"use client";

import Link from "next/link";
import {
  ChangeEvent,
  useMemo,
  useState,
} from "react";

type Sentiment = "POS" | "NEU" | "NEG";

type FeedbackRow = {
  content: string;
  customerLabel: string;
  channel: string;
  sentiment: Sentiment | "";
  theme: string;
  sourceRef: string;
};

type Theme = {
  id: string;
  name: string;
  isActive: boolean;
};

type Channel = {
  id: string;
  name: string;
  isActive: boolean;
};

type OptionsResponse = {
  themes?: Theme[];
  channels?: Channel[];
  error?: string;
};

type SessionResponse = {
  user?: {
    id?: string;
    name?: string | null;
    role?: "ADMIN" | "ANALYST" | "VIEWER";
    workspaceId?: string;
  } | null;
};

const PAGE_SIZE = 10;

const SENTIMENT_OPTIONS: Array<{
  value: Sentiment;
  label: string;
}> = [
  {
    value: "POS",
    label: "Positive",
  },
  {
    value: "NEU",
    label: "Neutral",
  },
  {
    value: "NEG",
    label: "Negative",
  },
];

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function parseCsvRecords(csvText: string): string[][] {
  const records: string[][] = [];
  let currentRecord: string[] = [];
  let currentValue = "";
  let insideQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index];

    if (character === '"') {
      if (
        insideQuotes &&
        csvText[index + 1] === '"'
      ) {
        currentValue += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }

      continue;
    }

    if (character === "," && !insideQuotes) {
      currentRecord.push(currentValue.trim());
      currentValue = "";
      continue;
    }

    if (character === "\n" && !insideQuotes) {
      currentRecord.push(currentValue.trim());
      currentValue = "";

      if (
        currentRecord.some(
          (value) => value.trim() !== "",
        )
      ) {
        records.push(currentRecord);
      }

      currentRecord = [];
      continue;
    }

    if (
      character === "\r" &&
      csvText[index + 1] === "\n" &&
      !insideQuotes
    ) {
      continue;
    }

    currentValue += character;
  }

  currentRecord.push(currentValue.trim());

  if (
    currentRecord.some(
      (value) => value.trim() !== "",
    )
  ) {
    records.push(currentRecord);
  }

  return records;
}

function findColumnIndex(
  headers: string[],
  aliases: string[],
) {
  const normalizedAliases = aliases.map(
    normalizeHeader,
  );

  return headers.findIndex((header) =>
    normalizedAliases.includes(header),
  );
}

function parseCsvPreview(
  csvText: string,
): FeedbackRow[] {
  const records = parseCsvRecords(
    csvText.replace(/^\uFEFF/, ""),
  );

  if (records.length < 2) {
    throw new Error(
      "The CSV must contain a header row and at least one feedback row.",
    );
  }

  const headers = records[0].map(
    normalizeHeader,
  );

  /*
   * Silent automatic column detection.
   *
   * There is intentionally NO Column Mapping UI.
   */
  const contentIndex = findColumnIndex(headers, [
    "content",
    "feedback",
    "feedbackcontent",
    "feedbacktext",
    "comment",
    "comments",
    "message",
    "review",
    "text",
  ]);

  const customerIndex = findColumnIndex(
    headers,
    [
      "customerlabel",
      "customer",
      "customername",
      "respondent",
      "respondentname",
      "username",
      "user",
    ],
  );

  const channelIndex = findColumnIndex(
    headers,
    [
      "channel",
      "feedbackchannel",
      "platform",
      "medium",
    ],
  );

  const sentimentIndex = findColumnIndex(
    headers,
    [
      "sentiment",
      "sentimentlabel",
      "sentimentcategory",
      "mood",
    ],
  );

  const themeIndex = findColumnIndex(headers, [
    "theme",
    "themename",
    "category",
    "topic",
  ]);

  const sourceRefIndex = findColumnIndex(
    headers,
    [
      "sourceref",
      "sourcereference",
      "reference",
      "ticket",
      "ticketid",
    ],
  );

  return records
    .slice(1)
    .map((values) => {
      const sentimentValue =
        values[sentimentIndex]
          ?.trim()
          .toUpperCase() ?? "";

      const sentiment: Sentiment | "" =
        sentimentValue === "POS" ||
        sentimentValue === "POSITIVE"
          ? "POS"
          : sentimentValue === "NEU" ||
              sentimentValue === "NEUTRAL"
            ? "NEU"
            : sentimentValue === "NEG" ||
                sentimentValue === "NEGATIVE"
              ? "NEG"
              : "";

      return {
        content:
          contentIndex === -1
            ? ""
            : values[contentIndex]?.trim() ?? "",

        customerLabel:
          customerIndex === -1
            ? ""
            : values[customerIndex]?.trim() ?? "",

        channel:
          channelIndex === -1
            ? ""
            : values[channelIndex]?.trim() ?? "",

        sentiment,

        theme:
          themeIndex === -1
            ? ""
            : values[themeIndex]?.trim() ?? "",

        sourceRef:
          sourceRefIndex === -1
            ? ""
            : values[sourceRefIndex]?.trim() ?? "",
      };
    });
}

function getRowIssues(
  row: FeedbackRow,
  activeChannels: Channel[],
  activeThemes: Theme[],
) {
  const issues: string[] = [];

  if (!row.content.trim()) {
    issues.push("Feedback Content");
  }

  if (!row.customerLabel.trim()) {
    issues.push("Customer Label");
  }

  if (!row.channel.trim()) {
    issues.push("Channel");
  } else if (
    !activeChannels.some(
      (channel) =>
        channel.name === row.channel.trim(),
    )
  ) {
    issues.push("Channel");
  }

  if (!row.sentiment) {
    issues.push("Sentiment");
  }

  if (!row.theme.trim()) {
    issues.push("Theme");
  } else if (
    !activeThemes.some(
      (theme) =>
        theme.name === row.theme.trim(),
    )
  ) {
    issues.push("Theme");
  }

  return issues;
}

function sentimentLabel(
  sentiment: Sentiment | "",
) {
  if (sentiment === "POS") {
    return "Positive";
  }

  if (sentiment === "NEU") {
    return "Neutral";
  }

  if (sentiment === "NEG") {
    return "Negative";
  }

  return "Missing";
}

function formatChannel(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

function truncateText(
  value: string,
  length = 90,
) {
  if (value.length <= length) {
    return value;
  }

  return `${value.slice(0, length)}...`;
}

export default function ImportFeedbackPage() {
  const [file, setFile] =
    useState<File | null>(null);

  const [rows, setRows] = useState<FeedbackRow[]>(
    [],
  );

  const [themes, setThemes] = useState<Theme[]>(
    [],
  );

  const [channels, setChannels] = useState<
    Channel[]
  >([]);

  const [activeRowIndex, setActiveRowIndex] =
    useState<number | null>(null);

  const [currentPage, setCurrentPage] =
    useState(1);

  const [fileError, setFileError] =
    useState("");

  const [importError, setImportError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [optionsLoading, setOptionsLoading] =
    useState(false);

  const [previewLoading, setPreviewLoading] =
    useState(false);

  const [importing, setImporting] =
    useState(false);

  const [role, setRole] = useState<
    "ADMIN" | "ANALYST" | "VIEWER" | null
  >(null);

  const [sessionLoading, setSessionLoading] =
    useState(true);

  const canImport =
    role === "ADMIN" || role === "ANALYST";

  const activeThemes = useMemo(
    () =>
      themes.filter(
        (theme) => theme.isActive,
      ),
    [themes],
  );

  const activeChannels = useMemo(
    () =>
      channels.filter(
        (channel) => channel.isActive,
      ),
    [channels],
  );

  const totalPages = Math.max(
    1,
    Math.ceil(rows.length / PAGE_SIZE),
  );

  const pageStart =
    (currentPage - 1) * PAGE_SIZE;

  const pageRows = rows.slice(
    pageStart,
    pageStart + PAGE_SIZE,
  );

  const correctionCount = useMemo(
    () =>
      rows.filter(
        (row) =>
          getRowIssues(
            row,
            activeChannels,
            activeThemes,
          ).length > 0,
      ).length,
    [rows, activeChannels, activeThemes],
  );

  const canSubmitImport =
    rows.length > 0 &&
    correctionCount === 0 &&
    !importing &&
    !optionsLoading;

  const activeRow =
    activeRowIndex !== null
      ? rows[activeRowIndex] ?? null
      : null;

  const activeRowIssues = activeRow
    ? getRowIssues(
        activeRow,
        activeChannels,
        activeThemes,
      )
    : [];

  async function loadWorkspaceOptions() {
    try {
      setOptionsLoading(true);
      setImportError("");

      const response = await fetch(
  "/api/themes-channels",
  {
    method: "GET",
    cache: "no-store",
  },
);

      const contentType =
        response.headers.get(
          "content-type",
        ) ?? "";

      let data: OptionsResponse = {};

      if (
        contentType.includes(
          "application/json",
        )
      ) {
        data =
          (await response.json()) as OptionsResponse;
      }

      if (!response.ok) {
        throw new Error(
          data.error ??
            `Unable to load workspace options (${response.status}).`,
        );
      }

      const loadedThemes =
        data.themes ?? [];

      const loadedChannels =
        data.channels ?? [];

      setThemes(loadedThemes);
      setChannels(loadedChannels);

      return {
        themes: loadedThemes,
        channels: loadedChannels,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to load workspace themes and channels.";

      setImportError(message);

      return null;
    } finally {
      setOptionsLoading(false);
    }
  }

  async function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFile =
      event.target.files?.[0] ?? null;

    setFileError("");
    setImportError("");
    setSuccessMessage("");
    setRows([]);
    setActiveRowIndex(null);
    setCurrentPage(1);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (
      !selectedFile.name
        .toLowerCase()
        .endsWith(".csv")
    ) {
      setFile(null);
      setFileError(
        "Please select a CSV file.",
      );
      return;
    }

    if (selectedFile.size === 0) {
      setFile(null);
      setFileError(
        "The selected CSV file is empty.",
      );
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setFile(null);
      setFileError(
        "CSV files must be 5 MB or smaller.",
      );
      return;
    }

    try {
      setPreviewLoading(true);

      const csvText =
        await selectedFile.text();

      const parsedRows =
        parseCsvPreview(csvText);

      if (parsedRows.length > 500) {
        throw new Error(
          "A maximum of 500 feedback rows can be imported at once.",
        );
      }

      let loadedOptions: {
        themes: Theme[];
        channels: Channel[];
      } | null = {
        themes,
        channels,
      };

      if (
        loadedOptions.themes.length === 0 &&
        loadedOptions.channels.length === 0
      ) {
        loadedOptions =
          await loadWorkspaceOptions();
      }

      if (!loadedOptions) {
        /*
         * The CSV is still accepted and displayed.
         * The user can retry loading workspace options.
         */
        setFile(selectedFile);
        setRows(parsedRows);
        return;
      }

      const correctedInitialRows =
        parsedRows.map((row) => {
          const validChannel =
            loadedOptions!.channels.some(
              (channel) =>
                channel.isActive &&
                channel.name ===
                  row.channel.trim(),
            );

          const validTheme =
            loadedOptions!.themes.some(
              (theme) =>
                theme.isActive &&
                theme.name ===
                  row.theme.trim(),
            );

          return {
            ...row,
            channel: validChannel
              ? row.channel.trim()
              : "",
            theme: validTheme
              ? row.theme.trim()
              : "",
          };
        });

      setFile(selectedFile);
      setRows(correctedInitialRows);

      const firstInvalidIndex =
        correctedInitialRows.findIndex(
          (row) =>
            getRowIssues(
              row,
              loadedOptions!.channels.filter(
                (channel) =>
                  channel.isActive,
              ),
              loadedOptions!.themes.filter(
                (theme) =>
                  theme.isActive,
              ),
            ).length > 0,
        );

      if (firstInvalidIndex !== -1) {
        setActiveRowIndex(
          firstInvalidIndex,
        );

        setCurrentPage(
          Math.floor(
            firstInvalidIndex /
              PAGE_SIZE,
          ) + 1,
        );
      }
    } catch (error) {
      setFile(null);

      setFileError(
        error instanceof Error
          ? error.message
          : "Failed to read the CSV file.",
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  function updateRow(
    rowIndex: number,
    field: keyof FeedbackRow,
    value: string,
  ) {
    setRows((currentRows) =>
      currentRows.map((row, index) => {
        if (index !== rowIndex) {
          return row;
        }

        if (field === "sentiment") {
          return {
            ...row,
            sentiment:
              value === "POS" ||
              value === "NEU" ||
              value === "NEG"
                ? value
                : "",
          };
        }

        return {
          ...row,
          [field]: value,
        };
      }),
    );

    setImportError("");
  }

  function openCorrection(
    rowIndex: number,
  ) {
    setActiveRowIndex(rowIndex);

    setCurrentPage(
      Math.floor(rowIndex / PAGE_SIZE) + 1,
    );

    window.setTimeout(() => {
      document
        .getElementById(
          "correction-panel",
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  }

  function closeCorrection() {
    setActiveRowIndex(null);
  }

  function goToPreviousPage() {
    setCurrentPage((page) =>
      Math.max(1, page - 1),
    );

    setActiveRowIndex(null);
  }

  function goToNextPage() {
    setCurrentPage((page) =>
      Math.min(totalPages, page + 1),
    );

    setActiveRowIndex(null);
  }

  async function handleImport() {
    if (!file || rows.length === 0) {
      setImportError(
        "Please select a valid CSV file first.",
      );
      return;
    }

    const invalidIndex = rows.findIndex(
      (row) =>
        getRowIssues(
          row,
          activeChannels,
          activeThemes,
        ).length > 0,
    );

    if (invalidIndex !== -1) {
      const invalidRow = rows[invalidIndex];

      const issues = getRowIssues(
        invalidRow,
        activeChannels,
        activeThemes,
      );

      setCurrentPage(
        Math.floor(
          invalidIndex / PAGE_SIZE,
        ) + 1,
      );

      setActiveRowIndex(invalidIndex);

      setImportError(
        `Row ${
          invalidIndex + 1
        } still needs: ${issues.join(", ")}.`,
      );

      window.setTimeout(() => {
        document
          .getElementById(
            "correction-panel",
          )
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 50);

      return;
    }

    setImportError("");
    setSuccessMessage("");
    setImporting(true);

    try {
      const corrections = rows.map(
        (row, rowIndex) => ({
          rowIndex,
          content: row.content.trim(),
          customerLabel:
            row.customerLabel.trim(),
          channel: row.channel.trim(),
          sentiment: row.sentiment,
          themeName: row.theme.trim(),
          sourceRef:
            row.sourceRef.trim(),
        }),
      );

      const formData =
        new FormData();

      formData.append(
        "file",
        file,
      );

      formData.append(
        "corrections",
        JSON.stringify(
          corrections,
        ),
      );

      const response = await fetch(
        "/api/feedback/import",
        {
          method: "POST",
          body: formData,
        },
      );

      const contentType =
        response.headers.get(
          "content-type",
        ) ?? "";

      let data: {
        message?: string;
        importedCount?: number;
        error?: string;
      } = {};

      if (
        contentType.includes(
          "application/json",
        )
      ) {
        data =
          (await response.json()) as {
            message?: string;
            importedCount?: number;
            error?: string;
          };
      }

      if (!response.ok) {
        throw new Error(
          data.error ??
            `Import failed (${response.status}).`,
        );
      }

      setSuccessMessage(
        `${
          data.importedCount ??
          rows.length
        } feedback items imported successfully.`,
      );

      setFile(null);
      setRows([]);
      setActiveRowIndex(null);
      setCurrentPage(1);

      const fileInput =
        document.getElementById(
          "csv-file",
        ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "Failed to import feedback.",
      );
    } finally {
      setImporting(false);
    }
  }

  function clearSelection() {
    setFile(null);
    setRows([]);
    setActiveRowIndex(null);
    setCurrentPage(1);
    setFileError("");
    setImportError("");
    setSuccessMessage("");

    const fileInput =
      document.getElementById(
        "csv-file",
      ) as HTMLInputElement | null;

    if (fileInput) {
      fileInput.value = "";
    }
  }

  async function retryWorkspaceOptions() {
    const options =
      await loadWorkspaceOptions();

    if (!options || !file) {
      return;
    }

    setRows((currentRows) =>
      currentRows.map((row) => {
        const validChannel =
          options.channels.some(
            (channel) =>
              channel.isActive &&
              channel.name ===
                row.channel.trim(),
          );

        const validTheme =
          options.themes.some(
            (theme) =>
              theme.isActive &&
              theme.name ===
                row.theme.trim(),
          );

        return {
          ...row,
          channel: validChannel
            ? row.channel.trim()
            : "",
          theme: validTheme
            ? row.theme.trim()
            : "",
        };
      }),
    );
  }

  useMemo(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  /*
   * Session / permissions.
   */
  useMemo(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch(
          "/api/auth/session",
          {
            cache: "no-store",
          },
        );

        const data = response.ok
          ? ((await response.json()) as SessionResponse)
          : null;

        if (cancelled) {
          return;
        }

        setRole(
          data?.user?.role ?? null,
        );
      } catch {
        if (!cancelled) {
          setRole(null);
        }
      } finally {
        if (!cancelled) {
          setSessionLoading(false);
        }
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  if (sessionLoading) {
    return (
      <section className="min-h-[calc(100vh-3.5rem)] bg-[#030712] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="h-7 w-52 animate-pulse rounded bg-slate-800" />

          <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-slate-900" />

          <div className="mt-8 h-64 animate-pulse rounded-2xl border border-slate-800 bg-[#080d18]" />
        </div>
      </section>
    );
  }

  if (!canImport) {
    return (
      <section className="min-h-[calc(100vh-3.5rem)] bg-[#030712] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-slate-800 bg-[#080d18] p-6 sm:p-8">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Import Feedback
            </p>

            <h1 className="mt-3 text-2xl font-semibold text-white">
              Access restricted
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
              Only workspace admins and
              analysts can import customer
              feedback.
            </p>

            <Link
              href="/feedback"
              className="mt-6 inline-flex rounded-lg border border-slate-700 px-4 py-2.5 text-xs font-medium text-slate-200 transition hover:bg-slate-900"
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
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 border-b border-slate-800 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Feedback ingestion
            </p>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Import Feedback
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Upload a CSV, review every row,
              complete any missing information,
              and import only fully valid feedback.
            </p>
          </div>

          <Link
            href="/feedback"
            className="inline-flex w-fit items-center rounded-lg border border-slate-700 px-4 py-2.5 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-900 hover:text-white"
          >
            View All Feedback
          </Link>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="rounded-2xl border border-slate-800 bg-[#080d18] p-5 sm:p-7">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Upload CSV
              </h2>

              <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">
                LOOP automatically detects common
                column names. There is no column
                mapping step.
              </p>
            </div>

            <label
              htmlFor="csv-file"
              className="mt-6 flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-[#050914] px-6 py-10 text-center transition hover:border-slate-500 hover:bg-[#070c16]"
            >
              <span className="text-sm font-medium text-slate-200">
                {file
                  ? file.name
                  : "Choose a CSV file"}
              </span>

              <span className="mt-2 text-xs text-slate-500">
                CSV up to 5 MB · Maximum 500 rows
              </span>

              <span className="mt-5 rounded-lg border border-slate-700 px-5 py-2.5 text-xs font-medium text-slate-300">
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

            {previewLoading && (
              <p className="mt-4 text-xs text-slate-500">
                Reading CSV and preparing
                preview...
              </p>
            )}

            {optionsLoading && (
              <p className="mt-2 text-xs text-slate-500">
                Loading active workspace channels
                and themes...
              </p>
            )}

            {fileError && (
              <div className="mt-4 rounded-lg border border-red-900/60 bg-red-950/20 px-4 py-3 text-xs leading-5 text-red-300">
                {fileError}
              </div>
            )}

            {importError && (
              <div className="mt-4 rounded-lg border border-red-900/60 bg-red-950/20 px-4 py-3 text-xs leading-5 text-red-300">
                <div>{importError}</div>

                {importError
                  .toLowerCase()
                  .includes(
                    "workspace",
                  ) && (
                  <button
                    type="button"
                    onClick={
                      retryWorkspaceOptions
                    }
                    disabled={
                      optionsLoading
                    }
                    className="mt-3 rounded-md border border-red-800 px-3 py-2 text-xs font-medium text-red-200 transition hover:bg-red-950/40 disabled:opacity-50"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}

            {successMessage && (
              <div className="mt-4 rounded-lg border border-emerald-900/60 bg-emerald-950/20 px-4 py-3 text-xs leading-5 text-emerald-300">
                {successMessage}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#080d18] p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-white">
              Import workflow
            </h2>

            <div className="mt-6 space-y-6">
              <div>
                <p className="text-xs font-semibold text-slate-300">
                  01 · Upload
                </p>

                <p className="mt-1.5 text-xs leading-5 text-slate-500">
                  Select your CSV file.
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-300">
                  02 · Review
                </p>

                <p className="mt-1.5 text-xs leading-5 text-slate-500">
                  LOOP detects missing or invalid
                  required fields automatically.
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-300">
                  03 · Correct
                </p>

                <p className="mt-1.5 text-xs leading-5 text-slate-500">
                  Complete Content, Customer,
                  Channel, Sentiment, and Theme.
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-300">
                  04 · Import
                </p>

                <p className="mt-1.5 text-xs leading-5 text-slate-500">
                  Import is enabled only when every
                  row is complete.
                </p>
              </div>
            </div>
          </div>
        </div>

        {rows.length > 0 && (
          <div className="mt-7 overflow-hidden rounded-2xl border border-slate-800 bg-[#080d18]">
            <div className="flex flex-col gap-4 border-b border-slate-800 px-5 py-5 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  CSV Preview
                </h2>

                <p className="mt-1.5 text-xs text-slate-500">
                  {rows.length}{" "}
                  {rows.length === 1
                    ? "feedback item"
                    : "feedback items"}{" "}
                  · Page {currentPage} of{" "}
                  {totalPages}
                </p>

                {correctionCount > 0 && (
                  <p className="mt-1.5 text-xs text-amber-400">
                    {correctionCount}{" "}
                    {correctionCount === 1
                      ? "row needs"
                      : "rows need"}{" "}
                    correction.
                  </p>
                )}

                {correctionCount === 0 && (
                  <p className="mt-1.5 text-xs text-emerald-400">
                    All rows are complete and ready
                    to import.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={importing}
                  className="rounded-lg border border-slate-700 px-4 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={handleImport}
                  disabled={!canSubmitImport}
                  className="rounded-lg bg-white px-5 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {importing
                    ? "Importing..."
                    : "Import Feedback"}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[1050px] w-full text-left">
                <thead className="border-b border-slate-800 bg-[#070b14]">
                  <tr>
                    <th className="w-16 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:px-7">
                      #
                    </th>

                    <th className="min-w-[280px] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Feedback
                    </th>

                    <th className="min-w-[160px] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Customer
                    </th>

                    <th className="min-w-[130px] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Channel
                    </th>

                    <th className="min-w-[120px] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Sentiment
                    </th>

                    <th className="min-w-[150px] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Theme
                    </th>

                    <th className="w-24 px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Fix
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {pageRows.map(
                    (
                      row,
                      pageIndex,
                    ) => {
                      const rowIndex =
                        pageStart +
                        pageIndex;

                      const issues =
                        getRowIssues(
                          row,
                          activeChannels,
                          activeThemes,
                        );

                      const valid =
                        issues.length ===
                        0;

                      const isActive =
                        activeRowIndex ===
                        rowIndex;

                      return (
                        <tr
                          key={`${rowIndex}-${row.content}`}
                          className={
                            isActive
                              ? "bg-[#0a101d]"
                              : "align-top"
                          }
                        >
                          <td className="px-5 py-4 text-xs text-slate-500 sm:px-7">
                            {rowIndex + 1}
                          </td>

                          <td className="px-5 py-4 text-xs leading-5 text-slate-300">
                            {row.content ? (
                              truncateText(
                                row.content,
                                110,
                              )
                            ) : (
                              <span className="text-red-400">
                                Missing
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-xs text-slate-400">
                            {row.customerLabel ? (
                              truncateText(
                                row.customerLabel,
                                32,
                              )
                            ) : (
                              <span className="text-red-400">
                                Missing
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-xs text-slate-400">
                            {row.channel ? (
                              formatChannel(
                                row.channel,
                              )
                            ) : (
                              <span className="text-red-400">
                                Missing
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-xs text-slate-400">
                            {sentimentLabel(
                              row.sentiment,
                            )}
                          </td>

                          <td className="px-5 py-4 text-xs text-slate-400">
                            {row.theme ? (
                              truncateText(
                                row.theme,
                                32,
                              )
                            ) : (
                              <span className="text-red-400">
                                Missing
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">
                            {valid ? (
                              <span className="text-xs font-medium text-emerald-400">
                                Ready
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  openCorrection(
                                    rowIndex,
                                  )
                                }
                                className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-slate-700 px-2 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-900"
                                aria-label={`Correct row ${rowIndex + 1}`}
                                title="Correct this row"
                              >
                                Fix
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <p className="text-xs text-slate-500">
                Showing{" "}
                {pageStart + 1}–
                {Math.min(
                  pageStart +
                    PAGE_SIZE,
                  rows.length,
                )}{" "}
                of {rows.length}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={
                    goToPreviousPage
                  }
                  disabled={
                    currentPage === 1
                  }
                  className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <button
                  type="button"
                  onClick={
                    goToNextPage
                  }
                  disabled={
                    currentPage ===
                    totalPages
                  }
                  className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>

            {activeRow &&
              activeRowIndex !== null && (
                <div
                  id="correction-panel"
                  className="border-t border-slate-700 bg-[#050914] p-5 sm:p-7 lg:p-8"
                >
                  <div className="flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Row{" "}
                        {activeRowIndex +
                          1}{" "}
                        correction
                      </p>

                      <h3 className="mt-2 text-lg font-semibold text-white">
                        Complete the required
                        information
                      </h3>

                      <p className="mt-1.5 max-w-2xl text-xs leading-5 text-slate-500">
                        Every field marked with *
                        must be completed before
                        this feedback can be imported.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {activeRowIssues.length >
                      0 ? (
                        <span className="rounded-full border border-amber-900/60 bg-amber-950/20 px-3 py-1.5 text-[11px] font-medium text-amber-300">
                          Missing:{" "}
                          {activeRowIssues.join(
                            ", ",
                          )}
                        </span>
                      ) : (
                        <span className="rounded-full border border-emerald-900/60 bg-emerald-950/20 px-3 py-1.5 text-[11px] font-medium text-emerald-300">
                          Complete
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-7 grid grid-cols-1 gap-6 md:grid-cols-2">
                    <label className="block md:col-span-2">
                      <span className="text-xs font-medium text-slate-300">
                        Feedback Content{" "}
                        <span className="text-red-400">
                          *
                        </span>
                      </span>

                      <textarea
                        value={
                          activeRow.content
                        }
                        onChange={(event) =>
                          updateRow(
                            activeRowIndex,
                            "content",
                            event.target.value,
                          )
                        }
                        rows={5}
                        placeholder="Enter the customer's feedback..."
                        className="mt-2 block min-h-32 w-full resize-y rounded-xl border border-slate-700 bg-[#080d18] px-4 py-3 text-sm leading-6 text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                      />
                    </label>

                    <label className="block min-w-0">
                      <span className="text-xs font-medium text-slate-300">
                        Customer Label{" "}
                        <span className="text-red-400">
                          *
                        </span>
                      </span>

                      <input
                        type="text"
                        value={
                          activeRow.customerLabel
                        }
                        onChange={(event) =>
                          updateRow(
                            activeRowIndex,
                            "customerLabel",
                            event.target.value,
                          )
                        }
                        placeholder="Enter customer name or label"
                        className="mt-2 block h-11 w-full rounded-xl border border-slate-700 bg-[#080d18] px-4 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                      />
                    </label>

                    <label className="block min-w-0">
                      <span className="text-xs font-medium text-slate-300">
                        Channel{" "}
                        <span className="text-red-400">
                          *
                        </span>
                      </span>

                      <select
                        value={
                          activeRow.channel
                        }
                        onChange={(event) =>
                          updateRow(
                            activeRowIndex,
                            "channel",
                            event.target.value,
                          )
                        }
                        className="mt-2 block h-11 w-full rounded-xl border border-slate-700 bg-[#080d18] px-4 text-sm text-slate-200 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                      >
                        <option value="">
                          Select channel
                        </option>

                        {activeChannels.map(
                          (channel) => (
                            <option
                              key={
                                channel.id
                              }
                              value={
                                channel.name
                              }
                            >
                              {channel.name}
                            </option>
                          ),
                        )}
                      </select>
                    </label>

                    <label className="block min-w-0">
                      <span className="text-xs font-medium text-slate-300">
                        Sentiment{" "}
                        <span className="text-red-400">
                          *
                        </span>
                      </span>

                      <select
                        value={
                          activeRow.sentiment
                        }
                        onChange={(event) =>
                          updateRow(
                            activeRowIndex,
                            "sentiment",
                            event.target.value,
                          )
                        }
                        className="mt-2 block h-11 w-full rounded-xl border border-slate-700 bg-[#080d18] px-4 text-sm text-slate-200 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                      >
                        <option value="">
                          Select sentiment
                        </option>

                        {SENTIMENT_OPTIONS.map(
                          (option) => (
                            <option
                              key={
                                option.value
                              }
                              value={
                                option.value
                              }
                            >
                              {option.label}
                            </option>
                          ),
                        )}
                      </select>
                    </label>

                    <label className="block min-w-0">
                      <span className="text-xs font-medium text-slate-300">
                        Theme{" "}
                        <span className="text-red-400">
                          *
                        </span>
                      </span>

                      <select
                        value={
                          activeRow.theme
                        }
                        onChange={(event) =>
                          updateRow(
                            activeRowIndex,
                            "theme",
                            event.target.value,
                          )
                        }
                        className="mt-2 block h-11 w-full rounded-xl border border-slate-700 bg-[#080d18] px-4 text-sm text-slate-200 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                      >
                        <option value="">
                          Select theme
                        </option>

                        {activeThemes.map(
                          (theme) => (
                            <option
                              key={
                                theme.id
                              }
                              value={
                                theme.name
                              }
                            >
                              {theme.name}
                            </option>
                          ),
                        )}
                      </select>
                    </label>

                    <label className="block min-w-0 md:col-span-2">
                      <span className="text-xs font-medium text-slate-300">
                        Source Reference{" "}
                        <span className="text-slate-500">
                          (optional)
                        </span>
                      </span>

                      <input
                        type="text"
                        value={
                          activeRow.sourceRef
                        }
                        onChange={(event) =>
                          updateRow(
                            activeRowIndex,
                            "sourceRef",
                            event.target.value,
                          )
                        }
                        placeholder="Optional ticket, form, reference, or source ID"
                        className="mt-2 block h-11 w-full rounded-xl border border-slate-700 bg-[#080d18] px-4 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                      />
                    </label>
                  </div>

                  <div className="mt-8 flex flex-col gap-3 border-t border-slate-800 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs leading-5 text-slate-500">
                      Active channels and themes come
                      directly from the current workspace
                      settings.
                    </p>

                    <button
                      type="button"
                      onClick={
                        closeCorrection
                      }
                      className="inline-flex min-w-24 items-center justify-center rounded-lg bg-white px-5 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-slate-200"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
          </div>
        )}
      </div>
    </section>
  );
}