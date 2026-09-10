"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DashboardData = {
  stats: {
    totalFeedback: number;
    positive: number;
    neutral: number;
    negative: number;
    negativePercentage: number;
    newThisWeek: number;
    activeThemes: number;
  };
  charts: {
    volumeOverTime: {
      date: string;
      total: number;
    }[];
    sentimentBreakdown: {
      sentiment: string;
      label: string;
      count: number;
    }[];
    topThemes: {
      id: string;
      name: string;
      count: number;
    }[];
  };
  recentFeedback: {
    id: string;
    content: string;
    channel: string;
    customerLabel: string | null;
    sentiment: string | null;
    status: string;
    createdAt: string;
  }[];
};

type ApiError = {
  error?: string;
};

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

function formatChannel(channel: string) {
  return channel
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

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

function StatCard({
  title,
  value,
  subtitle,
  icon,
  accent,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: ReactNode;
  accent: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800/80 dark:bg-slate-900/70">
      <div
        className={`absolute -right-8 -top-8 h-24 w-24 rounded-full ${accent} opacity-[0.08] blur-2xl transition-opacity duration-300 group-hover:opacity-[0.14]`}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {title}
          </p>

          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
            {subtitle}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800">
          {icon}
        </div>
      </div>
    </div>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-800/70 ${className}`}
    />
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
      <div className="text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
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

        <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
          {message}
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        setError(null);

        const response = await fetch("/api/dashboard", {
          method: "GET",
          cache: "no-store",
        });

        const result = (await response.json()) as DashboardData & ApiError;

        if (!response.ok) {
          throw new Error(result.error || "Failed to load dashboard.");
        }

        if (!cancelled) {
          setData(result);
        }
      } catch (dashboardError) {
        if (!cancelled) {
          setError(
            dashboardError instanceof Error
              ? dashboardError.message
              : "Failed to load dashboard."
          );
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const chartVolume = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.charts.volumeOverTime.map((item) => ({
      ...item,
      label: formatDate(item.date),
    }));
  }, [data]);

  const sentimentTotal = useMemo(() => {
    if (!data) {
      return 0;
    }

    return data.charts.sentimentBreakdown.reduce(
      (total, item) => total + item.count,
      0
    );
  }, [data]);

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-8 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-900/60 dark:bg-rose-950/20">
            <h1 className="text-lg font-semibold text-rose-700 dark:text-rose-400">
              Unable to load dashboard
            </h1>

            <p className="mt-2 text-sm text-rose-600 dark:text-rose-300">
              {error}
            </p>

            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Try again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50/80 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-5 py-7 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/85 px-6 py-7 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/75 sm:px-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />

                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Live workspace intelligence
                </span>
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                Overview
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Understand what your customers are saying, identify what
                matters most, and turn feedback into action.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <svg
                  className="h-4 w-4"
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

              <Link
                href="/feedback"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add feedback
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {!data ? (
            <>
              <Skeleton className="h-[135px]" />
              <Skeleton className="h-[135px]" />
              <Skeleton className="h-[135px]" />
              <Skeleton className="h-[135px]" />
            </>
          ) : (
            <>
              <StatCard
                title="Total Feedback"
                value={data.stats.totalFeedback}
                subtitle="Across your workspace"
                accent="bg-violet-600"
                icon={
                  <svg
                    className="h-5 w-5 text-violet-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-4 2v-5.5A7.5 7.5 0 0 1 10.5 8H12" />
                    <path d="M14 4h6v6" />
                    <path d="m20 4-7 7" />
                  </svg>
                }
              />

              <StatCard
                title="Positive"
                value={data.stats.positive}
                subtitle={`${data.stats.totalFeedback > 0 ? ((data.stats.positive / data.stats.totalFeedback) * 100).toFixed(1) : 0}% of feedback`}
                accent="bg-emerald-600"
                icon={
                  <svg
                    className="h-5 w-5 text-emerald-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M7 10v10H4V10h3ZM7 20h9.2a2 2 0 0 0 1.9-1.4l2-6A2 2 0 0 0 18.2 10H14l.8-4A2.5 2.5 0 0 0 12.35 3L8 10" />
                  </svg>
                }
              />

              <StatCard
                title="Negative"
                value={`${data.stats.negativePercentage}%`}
                subtitle={`${data.stats.negative} negative responses`}
                accent="bg-rose-600"
                icon={
                  <svg
                    className="h-5 w-5 text-rose-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M7 14V4H4v10h3ZM7 4h9.2a2 2 0 0 1 1.9 1.4l2 6A2 2 0 0 1 18.2 14H14l.8 4a2.5 2.5 0 0 1-2.45 3L8 14" />
                  </svg>
                }
              />

              <StatCard
                title="New This Week"
                value={data.stats.newThisWeek}
                subtitle={`${data.stats.activeThemes} active themes`}
                accent="bg-blue-600"
                icon={
                  <svg
                    className="h-5 w-5 text-blue-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M4 19V5M4 19h16" />
                    <path d="m7 15 3-4 3 2 4-6" />
                  </svg>
                }
              />
            </>
          )}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
          <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/70">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Feedback volume
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Daily feedback activity over the last 30 days
                </p>
              </div>

              <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                30 days
              </span>
            </div>

            <div className="mt-6 h-[300px]">
              {!data ? (
                <Skeleton className="h-full w-full" />
              ) : chartVolume.length === 0 ? (
                <EmptyChart message="No feedback activity yet." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartVolume}
                    margin={{
                      top: 8,
                      right: 4,
                      left: -24,
                      bottom: 0,
                    }}
                  >
                    <defs>
                      <linearGradient
                        id="volumeGradient"
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
                        boxShadow: "0 10px 30px rgba(15,23,42,0.10)",
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
                      fill="url(#volumeGradient)"
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

          <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/70">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Sentiment breakdown
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                How customers feel about your product
              </p>
            </div>

            <div className="relative mt-2 h-[235px]">
              {!data ? (
                <Skeleton className="h-full w-full rounded-full opacity-50" />
              ) : sentimentTotal === 0 ? (
                <EmptyChart message="No sentiment data yet." />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.charts.sentimentBreakdown}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={88}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {data.charts.sentimentBreakdown.map((entry) => (
                          <Cell
                            key={entry.sentiment}
                            fill={
                              entry.sentiment === "POS"
                                ? "#10b981"
                                : entry.sentiment === "NEG"
                                  ? "#f43f5e"
                                  : "#94a3b8"
                            }
                          />
                        ))}
                      </Pie>

                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid #e2e8f0",
                          background: "rgba(255,255,255,0.96)",
                          boxShadow: "0 10px 30px rgba(15,23,42,0.10)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                        {sentimentTotal}
                      </p>

                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        responses
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {data && (
              <div className="grid grid-cols-3 gap-2">
                {data.charts.sentimentBreakdown.map((item) => {
                  const style = sentimentStyles[item.sentiment];

                  return (
                    <div
                      key={item.sentiment}
                      className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60"
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${style?.dotClassName ?? "bg-slate-400"}`}
                        />

                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {item.label}
                        </span>
                      </div>

                      <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                        {item.count}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.55fr]">
          <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/70">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Top themes
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Topics appearing most often
                </p>
              </div>

              <button
                type="button"
                className="text-xs font-semibold text-violet-600 transition hover:text-violet-700 dark:text-violet-400"
              >
                View all
              </button>
            </div>

            <div className="mt-6">
              {!data ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-[90%]" />
                  <Skeleton className="h-8 w-[82%]" />
                  <Skeleton className="h-8 w-[74%]" />
                  <Skeleton className="h-8 w-[66%]" />
                </div>
              ) : data.charts.topThemes.length === 0 ? (
                <EmptyChart message="No themes available yet." />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={data.charts.topThemes}
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
                      width={105}
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
                        boxShadow: "0 10px 30px rgba(15,23,42,0.10)",
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
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Recent feedback
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  The latest customer voice from your workspace
                </p>
              </div>

              <button
                type="button"
                className="text-xs font-semibold text-violet-600 transition hover:text-violet-700 dark:text-violet-400"
              >
                View inbox
              </button>
            </div>

            <div className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
              {!data ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : data.recentFeedback.length === 0 ? (
                <div className="flex h-[260px] items-center justify-center">
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      No feedback yet
                    </p>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                      Customer feedback will appear here.
                    </p>
                  </div>
                </div>
              ) : (
                data.recentFeedback.map((feedback) => {
                  const sentiment = feedback.sentiment
                    ? sentimentStyles[feedback.sentiment]
                    : null;

                  const statusClass =
                    statusStyles[feedback.status] ??
                    "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";

                  return (
                    <div
                      key={feedback.id}
                      className="group flex gap-4 py-4 first:pt-1 last:pb-1"
                    >
                      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/15 via-fuchsia-500/10 to-blue-500/15 text-xs font-semibold text-violet-700 dark:text-violet-300">
                        {feedback.customerLabel
                          ? feedback.customerLabel.charAt(0).toUpperCase()
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

                        <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-slate-700 dark:text-slate-300">
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
                })
              )}
            </div>
          </div>
        </section>

        {data && (
          <section className="mt-6 overflow-hidden rounded-2xl border border-violet-200/70 bg-gradient-to-r from-violet-50 via-fuchsia-50 to-blue-50 p-5 shadow-sm dark:border-violet-900/40 dark:from-violet-950/20 dark:via-fuchsia-950/15 dark:to-blue-950/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm dark:bg-slate-900/70">
                  <svg
                    className="h-5 w-5 text-violet-600 dark:text-violet-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M9 18h6M10 22h4" />
                    <path d="M8.5 14.5a7 7 0 1 1 7 0c-.8.6-1.5 1.4-1.8 2.5h-3.4c-.3-1.1-1-1.9-1.8-2.5Z" />
                  </svg>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Your customer voice is ready for deeper analysis.
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                    LOOP has {data.stats.totalFeedback} feedback items across{" "}
                    {data.stats.activeThemes} active themes. AI-powered
                    insights and Ask LOOP can build on this foundation.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="shrink-0 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                Explore insights
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}