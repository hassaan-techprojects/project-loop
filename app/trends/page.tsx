"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import AppShell from "@/components/app-shell";

type Days = 7 | 30 | 90;

type ThemeTrend = {
  id: string;
  name: string;
  currentCount: number;
  previousCount: number;
  growthPercentage: number;
  isNew: boolean;
  isSpiking: boolean;
};

type SelectedFeedback = {
  id: string;
  content: string;
  channel: string;
  customerLabel: string | null;
  sentiment: string | null;
  status: string;
  createdAt: string;
};

type TrendsData = {
  period: {
    days: number;
    currentStart: string;
    previousStart: string;
    end: string;
  };
  volumeOverTime: {
    date: string;
    total: number;
  }[];
  themeTrends: ThemeTrend[];
  emergingThemes: ThemeTrend[];
  newThemes: ThemeTrend[];
  selectedThemeFeedback: SelectedFeedback[];
};

type ApiError = {
  error?: string;
};

const periodOptions: {
  value: Days;
  label: string;
}[] = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

const sentimentStyles: Record<
  string,
  {
    label: string;
    className: string;
    dotClassName: string;
  }
> = {
  POS: {
    label: "Positive",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-400",
    dotClassName: "bg-emerald-500",
  },
  NEU: {
    label: "Neutral",
    className:
      "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
    dotClassName: "bg-slate-400",
  },
  NEG: {
    label: "Negative",
    className:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-400",
    dotClassName: "bg-rose-500",
  },
};

const statusStyles: Record<string, string> = {
  NEW: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-400",
  REVIEWED:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-400",
  ACTIONED:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-400",
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function formatLongDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function formatChannel(channel: string) {
  return channel
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}

function formatGrowth(value: number) {
  if (value > 0) {
    return `+${value}%`;
  }

  return `${value}%`;
}

function Skeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-800/70 ${className}`}
    />
  );
}

function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
      <div className="max-w-sm px-6 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <svg
            className="h-5 w-5 text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M4 19V5M4 19h16" />
            <path d="m7 15 3-4 3 2 4-6" />
          </svg>
        </div>

        <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
          {title}
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-500">
          {message}
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-5 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/70">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
        {subtitle}
      </p>
    </div>
  );
}

function ThemeRow({
  theme,
  selected,
  onClick,
}: {
  theme: ThemeTrend;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border p-4 text-left transition ${
        selected
          ? "border-violet-300 bg-violet-50/70 dark:border-violet-800 dark:bg-violet-950/20"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700 dark:hover:bg-slate-900"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
              {theme.name}
            </span>

            {theme.isNew && (
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-400">
                New
              </span>
            )}

            {theme.isSpiking && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-400">
                Spiking
              </span>
            )}
          </div>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
            {theme.currentCount} feedback items in this period
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p
            className={`text-sm font-semibold ${
              theme.growthPercentage > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : theme.growthPercentage < 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {formatGrowth(theme.growthPercentage)}
          </p>

          <p className="mt-0.5 text-[10px] text-slate-400">
            vs previous
          </p>
        </div>
      </div>
    </button>
  );
}

function FeedbackItem({
  feedback,
}: {
  feedback: SelectedFeedback;
}) {
  const sentiment = feedback.sentiment
    ? sentimentStyles[feedback.sentiment]
    : null;

  const statusClass =
    statusStyles[feedback.status] ??
    "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";

  return (
    <div className="group flex gap-4 border-b border-slate-100 py-4 last:border-b-0 dark:border-slate-800">
      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/15 via-fuchsia-500/10 to-blue-500/15 text-xs font-semibold text-violet-700 dark:text-violet-300">
        {feedback.customerLabel
          ? feedback.customerLabel
              .charAt(0)
              .toUpperCase()
          : "C"}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {sentiment && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sentiment.className}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${sentiment.dotClassName}`}
              />
              {sentiment.label}
            </span>
          )}

          <span className="text-[11px] text-slate-400">
            {formatChannel(feedback.channel)}
          </span>

          <span className="text-[11px] text-slate-400">
            •
          </span>

          <span className="text-[11px] text-slate-400">
            {formatDate(feedback.createdAt)}
          </span>
        </div>

        <p className="mt-1.5 text-sm leading-5 text-slate-700 dark:text-slate-300">
          {feedback.content}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {feedback.customerLabel && (
            <span className="truncate text-[11px] text-slate-400">
              {feedback.customerLabel}
            </span>
          )}

          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusClass}`}
          >
            {feedback.status}
          </span>
        </div>
      </div>

      <span className="hidden shrink-0 text-xs text-slate-400 sm:block">
        {formatLongDate(feedback.createdAt)}
      </span>
    </div>
  );
}

export default function TrendsPage() {
  const [days, setDays] = useState<Days>(30);
  const [data, setData] = useState<TrendsData | null>(null);
  const [selectedThemeId, setSelectedThemeId] =
    useState<string | null>(null);
  const [selectedThemeFeedback, setSelectedThemeFeedback] =
    useState<SelectedFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [themeLoading, setThemeLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    null
  );

  const loadTrends = useCallback(async (period: Days) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedThemeId(null);
      setSelectedThemeFeedback([]);

      const response = await fetch(
        `/api/trends?days=${period}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result = (await response.json()) as
        | TrendsData
        | ApiError;

      if (!response.ok) {
        throw new Error(
          ("error" in result && result.error) ||
            "Failed to load trends."
        );
      }

      setData(result as TrendsData);
    } catch (trendsError) {
      setError(
        trendsError instanceof Error
          ? trendsError.message
          : "Failed to load trends."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTrends(days);
  }, [days, loadTrends]);

  const loadThemeFeedback = useCallback(
    async (themeId: string) => {
      try {
        setThemeLoading(true);
        setSelectedThemeId(themeId);

        const response = await fetch(
          `/api/trends?days=${days}&themeId=${encodeURIComponent(themeId)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const result = (await response.json()) as
          | TrendsData
          | ApiError;

        if (!response.ok) {
          throw new Error(
            ("error" in result && result.error) ||
              "Failed to load theme feedback."
          );
        }

        setSelectedThemeFeedback(
          (result as TrendsData).selectedThemeFeedback
        );
      } catch (themeError) {
        setSelectedThemeFeedback([]);

        setError(
          themeError instanceof Error
            ? themeError.message
            : "Failed to load theme feedback."
        );
      } finally {
        setThemeLoading(false);
      }
    },
    [days]
  );

  const chartVolume = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.volumeOverTime.map((item) => ({
      ...item,
      label: formatDate(item.date),
    }));
  }, [data]);

  const chartThemes = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.themeTrends
      .filter((theme) => theme.currentCount > 0)
      .slice(0, 8)
      .map((theme) => ({
        name: theme.name,
        count: theme.currentCount,
      }));
  }, [data]);

  const currentTotal = useMemo(() => {
    if (!data) {
      return 0;
    }

    return data.volumeOverTime.reduce(
      (total, item) => total + item.total,
      0
    );
  }, [data]);

  const periodChange = useMemo(() => {
    if (!data) {
      return 0;
    }

    const themeCurrentTotal = data.themeTrends.reduce(
      (total, theme) => total + theme.currentCount,
      0
    );

    const themePreviousTotal = data.themeTrends.reduce(
      (total, theme) => total + theme.previousCount,
      0
    );

    if (themePreviousTotal === 0) {
      return themeCurrentTotal > 0 ? 100 : 0;
    }

    return Math.round(
      ((themeCurrentTotal - themePreviousTotal) /
        themePreviousTotal) *
        100
    );
  }, [data]);

  if (error && !data) {
    return (
      <AppShell>
        <main className="min-h-screen bg-slate-50 px-5 py-7 dark:bg-slate-950 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-900/60 dark:bg-rose-950/20">
              <h1 className="text-lg font-semibold text-rose-700 dark:text-rose-400">
                Unable to load trends
              </h1>

              <p className="mt-2 text-sm text-rose-600 dark:text-rose-300">
                {error}
              </p>

              <button
                type="button"
                onClick={() => void loadTrends(days)}
                className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                Try again
              </button>
            </div>
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="min-h-screen bg-slate-50/80 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-5 py-7 sm:px-6 lg:px-8">
          <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/85 px-6 py-7 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/75 sm:px-8">
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />

            <div className="pointer-events-none absolute -bottom-32 left-1/3 h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl" />

            <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />

                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Customer voice trends
                  </span>
                </div>

                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                  Trends
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  See how feedback volume changes, understand
                  which themes are growing, and investigate the
                  customer conversations behind them.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {periodOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDays(option.value)}
                    className={`rounded-xl border px-3.5 py-2.5 text-sm font-medium transition ${
                      days === option.value
                        ? "border-violet-300 bg-violet-50 text-violet-700 shadow-sm dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => void loadTrends(days)}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  <svg
                    className={`h-4 w-4 ${
                      loading ? "animate-spin" : ""
                    }`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M20 11a8.1 8.1 0 0 0-15.5-3M4 5v4h4" />
                    <path d="M4 13a8.1 8.1 0 0 0 15.5 3M20 19v-4h-4" />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {loading ? (
              <>
                <Skeleton className="h-[135px]" />
                <Skeleton className="h-[135px]" />
                <Skeleton className="h-[135px]" />
                <Skeleton className="h-[135px]" />
              </>
            ) : (
              <>
                <MetricCard
                  label="Feedback volume"
                  value={currentTotal}
                  subtitle={`Last ${days} days`}
                />

                <MetricCard
                  label="Period change"
                  value={formatGrowth(periodChange)}
                  subtitle="Compared with previous period"
                />

                <MetricCard
                  label="Emerging themes"
                  value={data?.emergingThemes.length ?? 0}
                  subtitle="Themes showing significant growth"
                />

                <MetricCard
                  label="New themes"
                  value={data?.newThemes.length ?? 0}
                  subtitle="Themes appearing in this period"
                />
              </>
            )}
          </section>

          <section className="mt-6">
            <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/70">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    Feedback volume
                  </h2>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Daily feedback activity over the selected period
                  </p>
                </div>

                {!loading && data && (
                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                    {days} days
                  </span>
                )}
              </div>

              <div className="mt-6 h-[320px]">
                {loading ? (
                  <Skeleton className="h-full w-full" />
                ) : chartVolume.length === 0 ||
                  currentTotal === 0 ? (
                  <EmptyState
                    title="No feedback activity yet"
                    message="Feedback volume will appear here once your workspace has customer feedback."
                  />
                ) : (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <AreaChart
                      data={chartVolume}
                      margin={{
                        top: 8,
                        right: 8,
                        left: -24,
                        bottom: 0,
                      }}
                    >
                      <defs>
                        <linearGradient
                          id="trendsVolumeGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#8b5cf6"
                            stopOpacity={0.28}
                          />

                          <stop
                            offset="100%"
                            stopColor="#8b5cf6"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>

                      <CartesianGrid
                        vertical={false}
                        strokeDasharray="3 3"
                        className="stroke-slate-200 dark:stroke-slate-800"
                      />

                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        minTickGap={28}
                        tick={{
                          fontSize: 11,
                          fill: "#94a3b8",
                        }}
                      />

                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        tick={{
                          fontSize: 11,
                          fill: "#94a3b8",
                        }}
                      />

                      <Tooltip
                        cursor={{
                          stroke: "#cbd5e1",
                          strokeDasharray: "4 4",
                        }}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid #e2e8f0",
                          background: "rgba(255,255,255,0.96)",
                          boxShadow:
                            "0 10px 30px rgba(15,23,42,0.10)",
                        }}
                        labelStyle={{
                          color: "#475569",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      />

                      <Area
                        type="monotone"
                        dataKey="total"
                        name="Feedback"
                        stroke="#8b5cf6"
                        strokeWidth={2.5}
                        fill="url(#trendsVolumeGradient)"
                        activeDot={{
                          r: 5,
                          strokeWidth: 3,
                          stroke: "#fff",
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/70">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Theme volume
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Most common themes in the selected period
                </p>
              </div>

              <div className="mt-6 h-[330px]">
                {loading ? (
                  <Skeleton className="h-full w-full" />
                ) : chartThemes.length === 0 ? (
                  <EmptyState
                    title="No theme activity"
                    message="Theme volume will appear after feedback has been associated with themes."
                  />
                ) : (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <BarChart
                      data={chartThemes}
                      layout="vertical"
                      margin={{
                        top: 0,
                        right: 8,
                        left: 4,
                        bottom: 0,
                      }}
                    >
                      <CartesianGrid
                        horizontal={false}
                        strokeDasharray="3 3"
                        className="stroke-slate-200 dark:stroke-slate-800"
                      />

                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        tick={{
                          fontSize: 11,
                          fill: "#94a3b8",
                        }}
                      />

                      <YAxis
                        type="category"
                        dataKey="name"
                        width={125}
                        tickLine={false}
                        axisLine={false}
                        tick={{
                          fontSize: 11,
                          fill: "#64748b",
                        }}
                      />

                      <Tooltip
                        cursor={{
                          fill: "rgba(139,92,246,0.05)",
                        }}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid #e2e8f0",
                          background: "rgba(255,255,255,0.96)",
                          boxShadow:
                            "0 10px 30px rgba(15,23,42,0.10)",
                        }}
                      />

                      <Bar
                        dataKey="count"
                        name="Feedback"
                        fill="#8b5cf6"
                        radius={[0, 7, 7, 0]}
                        barSize={22}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/70">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    Emerging themes
                  </h2>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Themes gaining momentum compared with the previous period
                  </p>
                </div>

                {!loading && data && (
                  <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                    {data.emergingThemes.length}
                  </span>
                )}
              </div>

              <div className="mt-5 space-y-2.5">
                {loading ? (
                  <>
                    <Skeleton className="h-[76px] w-full" />
                    <Skeleton className="h-[76px] w-full" />
                    <Skeleton className="h-[76px] w-full" />
                  </>
                ) : data?.emergingThemes.length === 0 ? (
                  <EmptyState
                    title="No emerging themes"
                    message="No theme currently meets the spike threshold for this period."
                  />
                ) : (
                  data?.emergingThemes.map((theme) => (
                    <ThemeRow
                      key={theme.id}
                      theme={theme}
                      selected={
                        selectedThemeId === theme.id
                      }
                      onClick={() =>
                        void loadThemeFeedback(theme.id)
                      }
                    />
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/70">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Theme trends
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Click a theme to inspect its underlying feedback
                </p>
              </div>

              <div className="mt-5 space-y-2.5">
                {loading ? (
                  <>
                    <Skeleton className="h-[76px] w-full" />
                    <Skeleton className="h-[76px] w-full" />
                    <Skeleton className="h-[76px] w-full" />
                    <Skeleton className="h-[76px] w-full" />
                  </>
                ) : data?.themeTrends.length === 0 ? (
                  <EmptyState
                    title="No theme trends yet"
                    message="Themes will appear here once feedback has been classified."
                  />
                ) : (
                  data?.themeTrends.map((theme) => (
                    <ThemeRow
                      key={theme.id}
                      theme={theme}
                      selected={
                        selectedThemeId === theme.id
                      }
                      onClick={() =>
                        void loadThemeFeedback(theme.id)
                      }
                    />
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/70">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    Theme feedback
                  </h2>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {selectedThemeId
                      ? "Feedback connected to the selected theme"
                      : "Select a theme to investigate the customer voice"}
                  </p>
                </div>

                {selectedThemeId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedThemeId(null);
                      setSelectedThemeFeedback([]);
                    }}
                    className="shrink-0 text-xs font-semibold text-violet-600 transition hover:text-violet-700 dark:text-violet-400"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="mt-5">
                {themeLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-[105px] w-full" />
                    <Skeleton className="h-[105px] w-full" />
                    <Skeleton className="h-[105px] w-full" />
                  </div>
                ) : !selectedThemeId ? (
                  <EmptyState
                    title="Choose a theme"
                    message="Click any theme on the left to see the feedback behind the trend."
                  />
                ) : selectedThemeFeedback.length === 0 ? (
                  <EmptyState
                    title="No feedback found"
                    message="There is no feedback for this theme in the selected period."
                  />
                ) : (
                  <div className="max-h-[560px] overflow-y-auto pr-1">
                    {selectedThemeFeedback.map(
                      (feedback) => (
                        <FeedbackItem
                          key={feedback.id}
                          feedback={feedback}
                        />
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {!loading &&
            data &&
            data.newThemes.length > 0 && (
              <section className="mt-6 overflow-hidden rounded-2xl border border-blue-200/70 bg-gradient-to-r from-blue-50 via-violet-50 to-fuchsia-50 p-5 shadow-sm dark:border-blue-900/40 dark:from-blue-950/20 dark:via-violet-950/20 dark:to-fuchsia-950/20">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      New themes detected
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                      These themes have feedback in the selected
                      period but had no feedback in the comparison
                      period.
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-900/60 dark:bg-slate-900/70 dark:text-blue-400">
                    {data.newThemes.length} new
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {data.newThemes.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() =>
                        void loadThemeFeedback(theme.id)
                      }
                      className="rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-white dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-900"
                    >
                      {theme.name}
                      <span className="ml-1.5 text-slate-400">
                        {theme.currentCount}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

          {error && data && (
            <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-400">
              {error}
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}