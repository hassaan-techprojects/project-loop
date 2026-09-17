"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import AppShell from "@/components/app-shell";

type Citation = {
  id: string;
  content: string;
  channel: string;
  customerLabel: string | null;
  sentiment: "POS" | "NEU" | "NEG" | null;
  status: "NEW" | "REVIEWED" | "ACTIONED";
  createdAt: string;
  similarity: number;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  toolsUsed?: string[];
  createdAt: string;
};

type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: string;
};

type AskLoopResponse = {
  answer?: string;
  citations?: Citation[];
  toolsUsed?: string[];
  error?: string;
};

const STORAGE_KEY = "loop-ask-conversations";

const suggestedQuestions = [
  "What are customers complaining about most?",
  "What themes are trending?",
  "What is the sentiment breakdown?",
  "Which channels generate the most feedback?",
];

function createConversation(): Conversation {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    title: "New conversation",
    messages: [],
    updatedAt: now,
  };
}

function createMessage(
  role: Message["role"],
  content: string,
  extra?: Pick<Message, "citations" | "toolsUsed">
): Message {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    citations: extra?.citations,
    toolsUsed: extra?.toolsUsed,
    createdAt: new Date().toISOString(),
  };
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function sentimentLabel(sentiment: Citation["sentiment"]) {
  if (sentiment === "POS") return "Positive";
  if (sentiment === "NEG") return "Negative";
  if (sentiment === "NEU") return "Neutral";
  return "Unknown";
}

function sentimentClass(sentiment: Citation["sentiment"]) {
  if (sentiment === "POS") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }

  if (sentiment === "NEG") {
    return "border-red-400/20 bg-red-400/10 text-red-300";
  }

  if (sentiment === "NEU") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  }

  return "border-white/10 bg-white/5 text-white/50";
}

function statusClass(status: Citation["status"]) {
  if (status === "ACTIONED") {
    return "border-blue-400/20 bg-blue-400/10 text-blue-300";
  }

  if (status === "REVIEWED") {
    return "border-violet-400/20 bg-violet-400/10 text-violet-300";
  }

  return "border-white/10 bg-white/5 text-white/50";
}

function truncateTitle(text: string) {
  const cleaned = text.replace(/\s+/g, " ").trim();

  if (cleaned.length <= 42) {
    return cleaned;
  }

  return `${cleaned.slice(0, 42)}…`;
}

function ToolBadge({ tool }: { tool: string }) {
  const labels: Record<string, string> = {
    get_analytics_summary: "Analytics",
    get_sentiment_analytics: "Sentiment",
    get_channel_analytics: "Channels",
    get_theme_analytics: "Themes",
    search_feedback: "Feedback",
    get_trends: "Trends",
    get_workspace_themes: "Themes",
    get_workspace_channels: "Channels",
    search_loop_knowledge: "LOOP knowledge",
  };

  return (
    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/40">
      {labels[tool] ?? tool}
    </span>
  );
}

function LoopMark() {
  return (
    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10">
      <span className="text-sm font-bold tracking-tight text-violet-300">
        L
      </span>

      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-violet-400 shadow-lg shadow-violet-500/50" />
    </div>
  );
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-300 [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-300 [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-300" />
    </div>
  );
}

export default function AskLoopPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState("");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState<Record<string, boolean>>(
    {}
  );

  const activeConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.id === activeConversationId
      ) ?? null,
    [conversations, activeConversationId]
  );

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);

      if (!stored) {
        const initialConversation = createConversation();

        setConversations([initialConversation]);
        setActiveConversationId(initialConversation.id);
        return;
      }

      const parsed = JSON.parse(stored) as Conversation[];

      if (!Array.isArray(parsed) || parsed.length === 0) {
        const initialConversation = createConversation();

        setConversations([initialConversation]);
        setActiveConversationId(initialConversation.id);
        return;
      }

      setConversations(parsed);
      setActiveConversationId(parsed[0]?.id ?? "");
    } catch {
      const initialConversation = createConversation();

      setConversations([initialConversation]);
      setActiveConversationId(initialConversation.id);
    }
  }, []);

  useEffect(() => {
    if (conversations.length === 0) {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(conversations)
    );
  }, [conversations]);

  function updateConversation(
    conversationId: string,
    updater: (conversation: Conversation) => Conversation
  ) {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? updater(conversation)
          : conversation
      )
    );
  }

  function handleNewConversation() {
    const conversation = createConversation();

    setConversations((current) => [conversation, ...current]);
    setActiveConversationId(conversation.id);
    setQuestion("");
    setError("");
    setEvidenceOpen({});
    setMobileHistoryOpen(false);
  }

  function handleSelectConversation(conversationId: string) {
    setActiveConversationId(conversationId);
    setError("");
    setEvidenceOpen({});
    setMobileHistoryOpen(false);
  }

  function handleSuggestedQuestion(value: string) {
    setQuestion(value);
  }

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || loading || !activeConversation) {
      return;
    }

    setLoading(true);
    setError("");

    const userMessage = createMessage("user", trimmedQuestion);

    const updatedMessages = [
      ...activeConversation.messages,
      userMessage,
    ];

    updateConversation(activeConversation.id, (conversation) => ({
      ...conversation,
      title:
        conversation.messages.length === 0
          ? truncateTitle(trimmedQuestion)
          : conversation.title,
      messages: updatedMessages,
      updatedAt: new Date().toISOString(),
    }));

    setQuestion("");

    try {
      const previousMessages = activeConversation.messages
        .slice(-10)
        .map((message) => ({
          role: message.role,
          content: message.content,
        }));

      const response = await fetch("/api/ask-loop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: trimmedQuestion,
          previousMessages,
        }),
      });

      const data = (await response.json()) as AskLoopResponse;

      if (!response.ok) {
        throw new Error(
          data.error ?? "Unable to process your question."
        );
      }

      const assistantMessage = createMessage(
        "assistant",
        data.answer ?? "I could not generate an answer.",
        {
          citations: data.citations ?? [],
          toolsUsed: data.toolsUsed ?? [],
        }
      );

      updateConversation(activeConversation.id, (conversation) => ({
        ...conversation,
        messages: [...conversation.messages, assistantMessage],
        updatedAt: new Date().toISOString(),
      }));
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "An unexpected error occurred.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleInputKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      void handleSubmit();
    }
  }

  function toggleEvidence(messageId: string) {
    setEvidenceOpen((current) => ({
      ...current,
      [messageId]: !current[messageId],
    }));
  }

  const sortedConversations = [...conversations].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() -
      new Date(a.updatedAt).getTime()
  );

  return (
    <AppShell>
      <main className="flex h-full min-h-0 overflow-hidden">
        {/* Desktop conversation history */}
        <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-black/10 lg:flex lg:flex-col">
          <div className="border-b border-white/10 p-4">
            <button
              type="button"
              onClick={handleNewConversation}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm font-medium text-violet-200 transition hover:border-violet-400/30 hover:bg-violet-500/15"
            >
              <span className="text-lg leading-none">+</span>
              New conversation
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <div className="mb-3 px-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">
                Conversations
              </p>
            </div>

            <div className="space-y-1.5">
              {sortedConversations.map((conversation) => {
                const active =
                  conversation.id === activeConversationId;

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() =>
                      handleSelectConversation(conversation.id)
                    }
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                      active
                        ? "border-violet-400/20 bg-violet-500/10"
                        : "border-transparent hover:border-white/10 hover:bg-white/[0.03]"
                    }`}
                  >
                    <p
                      className={`truncate text-sm ${
                        active
                          ? "font-medium text-white"
                          : "text-white/60"
                      }`}
                    >
                      {conversation.title}
                    </p>

                    <p className="mt-1 text-[11px] text-white/25">
                      {conversation.messages.length === 0
                        ? "No messages yet"
                        : `${conversation.messages.length} message${
                            conversation.messages.length === 1
                              ? ""
                              : "s"
                          }`}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-500/30" />
                <span className="text-xs font-medium text-white/60">
                  LOOP intelligence online
                </span>
              </div>

              <p className="mt-2 text-[11px] leading-5 text-white/25">
                Answers are grounded in your authorized workspace data.
              </p>
            </div>
          </div>
        </aside>

        {/* Mobile history */}
        {mobileHistoryOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close conversation history"
              onClick={() => setMobileHistoryOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            <aside className="relative flex h-full w-[min(88vw,340px)] flex-col border-r border-white/10 bg-[#09090f] shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 p-4">
                <div>
                  <p className="text-sm font-semibold text-white">
                    Conversations
                  </p>
                  <p className="mt-1 text-[11px] text-white/30">
                    Your recent Ask LOOP sessions
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileHistoryOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/50 transition hover:bg-white/5 hover:text-white"
                >
                  ×
                </button>
              </div>

              <div className="p-4">
                <button
                  type="button"
                  onClick={handleNewConversation}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-violet-500"
                >
                  <span className="text-lg leading-none">+</span>
                  New conversation
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-3 pb-4">
                <div className="space-y-1.5">
                  {sortedConversations.map((conversation) => {
                    const active =
                      conversation.id === activeConversationId;

                    return (
                      <button
                        key={conversation.id}
                        type="button"
                        onClick={() =>
                          handleSelectConversation(conversation.id)
                        }
                        className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                          active
                            ? "border-violet-400/20 bg-violet-500/10"
                            : "border-transparent hover:border-white/10 hover:bg-white/[0.03]"
                        }`}
                      >
                        <p
                          className={`truncate text-sm ${
                            active
                              ? "font-medium text-white"
                              : "text-white/60"
                          }`}
                        >
                          {conversation.title}
                        </p>

                        <p className="mt-1 text-[11px] text-white/25">
                          {conversation.messages.length} messages
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* Main Ask LOOP workspace */}
        <section className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileHistoryOpen(true)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/50 transition hover:bg-white/5 hover:text-white lg:hidden"
                aria-label="Open conversation history"
              >
                ☰
              </button>

              <LoopMark />

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-sm font-semibold text-white sm:text-base">
                    Ask LOOP
                  </h1>

                  <span className="hidden rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-emerald-300 sm:inline-flex">
                    Live
                  </span>
                </div>

                <p className="truncate text-[11px] text-white/30">
                  Customer feedback intelligence
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleNewConversation}
                className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-white/50 transition hover:bg-white/5 hover:text-white"
              >
                <span className="sm:hidden">New</span>
                <span className="hidden sm:inline">
                  New conversation
                </span>
              </button>
            </div>
          </header>

          {/* Conversation */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-4 py-6 sm:px-6 sm:py-8">
              {activeConversation?.messages.length === 0 ? (
                <div className="flex flex-1 flex-col justify-center">
                  <div className="mx-auto w-full max-w-2xl">
                    <div className="mb-8">
                      <div className="mb-5 flex items-center gap-3">
                        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 shadow-xl shadow-violet-950/20">
                          <span className="text-xl font-bold text-violet-300">
                            L
                          </span>

                          <span className="absolute right-2 top-2 h-2 w-2 animate-pulse rounded-full bg-violet-400" />
                        </div>
                      </div>

                      <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-violet-300/70">
                        Intelligence workspace
                      </p>

                      <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                        Ask anything about
                        <br />
                        <span className="text-white/45">
                          your customer voice.
                        </span>
                      </h2>

                      <p className="mt-4 max-w-xl text-sm leading-6 text-white/40 sm:text-base">
                        LOOP can connect feedback, sentiment, themes,
                        channels, trends, and workspace knowledge to
                        answer complex questions with grounded evidence.
                      </p>
                    </div>

                    <div>
                      <p className="mb-3 text-xs font-medium text-white/30">
                        Try asking
                      </p>

                      <div className="grid gap-2 sm:grid-cols-2">
                        {suggestedQuestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() =>
                              handleSuggestedQuestion(suggestion)
                            }
                            className="group rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left transition hover:border-violet-400/20 hover:bg-violet-500/[0.04]"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <span className="text-sm leading-5 text-white/55 transition group-hover:text-white/80">
                                {suggestion}
                              </span>

                              <span className="text-white/20 transition group-hover:translate-x-0.5 group-hover:text-violet-300">
                                →
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {activeConversation?.messages.map((message) => {
                    const isUser = message.role === "user";
                    const citations = message.citations ?? [];
                    const toolsUsed = message.toolsUsed ?? [];
                    const showEvidence =
                      evidenceOpen[message.id] ?? false;

                    return (
                      <article
                        key={message.id}
                        className={`flex gap-3 sm:gap-4 ${
                          isUser ? "justify-end" : "justify-start"
                        }`}
                      >
                        {!isUser && <LoopMark />}

                        <div
                          className={`min-w-0 ${
                            isUser
                              ? "max-w-[88%] sm:max-w-[75%]"
                              : "max-w-[92%] sm:max-w-[82%]"
                          }`}
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <span className="text-[11px] font-medium text-white/30">
                              {isUser ? "You" : "LOOP"}
                            </span>

                            <span className="text-[10px] text-white/15">
                              {formatTime(message.createdAt)}
                            </span>
                          </div>

                          <div
                            className={`rounded-2xl border p-4 sm:p-5 ${
                              isUser
                                ? "rounded-br-md border-violet-400/20 bg-violet-500/10"
                                : "rounded-bl-md border-white/10 bg-white/[0.025]"
                            }`}
                          >
                            <div className="whitespace-pre-wrap text-sm leading-7 text-white/75 sm:text-[15px]">
                              {message.content}
                            </div>
                          </div>

                          {!isUser &&
                            (toolsUsed.length > 0 ||
                              citations.length > 0) && (
                              <div className="mt-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  {toolsUsed.length > 0 && (
                                    <>
                                      <span className="text-[10px] uppercase tracking-wider text-white/20">
                                        Used
                                      </span>

                                      {toolsUsed.map((tool) => (
                                        <ToolBadge
                                          key={`${message.id}-${tool}`}
                                          tool={tool}
                                        />
                                      ))}
                                    </>
                                  )}

                                  {citations.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleEvidence(message.id)
                                      }
                                      className="ml-auto flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-medium text-white/45 transition hover:border-violet-400/20 hover:bg-violet-500/5 hover:text-violet-300"
                                    >
                                      <span>
                                        {citations.length} evidence{" "}
                                        {citations.length === 1
                                          ? "item"
                                          : "items"}
                                      </span>

                                      <span>
                                        {showEvidence ? "↑" : "↓"}
                                      </span>
                                    </button>
                                  )}
                                </div>

                                {showEvidence &&
                                  citations.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                      {citations.map((citation) => (
                                        <div
                                          key={citation.id}
                                          className="rounded-xl border border-white/10 bg-black/20 p-4"
                                        >
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-mono text-[10px] text-white/25">
                                              {citation.id}
                                            </span>

                                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/40">
                                              {citation.channel}
                                            </span>

                                            <span
                                              className={`rounded-full border px-2 py-0.5 text-[10px] ${sentimentClass(
                                                citation.sentiment
                                              )}`}
                                            >
                                              {sentimentLabel(
                                                citation.sentiment
                                              )}
                                            </span>

                                            <span
                                              className={`rounded-full border px-2 py-0.5 text-[10px] ${statusClass(
                                                citation.status
                                              )}`}
                                            >
                                              {citation.status}
                                            </span>
                                          </div>

                                          <p className="mt-3 text-sm leading-6 text-white/60">
                                            {citation.content}
                                          </p>

                                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-white/25">
                                            <span>
                                              {citation.customerLabel
                                                ? citation.customerLabel
                                                : "Customer feedback"}{" "}
                                              ·{" "}
                                              {formatDate(
                                                citation.createdAt
                                              )}
                                            </span>

                                            <span className="text-violet-300/60">
                                              {Math.round(
                                                citation.similarity * 100
                                              )}
                                              % relevance
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                              </div>
                            )}
                        </div>

                        {isUser && (
                          <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-xs font-semibold text-white/50 sm:flex">
                            You
                          </div>
                        )}
                      </article>
                    );
                  })}

                  {loading && (
                    <article className="flex gap-3 sm:gap-4">
                      <LoopMark />

                      <div className="min-w-0 max-w-[92%]">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-[11px] font-medium text-white/30">
                            LOOP
                          </span>

                          <span className="text-[10px] text-white/15">
                            Thinking
                          </span>
                        </div>

                        <div className="rounded-2xl rounded-bl-md border border-violet-400/10 bg-white/[0.025] p-5">
                          <div className="flex items-center gap-3">
                            <LoadingDots />

                            <span className="text-sm text-white/40">
                              Connecting the signals in your workspace…
                            </span>
                          </div>
                        </div>
                      </div>
                    </article>
                  )}

                  {error && !loading && (
                    <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4">
                      <p className="text-sm text-red-300">{error}</p>

                      <button
                        type="button"
                        onClick={() => setError("")}
                        className="mt-2 text-xs text-red-300/60 underline underline-offset-4 hover:text-red-300"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Composer */}
          <div className="shrink-0 border-t border-white/10 bg-black/10 px-4 pb-4 pt-3 sm:px-6 sm:pb-5">
            <div className="mx-auto w-full max-w-4xl">
              <form onSubmit={handleSubmit}>
                <div className="relative rounded-2xl border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/20 transition focus-within:border-violet-400/20 focus-within:bg-white/[0.045]">
                  <textarea
                    value={question}
                    onChange={(event) =>
                      setQuestion(event.target.value)
                    }
                    onKeyDown={handleInputKeyDown}
                    placeholder="Ask LOOP anything about your customer feedback…"
                    maxLength={1000}
                    disabled={loading}
                    rows={2}
                    className="min-h-[64px] w-full resize-none bg-transparent px-4 pb-14 pt-4 text-sm leading-6 text-white outline-none placeholder:text-white/25 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[76px] sm:px-5 sm:pt-5"
                  />

                  <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between gap-3 sm:left-5 sm:right-5">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="hidden text-[10px] text-white/20 sm:inline">
                        Enter to ask
                      </span>

                      <span className="text-[10px] text-white/20">
                        {question.length}/1000
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !question.trim()}
                      className="flex shrink-0 items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <span>
                        {loading ? "Thinking" : "Ask LOOP"}
                      </span>

                      {!loading && <span>↗</span>}
                    </button>
                  </div>
                </div>
              </form>

              <p className="mt-2 text-center text-[10px] text-white/15">
                LOOP answers from verified workspace information and
                grounded customer feedback.
              </p>
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}