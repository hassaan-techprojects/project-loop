"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Sentiment = "POS" | "NEU" | "NEG" | null;
type Status = "NEW" | "REVIEWED" | "ACTIONED";
type Role = "ADMIN" | "ANALYST" | "VIEWER";

type FeedbackItem = {
  id: string;
  content: string;
  channel: string;
  sourceRef: string | null;
  customerLabel: string | null;
  sentiment: Sentiment;
  sentimentScore: number | null;
  status: Status;
  createdAt: string;
  updatedAt: string;
  feedbackThemes: {
    confidence: number;
    theme: {
      name: string;
    };
  }[];
};

type FeedbackResponse = {
  feedback: FeedbackItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
  filters: {
    channels: string[];
    themes: string[];
  };
};

type SessionResponse = {
  user?: {
    role?: string;
  };
};

const channelLabels: Record<string, string> = {
  support_ticket: "Support Ticket",
  app_store_review: "App Store Review",
  nps_survey: "NPS Survey",
  sales_call: "Sales Call",
  sales_call_note: "Sales Call Note",
  community_post: "Community Post",
  email: "Email",
  website_feedback: "Website Feedback",
  chat: "Chat",
  social: "Social",
  manual: "Manual",
};

function formatChannel(channel: string) {
  return (
    channelLabels[channel] ||
    channel
      .replace(/[_-]/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
}

function formatSentiment(sentiment: Sentiment) {
  if (sentiment === "POS") return "Positive";
  if (sentiment === "NEG") return "Negative";
  if (sentiment === "NEU") return "Neutral";
  return "Unclassified";
}

function sentimentClass(sentiment: Sentiment) {
  if (sentiment === "POS") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  }

  if (sentiment === "NEG") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-400";
  }

  if (sentiment === "NEU") {
    return "border-slate-500/30 bg-slate-500/10 text-slate-300";
  }

  return "border-slate-700 bg-slate-800/60 text-slate-400";
}

function statusClass(status: Status) {
  if (status === "NEW") {
    return "border-violet-500/30 bg-violet-500/10 text-violet-300";
  }

  if (status === "REVIEWED") {
    return "border-blue-500/30 bg-blue-500/10 text-blue-300";
  }

  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
}

function statusLabel(status: Status) {
  if (status === "REVIEWED") return "Reviewed";
  if (status === "ACTIONED") return "Actioned";
  return "New";
}

function truncateCustomer(customer: string | null) {
  if (!customer) return "Unknown customer";

  if (customer.length <= 24) {
    return customer;
  }

  return `${customer.slice(0, 21)}...`;
}

function getPageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, -1, totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      -1,
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [1, -1, currentPage - 1, currentPage, currentPage + 1, -1, totalPages];
}

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [channels, setChannels] = useState<string[]>([]);
  const [themes, setThemes] = useState<string[]>([]);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [channel, setChannel] = useState("ALL");
  const [sentiment, setSentiment] = useState("ALL");
  const [theme, setTheme] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [statusUpdateError, setStatusUpdateError] = useState("");

  const [role, setRole] = useState<Role | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  const [newContent, setNewContent] = useState("");
  const [newChannel, setNewChannel] = useState("manual");
  const [newCustomerLabel, setNewCustomerLabel] = useState("");
  const [newSourceRef, setNewSourceRef] = useState("");
  const [newSentiment, setNewSentiment] = useState<Sentiment>(null);
  const [newSentimentScore, setNewSentimentScore] = useState("");
  const [newStatus, setNewStatus] = useState<Status>("NEW");

  const canCreateFeedback = role === "ADMIN" || role === "ANALYST";

  const loadSession = useCallback(async () => {
    try {
      setSessionLoading(true);

      const response = await fetch("/api/auth/session", {
        cache: "no-store",
      });

      if (!response.ok) {
        setRole(null);
        return;
      }

      const data = (await response.json()) as SessionResponse;
      const sessionRole = data.user?.role;

      if (
        sessionRole === "ADMIN" ||
        sessionRole === "ANALYST" ||
        sessionRole === "VIEWER"
      ) {
        setRole(sessionRole);
      } else {
        setRole(null);
      }
    } catch (sessionError) {
      console.error("Session loading error:", sessionError);
      setRole(null);
    } finally {
      setSessionLoading(false);
    }
  }, []);

  const loadFeedback = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      params.set("page", String(page));
      params.set("limit", "10");

      if (search) params.set("search", search);
      if (channel !== "ALL") params.set("channel", channel);
      if (sentiment !== "ALL") params.set("sentiment", sentiment);
      if (theme !== "ALL") params.set("theme", theme);
      if (status !== "ALL") params.set("status", status);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const response = await fetch(`/api/feedback?${params.toString()}`, {
        cache: "no-store",
      });

      const data = (await response.json()) as
        FeedbackResponse | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : "Failed to load feedback.",
        );
      }

      const result = data as FeedbackResponse;

      setFeedback(result.feedback);
      setPagination(result.pagination);
      setChannels(result.filters.channels);
      setThemes(result.filters.themes);
    } catch (requestError) {
      console.error(requestError);

      setFeedback([]);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load feedback.",
      );
    } finally {
      setLoading(false);
    }
  }, [channel, dateFrom, dateTo, page, search, sentiment, status, theme]);

  async function handleStatusChange(feedbackId: string, nextStatus: Status) {
    try {
      setUpdatingStatusId(feedbackId);
      setStatusUpdateError("");

      const response = await fetch("/api/feedback", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: feedbackId,
          status: nextStatus,
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        feedback?: FeedbackItem;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Failed to update feedback status.");
      }

      await loadFeedback();
    } catch (requestError) {
      console.error(requestError);

      setStatusUpdateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update feedback status.",
      );
    } finally {
      setUpdatingStatusId(null);
    }
  }

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    void loadFeedback();
  }, [loadFeedback]);

  const pageNumbers = useMemo(
    () => getPageNumbers(pagination.page, pagination.totalPages),
    [pagination.page, pagination.totalPages],
  );

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPage(1);
    setSearch(searchInput.trim());
  }

  function handleFilterChange(setter: (value: string) => void, value: string) {
    setPage(1);
    setter(value);
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setChannel("ALL");
    setSentiment("ALL");
    setTheme("ALL");
    setStatus("ALL");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  function resetCreateForm() {
    setNewContent("");
    setNewChannel("manual");
    setNewCustomerLabel("");
    setNewSourceRef("");
    setNewSentiment(null);
    setNewSentimentScore("");
    setNewStatus("NEW");
    setCreateError("");
  }

  function closeCreateForm() {
    if (createLoading) return;

    setShowCreateForm(false);
    setCreateError("");
    setCreateSuccess("");
    resetCreateForm();
  }

  async function handleCreateFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setCreateLoading(true);
    setCreateError("");
    setCreateSuccess("");

    try {
      const trimmedContent = newContent.trim();

      if (!trimmedContent) {
        throw new Error("Feedback content is required.");
      }

      const trimmedChannel = newChannel.trim();

      if (!trimmedChannel) {
        throw new Error("Channel is required.");
      }

      let sentimentScore: number | undefined;

      if (newSentimentScore.trim()) {
        const parsedScore = Number(newSentimentScore);

        if (
          !Number.isFinite(parsedScore) ||
          parsedScore < -1 ||
          parsedScore > 1
        ) {
          throw new Error("Sentiment score must be a number between -1 and 1.");
        }

        sentimentScore = parsedScore;
      }

      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: trimmedContent,
          channel: trimmedChannel,
          customerLabel: newCustomerLabel.trim(),
          sourceRef: newSourceRef.trim(),
          sentiment: newSentiment ?? undefined,
          sentimentScore,
          status: newStatus,
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Failed to create feedback.");
      }

      setCreateSuccess("Feedback created successfully.");

      resetCreateForm();
      setPage(1);
      setSearchInput("");
      setSearch("");
      setChannel("ALL");
      setSentiment("ALL");
      setTheme("ALL");
      setStatus("ALL");
      setDateFrom("");
      setDateTo("");

      await loadFeedback();

      window.setTimeout(() => {
        setShowCreateForm(false);
        setCreateSuccess("");
      }, 700);
    } catch (createRequestError) {
      console.error(createRequestError);

      setCreateError(
        createRequestError instanceof Error
          ? createRequestError.message
          : "Failed to create feedback.",
      );
    } finally {
      setCreateLoading(false);
    }
  }

  const hasActiveFilters =
    search ||
    channel !== "ALL" ||
    sentiment !== "ALL" ||
    theme !== "ALL" ||
    status !== "ALL" ||
    dateFrom ||
    dateTo;

  return (
    <main className="min-h-screen bg-[#030712] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <section className="mb-4 rounded-xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-950 to-indigo-950/40 px-5 py-4 shadow-2xl shadow-black/20">
          <div className="mb-1 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
            Customer Voice
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-serif text-2xl text-white sm:text-3xl">
                All Feedback
              </h1>

              <p className="mt-1 max-w-2xl text-[10px] leading-4 text-slate-400 sm:text-[11px]">
                Explore customer feedback from surveys, support tickets, app
                reviews, and other sources in one place.
              </p>
            </div>

            {!sessionLoading && canCreateFeedback && (
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(true);
                  setCreateError("");
                  setCreateSuccess("");
                }}
                className="inline-flex h-9 items-center justify-center rounded-md bg-white px-4 text-[10px] font-semibold text-slate-950 transition hover:bg-slate-200"
              >
                + Add Feedback
              </button>
            )}
          </div>
        </section>

        {showCreateForm && canCreateFeedback && (
          <section className="mb-4 rounded-xl border border-indigo-500/20 bg-[#0a1222]/95 p-4 shadow-2xl shadow-black/20">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-indigo-300">
                  New Feedback
                </p>

                <h2 className="mt-1 text-sm font-semibold text-white">
                  Add customer feedback
                </h2>

                <p className="mt-1 text-[10px] leading-4 text-slate-500">
                  Add a feedback item manually to the current workspace.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateForm}
                disabled={createLoading}
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-[9px] font-medium text-slate-400 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Close
              </button>
            </div>

            {createError && (
              <div className="mb-4 rounded-md border border-rose-500/20 bg-rose-500/5 px-3 py-2">
                <p className="text-[10px] text-rose-300">{createError}</p>
              </div>
            )}

            {createSuccess && (
              <div className="mb-4 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                <p className="text-[10px] text-emerald-300">{createSuccess}</p>
              </div>
            )}

            <form onSubmit={handleCreateFeedback}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label
                    htmlFor="feedback-content"
                    className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                  >
                    Feedback *
                  </label>

                  <textarea
                    id="feedback-content"
                    value={newContent}
                    onChange={(event) => setNewContent(event.target.value)}
                    placeholder="Enter the customer's feedback..."
                    maxLength={5000}
                    rows={4}
                    required
                    className="w-full resize-y rounded-md border border-slate-700 bg-slate-900 px-3 py-2.5 text-[10px] leading-5 text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="feedback-customer"
                    className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                  >
                    Customer
                  </label>

                  <input
                    id="feedback-customer"
                    value={newCustomerLabel}
                    onChange={(event) =>
                      setNewCustomerLabel(event.target.value)
                    }
                    placeholder="Customer name or label"
                    maxLength={200}
                    className="h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-[10px] text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="feedback-channel"
                    className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                  >
                    Channel *
                  </label>

                  <select
                    id="feedback-channel"
                    value={newChannel}
                    onChange={(event) => setNewChannel(event.target.value)}
                    required
                    className="h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-[10px] text-slate-300 outline-none focus:border-indigo-500/60"
                  >
                    <option value="manual">Manual</option>
                    <option value="support_ticket">Support Ticket</option>
                    <option value="app_store_review">App Store Review</option>
                    <option value="nps_survey">NPS Survey</option>
                    <option value="sales_call">Sales Call</option>
                    <option value="community_post">Community Post</option>
                    <option value="email">Email</option>
                    <option value="website_feedback">Website Feedback</option>
                    <option value="chat">Chat</option>
                    <option value="social">Social</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="feedback-source"
                    className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                  >
                    Source Reference
                  </label>

                  <input
                    id="feedback-source"
                    value={newSourceRef}
                    onChange={(event) => setNewSourceRef(event.target.value)}
                    placeholder="Optional ticket, URL, or source ID"
                    maxLength={500}
                    className="h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-[10px] text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="feedback-sentiment"
                    className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                  >
                    Sentiment
                  </label>

                  <select
                    id="feedback-sentiment"
                    value={newSentiment ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;

                      setNewSentiment(
                        value === "POS" || value === "NEU" || value === "NEG"
                          ? value
                          : null,
                      );
                    }}
                    className="h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-[10px] text-slate-300 outline-none focus:border-indigo-500/60"
                  >
                    <option value="">Unclassified</option>
                    <option value="POS">Positive</option>
                    <option value="NEU">Neutral</option>
                    <option value="NEG">Negative</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="feedback-score"
                    className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                  >
                    Sentiment Score
                  </label>

                  <input
                    id="feedback-score"
                    type="number"
                    min="-1"
                    max="1"
                    step="0.01"
                    value={newSentimentScore}
                    onChange={(event) =>
                      setNewSentimentScore(event.target.value)
                    }
                    placeholder="-1 to 1"
                    className="h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-[10px] text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="feedback-status"
                    className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                  >
                    Status
                  </label>

                  <select
                    id="feedback-status"
                    value={newStatus}
                    onChange={(event) =>
                      setNewStatus(event.target.value as Status)
                    }
                    className="h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-[10px] text-slate-300 outline-none focus:border-indigo-500/60"
                  >
                    <option value="NEW">New</option>
                    <option value="REVIEWED">Reviewed</option>
                    <option value="ACTIONED">Actioned</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeCreateForm}
                  disabled={createLoading}
                  className="h-9 rounded-md border border-slate-700 bg-slate-900 px-4 text-[10px] font-semibold text-slate-400 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={createLoading}
                  className="h-9 rounded-md bg-white px-4 text-[10px] font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {createLoading ? "Creating..." : "Create Feedback"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="rounded-xl border border-slate-800 bg-[#0a1222]/95 shadow-2xl shadow-black/20">
          <div className="border-b border-slate-800 p-3">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <form
                  onSubmit={handleSearch}
                  className="flex min-w-0 flex-1 gap-2"
                >
                  <div className="relative min-w-0 flex-1">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-500">
                      ⌕
                    </span>

                    <input
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      placeholder="Search feedback..."
                      className="h-9 w-full rounded-md border border-slate-700 bg-slate-900/80 pl-8 pr-3 text-[11px] text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20"
                    />
                  </div>

                  <button
                    type="submit"
                    className="h-9 rounded-md bg-white px-4 text-[10px] font-semibold text-slate-950 transition hover:bg-slate-200"
                  >
                    Search
                  </button>
                </form>

                <div className="flex items-center justify-between gap-3 lg:justify-end">
                  <div className="text-right">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Showing
                    </p>

                    <p className="text-[10px] text-slate-300">
                      {pagination.total} total feedback items
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <select
                  value={channel}
                  onChange={(event) =>
                    handleFilterChange(setChannel, event.target.value)
                  }
                  className="h-9 rounded-md border border-slate-700 bg-slate-900 px-3 text-[10px] text-slate-300 outline-none focus:border-indigo-500/60"
                  aria-label="Filter by channel"
                >
                  <option value="ALL">All Channels</option>
                  {channels.map((item) => (
                    <option key={item} value={item}>
                      {formatChannel(item)}
                    </option>
                  ))}
                </select>

                <select
                  value={sentiment}
                  onChange={(event) =>
                    handleFilterChange(setSentiment, event.target.value)
                  }
                  className="h-9 rounded-md border border-slate-700 bg-slate-900 px-3 text-[10px] text-slate-300 outline-none focus:border-indigo-500/60"
                  aria-label="Filter by sentiment"
                >
                  <option value="ALL">All Sentiment</option>
                  <option value="POS">Positive</option>
                  <option value="NEU">Neutral</option>
                  <option value="NEG">Negative</option>
                </select>

                <select
                  value={theme}
                  onChange={(event) =>
                    handleFilterChange(setTheme, event.target.value)
                  }
                  className="h-9 rounded-md border border-slate-700 bg-slate-900 px-3 text-[10px] text-slate-300 outline-none focus:border-indigo-500/60"
                  aria-label="Filter by theme"
                >
                  <option value="ALL">All Themes</option>
                  {themes.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <select
                  value={status}
                  onChange={(event) =>
                    handleFilterChange(setStatus, event.target.value)
                  }
                  className="h-9 rounded-md border border-slate-700 bg-slate-900 px-3 text-[10px] text-slate-300 outline-none focus:border-indigo-500/60"
                  aria-label="Filter by status"
                >
                  <option value="ALL">All Status</option>
                  <option value="NEW">New</option>
                  <option value="REVIEWED">Reviewed</option>
                  <option value="ACTIONED">Actioned</option>
                </select>

                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) =>
                    handleFilterChange(setDateFrom, event.target.value)
                  }
                  className="h-9 rounded-md border border-slate-700 bg-slate-900 px-3 text-[10px] text-slate-300 outline-none focus:border-indigo-500/60"
                  aria-label="Filter from date"
                />

                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(event) =>
                    handleFilterChange(setDateTo, event.target.value)
                  }
                  className="h-9 rounded-md border border-slate-700 bg-slate-900 px-3 text-[10px] text-slate-300 outline-none focus:border-indigo-500/60"
                  aria-label="Filter to date"
                />
              </div>

              {hasActiveFilters && (
                <div className="flex items-center justify-between rounded-md border border-indigo-500/20 bg-indigo-500/5 px-3 py-2">
                  <p className="text-[10px] text-slate-400">
                    Filters are applied to the server-side query.
                  </p>

                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-[10px] font-semibold text-indigo-300 transition hover:text-white"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
            <div>
              <h2 className="text-[11px] font-semibold text-slate-200">
                Feedback Inbox
              </h2>

              {statusUpdateError && (
                <div className="mt-2 rounded-md border border-rose-500/20 bg-rose-500/5 px-3 py-2">
                  <p className="text-[9px] text-rose-300">
                    {statusUpdateError}
                  </p>
                </div>
              )}

              <p className="text-[9px] text-slate-500">
                Latest customer feedback and triage signals.
              </p>
            </div>

            <span className="rounded-md border border-slate-700 bg-slate-800/80 px-2 py-1 text-[9px] text-slate-400">
              Page {pagination.page} of {pagination.totalPages}
            </span>
          </div>

          {loading ? (
            <div className="flex min-h-[420px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-400" />

                <p className="text-[11px] text-slate-500">
                  Loading feedback...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex min-h-[420px] items-center justify-center px-6">
              <div className="max-w-md rounded-lg border border-rose-500/20 bg-rose-500/5 p-5 text-center">
                <p className="text-sm font-semibold text-rose-300">
                  Unable to load feedback
                </p>

                <p className="mt-1 text-[11px] text-slate-500">{error}</p>

                <button
                  type="button"
                  onClick={() => void loadFeedback()}
                  className="mt-4 rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-[10px] font-semibold text-slate-300 transition hover:border-slate-600 hover:text-white"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : feedback.length === 0 ? (
            <div className="flex min-h-[420px] items-center justify-center px-6">
              <div className="max-w-md text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-500">
                  ○
                </div>

                <p className="text-sm font-semibold text-slate-300">
                  No feedback found
                </p>

                <p className="mt-1 text-[11px] leading-5 text-slate-500">
                  Try changing your search or filters to find matching feedback.
                </p>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-[10px] font-semibold text-slate-300 transition hover:border-slate-600 hover:text-white"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[900px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40">
                      <th className="px-3 py-2 text-left text-[8px] font-medium uppercase tracking-[0.12em] text-slate-500">
                        Customer
                      </th>

                      <th className="px-3 py-2 text-left text-[8px] font-medium uppercase tracking-[0.12em] text-slate-500">
                        Feedback
                      </th>

                      <th className="px-3 py-2 text-left text-[8px] font-medium uppercase tracking-[0.12em] text-slate-500">
                        Channel
                      </th>

                      <th className="px-3 py-2 text-left text-[8px] font-medium uppercase tracking-[0.12em] text-slate-500">
                        Sentiment
                      </th>

                      <th className="px-3 py-2 text-left text-[8px] font-medium uppercase tracking-[0.12em] text-slate-500">
                        Status
                      </th>

                      <th className="px-3 py-2 text-left text-[8px] font-medium uppercase tracking-[0.12em] text-slate-500">
                        Date
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {feedback.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-slate-800/80 transition hover:bg-slate-900/50"
                      >
                        <td className="px-3 py-3 align-middle">
                          <div className="flex items-center gap-2">
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-violet-500/10 text-[8px] font-semibold uppercase text-violet-300">
                              {(item.customerLabel || "C")
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <p className="max-w-[125px] truncate text-[9px] font-medium text-slate-300">
                                {truncateCustomer(item.customerLabel)}
                              </p>

                              <p className="text-[8px] text-slate-600">
                                Customer
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="max-w-[310px] px-3 py-3 align-middle">
                          <p className="line-clamp-2 text-[9px] leading-4 text-slate-300">
                            {item.content}
                          </p>

                          {item.feedbackThemes.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {item.feedbackThemes
                                .slice(0, 2)
                                .map((themeItem) => (
                                  <span
                                    key={themeItem.theme.name}
                                    className="text-[7px] text-slate-600"
                                  >
                                    #{themeItem.theme.name}
                                  </span>
                                ))}
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-3 align-middle">
                          <span className="inline-flex rounded-md bg-slate-800 px-2 py-1 text-[8px] font-medium text-slate-300">
                            {formatChannel(item.channel)}
                          </span>
                        </td>

                        <td className="px-3 py-3 align-middle">
                          <span
                            className={`inline-flex rounded-full border px-2 py-1 text-[8px] font-medium ${sentimentClass(
                              item.sentiment,
                            )}`}
                          >
                            <span className="mr-1">•</span>
                            {formatSentiment(item.sentiment)}
                          </span>
                        </td>

                        <td className="px-3 py-3 align-middle">
                          <div className="flex items-center gap-2">
                            <select
                              value={item.status}
                              disabled={
                                !canCreateFeedback ||
                                updatingStatusId === item.id
                              }
                              onChange={(event) =>
                                void handleStatusChange(
                                  item.id,
                                  event.target.value as Status,
                                )
                              }
                              className={`rounded-full border px-2 py-1 text-[8px] font-medium uppercase outline-none transition ${statusClass(
                                item.status,
                              )} ${
                                !canCreateFeedback ||
                                updatingStatusId === item.id
                                  ? "cursor-not-allowed opacity-60"
                                  : "cursor-pointer"
                              }`}
                              aria-label={`Update status for ${truncateCustomer(
                                item.customerLabel,
                              )}`}
                            >
                              <option value="NEW">New</option>
                              <option value="REVIEWED">Reviewed</option>
                              <option value="ACTIONED">Actioned</option>
                            </select>

                            {updatingStatusId === item.id && (
                              <span className="text-[8px] text-slate-500">
                                Updating...
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-3 py-3 align-middle text-[8px] text-slate-400">
                          {formatDate(item.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-800/80 md:hidden">
                {feedback.map((item) => (
                  <article key={item.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-xs font-semibold text-violet-300">
                          {(item.customerLabel || "C").charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-[10px] font-medium text-slate-300">
                            {truncateCustomer(item.customerLabel)}
                          </p>

                          <p className="text-[8px] text-slate-600">
                            {formatDate(item.createdAt)}
                          </p>
                        </div>
                      </div>

                      <span>
                        <select
                          value={item.status}
                          disabled={
                            !canCreateFeedback || updatingStatusId === item.id
                          }
                          onChange={(event) =>
                            void handleStatusChange(
                              item.id,
                              event.target.value as Status,
                            )
                          }
                          className={`shrink-0 rounded-full border px-2 py-1 text-[8px] font-medium uppercase outline-none transition ${statusClass(
                            item.status,
                          )} ${
                            !canCreateFeedback || updatingStatusId === item.id
                              ? "cursor-not-allowed opacity-60"
                              : "cursor-pointer"
                          }`}
                          aria-label={`Update status for ${truncateCustomer(
                            item.customerLabel,
                          )}`}
                        >
                          <option value="NEW">New</option>
                          <option value="REVIEWED">Reviewed</option>
                          <option value="ACTIONED">Actioned</option>
                        </select>
                      </span>
                    </div>

                    <p className="mt-3 text-[10px] leading-5 text-slate-300">
                      {item.content}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-slate-800 px-2 py-1 text-[8px] text-slate-300">
                        {formatChannel(item.channel)}
                      </span>

                      <span
                        className={`rounded-full border px-2 py-1 text-[8px] font-medium ${sentimentClass(
                          item.sentiment,
                        )}`}
                      >
                        {formatSentiment(item.sentiment)}
                      </span>

                      {item.feedbackThemes.slice(0, 2).map((themeItem) => (
                        <span
                          key={themeItem.theme.name}
                          className="rounded-md border border-slate-800 bg-slate-900 px-2 py-1 text-[8px] text-slate-500"
                        >
                          {themeItem.theme.name}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-800 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[9px] text-slate-500">
                  Showing{" "}
                  <span className="text-slate-300">
                    {(pagination.page - 1) * pagination.limit + 1}
                  </span>{" "}
                  to{" "}
                  <span className="text-slate-300">
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.total,
                    )}
                  </span>{" "}
                  of <span className="text-slate-300">{pagination.total}</span>
                </p>

                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    disabled={!pagination.hasPreviousPage}
                    onClick={() => setPage((current) => current - 1)}
                    className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-[9px] font-medium text-slate-400 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  {pageNumbers.map((pageNumber, index) =>
                    pageNumber === -1 ? (
                      <span
                        key={`ellipsis-${index}`}
                        className="px-1 text-[9px] text-slate-600"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => setPage(pageNumber)}
                        className={`min-w-7 rounded-md border px-2 py-1.5 text-[9px] font-medium transition ${
                          pageNumber === pagination.page
                            ? "border-white bg-white text-slate-950"
                            : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-white"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    ),
                  )}

                  <button
                    type="button"
                    disabled={!pagination.hasNextPage}
                    onClick={() => setPage((current) => current + 1)}
                    className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-[9px] font-medium text-slate-400 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
