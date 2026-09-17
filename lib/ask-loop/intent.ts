export type AskLoopIntent =
  | "FEEDBACK_TOTAL"
  | "SENTIMENT_COUNTS"
  | "NEGATIVE_PERCENTAGE"
  | "STATUS_COUNTS"
  | "NEW_FEEDBACK_THIS_WEEK"
  | "CHANNEL_COUNTS"
  | "THEME_COUNTS"
  | "FEEDBACK_SEMANTIC"
  | "LOOP_KNOWLEDGE"
  | "TRENDS"
  | "UNKNOWN";

function normalizeQuestion(question: string): string {
  return question
    .toLowerCase()
    .trim()
    .replace(/[?!.,]/g, " ")
    .replace(/\s+/g, " ");
}

function hasAny(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => text.includes(phrase));
}

export function detectAskLoopIntent(question: string): AskLoopIntent {
  const normalized = normalizeQuestion(question);

  if (!normalized) {
    return "UNKNOWN";
  }

  // Specific negative-percentage questions.
  if (
    hasAny(normalized, [
      "negative percentage",
      "percentage negative",
      "percent negative",
      "negative percent",
      "what percentage is negative",
      "what percent is negative",
      "what percentage of feedback is negative",
      "what percent of feedback is negative",
      "what percentage of feedback are negative",
      "what percent of feedback are negative",
      "percentage of feedback that is negative",
      "percent of feedback that is negative",
      "percentage of feedback that are negative",
      "percent of feedback that are negative",
      "share of negative feedback",
    ])
  ) {
    return "NEGATIVE_PERCENTAGE";
  }

  // Questions specifically asking about this week's new feedback.
  if (
    hasAny(normalized, [
      "new this week",
      "new feedback this week",
      "feedback this week",
      "how many this week",
      "how much this week",
      "received this week",
      "new feedback recently",
      "received recently",
    ])
  ) {
    return "NEW_FEEDBACK_THIS_WEEK";
  }

  // Trends must come before theme counts.
  if (
    hasAny(normalized, [
      "trend",
      "trends",
      "trending",
      "spiking",
      "spike",
      "emerging theme",
      "emerging themes",
      "growing theme",
      "growing themes",
      "increasing theme",
      "increasing themes",
      "decreasing theme",
      "decreasing themes",
      "over time",
      "previous period",
      "compared with last period",
      "compared to last period",
      "period over period",
    ])
  ) {
    return "TRENDS";
  }

  // Status questions must come before total-feedback questions.
  if (
    hasAny(normalized, [
      "new feedback",
      "reviewed feedback",
      "actioned feedback",
      "feedback status",
      "status breakdown",
      "status count",
      "status counts",
      "how many new",
      "how many reviewed",
      "how many actioned",
      "how many are new",
      "how many are reviewed",
      "how many are actioned",
      "how many feedback are new",
      "how many feedback are reviewed",
      "how many feedback are actioned",
      "number of new feedback",
      "number of reviewed feedback",
      "number of actioned feedback",
    ])
  ) {
    return "STATUS_COUNTS";
  }

  // Sentiment count/breakdown questions.
  const asksSentiment = hasAny(normalized, [
    "sentiment",
    "positive feedback",
    "negative feedback",
    "neutral feedback",
    "positive and negative",
    "positive vs negative",
    "positive or negative",
    "positive negative neutral",
    "sentiment breakdown",
    "sentiment distribution",
  ]);

  const asksCount = hasAny(normalized, [
    "how many",
    "how much",
    "count",
    "counts",
    "number",
    "total",
    "breakdown",
    "distribution",
  ]);

  if (asksSentiment && asksCount) {
    return "SENTIMENT_COUNTS";
  }

  // Channel count questions.
  if (
    hasAny(normalized, [
      "by channel",
      "per channel",
      "channel count",
      "channel counts",
      "feedback channels",
      "which channel",
      "which channels",
      "channels have",
      "feedback from each channel",
      "feedback from channels",
      "number of feedback from each channel",
    ])
  ) {
    return "CHANNEL_COUNTS";
  }

  // Theme count questions.
  if (
    hasAny(normalized, [
      "by theme",
      "per theme",
      "theme count",
      "theme counts",
      "feedback themes",
      "which theme has the most",
      "which themes have the most",
      "themes have the most feedback",
      "feedback for each theme",
      "number of feedback for each theme",
    ])
  ) {
    return "THEME_COUNTS";
  }

  // LOOP application knowledge.
  if (
    hasAny(normalized, [
      "what is loop",
      "what does loop do",
      "how does loop work",
      "how to use loop",
      "how do i use loop",
      "how can i use loop",
      "create feedback",
      "add feedback",
      "submit feedback",
      "import feedback",
      "upload feedback",
      "csv",
      "google form",
      "google forms",
      "team",
      "workspace",
      "settings",
      "themes and channels",
      "login",
      "sign in",
      "sign up",
      "signup",
      "password",
      "ask loop",
      "overview",
      "dashboard",
      "inbox",
      "trash",
      "restore feedback",
    ])
  ) {
    return "LOOP_KNOWLEDGE";
  }

  // Exact total feedback questions.
  if (
    hasAny(normalized, [
      "how many total feedback",
      "how much total feedback",
      "total feedback",
      "total number of feedback",
      "total number of feedbacks",
      "feedback count",
      "feedback counts",
      "number of feedback",
      "number of feedbacks",
      "how many customer feedback",
      "how many pieces of feedback",
      "total customer feedback",
    ])
  ) {
    return "FEEDBACK_TOTAL";
  }

  // General customer-feedback questions use semantic retrieval.
  if (
    hasAny(normalized, [
      "customer",
      "feedback",
      "complaint",
      "complaints",
      "problem",
      "problems",
      "issue",
      "issues",
      "customer wants",
      "customers want",
      "customers are saying",
      "customers say",
      "what do customers",
      "why are customers",
      "customers complaining",
      "customers asking",
      "pain point",
      "pain points",
      "experience",
      "request",
      "requests",
      "feature",
      "features",
    ])
  ) {
    return "FEEDBACK_SEMANTIC";
  }

  return "UNKNOWN";
}