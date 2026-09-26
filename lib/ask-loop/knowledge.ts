export type LoopKnowledgeEntry = {
  id: string;
  title: string;
  content: string;
  keywords: string[];
};

const LOOP_KNOWLEDGE: LoopKnowledgeEntry[] = [
  {
    id: "loop-overview",
    title: "What is LOOP?",
    content:
      "LOOP is a customer feedback intelligence application. It helps teams collect customer feedback, understand what customers value, recognize recurring problems, discover themes, analyze sentiment, monitor trends, and turn customer feedback into informed actions. The main idea of LOOP is: Listen. Understand. Act.",
    keywords: [
      "loop",
      "what is loop",
      "customer feedback intelligence",
      "feedback intelligence",
      "listen",
      "understand",
      "act",
    ],
  },

  {
    id: "overview-dashboard",
    title: "Overview dashboard",
    content:
      "The LOOP Overview dashboard provides a high-level view of customer feedback. It includes feedback volume over time, sentiment breakdown, top themes, and summary statistics such as total feedback, negative feedback percentage, and new feedback. Dashboard information is based on feedback belonging to the authenticated workspace.",
    keywords: [
      "overview",
      "dashboard",
      "home",
      "statistics",
      "stats",
      "summary",
      "feedback volume",
      "sentiment breakdown",
      "top themes",
    ],
  },

  {
    id: "feedback-create",
    title: "Creating feedback",
    content:
      "LOOP supports creating individual customer feedback. Feedback contains customer-facing content and information such as its channel and other available metadata. When feedback is added to LOOP, it becomes part of the workspace feedback dataset and can be viewed in the Feedback area.",
    keywords: [
      "create feedback",
      "add feedback",
      "new feedback",
      "submit feedback",
      "manual feedback",
      "feedback form",
    ],
  },

  {
    id: "feedback-inbox",
    title: "Feedback inbox",
    content:
      "The LOOP Feedback area provides an inbox for reviewing customer feedback. Feedback can be searched and filtered using supported filters such as channel, sentiment, theme, status, and date. Feedback has workflow statuses including NEW, REVIEWED, and ACTIONED.",
    keywords: [
      "feedback inbox",
      "inbox",
      "feedback list",
      "search feedback",
      "filter feedback",
      "feedback status",
      "new",
      "reviewed",
      "actioned",
    ],
  },

  {
    id: "feedback-trash",
    title: "Feedback trash",
    content:
      "LOOP supports moving feedback to trash instead of immediately deleting it. Trashed feedback is excluded from normal active feedback analytics and retrieval. Authorized users can restore trashed feedback or permanently delete it.",
    keywords: [
      "trash",
      "deleted feedback",
      "restore feedback",
      "permanent delete",
      "delete feedback",
      "feedback recovery",
    ],
  },

  {
    id: "feedback-csv",
    title: "Importing feedback with CSV",
    content:
      "LOOP supports importing customer feedback from CSV files. CSV import is intended to make it easier to bring existing feedback data into the workspace instead of entering each feedback item individually.",
    keywords: [
      "csv",
      "csv import",
      "import feedback",
      "upload csv",
      "csv feedback",
      "bulk feedback",
    ],
  },

  {
    id: "google-form",
    title: "Google Form integration",
    content:
      "LOOP provides a Google Form integration for receiving customer feedback through a Google Form workflow. The integration is workspace-specific and allows submitted form responses to enter the LOOP feedback system.",
    keywords: [
      "google form",
      "google forms",
      "google form integration",
      "form integration",
      "form feedback",
      "google",
    ],
  },

  {
    id: "themes-channels",
    title: "Themes and channels",
    content:
      "LOOP organizes feedback using themes and channels. Themes represent recurring areas or topics found in customer feedback, while channels represent where feedback originated. Authorized workspace members can manage themes and channels from Settings.",
    keywords: [
      "themes",
      "theme",
      "channels",
      "channel",
      "themes and channels",
      "manage themes",
      "manage channels",
      "settings",
    ],
  },

  {
    id: "trends",
    title: "Trends",
    content:
      "LOOP Trends helps teams understand how feedback changes over time. It shows feedback volume over a selected period, theme volume over time, theme trends, emerging themes, and allows users to drill into feedback associated with a theme.",
    keywords: [
      "trends",
      "trend",
      "trending",
      "emerging themes",
      "theme trends",
      "feedback over time",
      "spiking themes",
    ],
  },

  {
    id: "team",
    title: "Team and roles",
    content:
      "LOOP uses workspace roles to control access. ADMIN users manage the workspace and team. ANALYST users work with feedback and analysis. VIEWER users have read-oriented access. Server-side APIs enforce workspace membership and role permissions.",
    keywords: [
      "team",
      "members",
      "roles",
      "admin",
      "analyst",
      "viewer",
      "permissions",
      "rbac",
      "access",
    ],
  },

  {
    id: "workspace",
    title: "Workspaces",
    content:
      "A LOOP workspace represents a company or team environment. Feedback, themes, channels, reports, and users belong to a workspace. Workspace isolation is required so users can only access data belonging to their authenticated workspace.",
    keywords: [
      "workspace",
      "company",
      "team workspace",
      "workspace isolation",
      "workspace data",
    ],
  },

  {
    id: "settings",
    title: "Settings",
    content:
      "LOOP Settings provides workspace configuration options. Themes and channels can be managed there by users with the appropriate permissions. Viewer users cannot make workspace configuration changes.",
    keywords: [
      "settings",
      "workspace settings",
      "configuration",
      "themes settings",
      "channels settings",
    ],
  },

  {
    id: "ask-loop",
    title: "Ask LOOP",
    content:
      "Ask LOOP is the conversational intelligence feature of LOOP. It allows users to ask questions about their customer feedback and the LOOP application. Ask LOOP should use verified workspace data for exact statistics, semantic retrieval for feedback-related questions, and trusted LOOP knowledge for application questions. It should not invent feedback or workspace statistics.",
    keywords: [
      "ask loop",
      "askloop",
      "ask questions",
      "chat",
      "customer feedback assistant",
      "feedback assistant",
      "ai assistant",
    ],
  },

  {
    id: "sentiment",
    title: "Feedback sentiment",
    content:
      "LOOP classifies feedback sentiment as positive, neutral, or negative. Sentiment information can be used in the dashboard, Feedback area, analytics, and Ask LOOP to understand the overall customer response.",
    keywords: [
      "sentiment",
      "positive",
      "negative",
      "neutral",
      "sentiment analysis",
      "customer sentiment",
    ],
  },

  {
    id: "ai-classification",
    title: "AI feedback classification",
    content:
      "LOOP's AI classification capability analyzes incoming feedback and can determine sentiment, sentiment score, themes, and a feature-area label. The classification result is structured and validated before being stored with the feedback record.",
    keywords: [
      "ai classification",
      "classification",
      "sentiment score",
      "feature area",
      "automatic classification",
      "ai feedback",
    ],
  },

  {
    id: "ai-theme-clustering",
    title: "AI theme clustering",
    content:
      "LOOP can group similar customer feedback into named themes. Theme clustering helps identify recurring customer concerns and allows teams to understand the volume associated with different themes.",
    keywords: [
      "theme clustering",
      "clustering",
      "similar feedback",
      "group feedback",
      "ai themes",
      "theme detection",
    ],
  },

  {
    id: "voice-of-customer",
    title: "Voice of Customer reports",
    content:
      "LOOP's Voice-of-Customer reporting capability is designed to summarize customer feedback for a selected period. A report can include top themes, sentiment shifts, representative customer quotes, and recommended actions based on the available feedback.",
    keywords: [
      "voice of customer",
      "voc",
      "customer report",
      "feedback report",
      "report",
      "customer insights",
    ],
  },

  {
    id: "feedback-studio",
    title: "Feedback Studio",
    content:
      "LOOP Feedback Studio provides AI-assisted analysis workflows for feedback batches. It includes CSV upload and analysis-oriented views for understanding a set of feedback without changing the workspace feedback dataset unless the surrounding workflow explicitly imports it.",
    keywords: [
      "feedback studio",
      "studio",
      "analyze batch",
      "batch analysis",
      "csv analysis",
      "feedback analysis",
    ],
  },

  {
    id: "import-feedback",
    title: "Import Feedback",
    content:
      "LOOP has a dedicated Import Feedback workflow for bringing feedback data into a workspace. CSV is the supported bulk-import format in the application knowledge. Imported records become part of the workspace feedback dataset and can subsequently participate in analytics, themes, trends, and Ask LOOP investigation.",
    keywords: [
      "import feedback",
      "feedback import",
      "bulk import",
      "upload feedback",
      "import page",
      "csv upload",
    ],
  },

  {
    id: "reports",
    title: "Voice of Customer reports",
    content:
      "LOOP includes a Reports area for Voice-of-Customer reporting. Reports are associated with a workspace, have a title and reporting period, and contain generated report data. Ask LOOP can inspect recent report metadata when a user asks about the workspace's reporting history.",
    keywords: [
      "reports",
      "report history",
      "voice of customer",
      "voc report",
      "reporting",
      "generated report",
    ],
  },

  {
    id: "authentication",
    title: "Authentication and account flows",
    content:
      "LOOP includes login and signup flows and supports password recovery using OTP verification and a password-reset token. Authentication is workspace-scoped, and server-side APIs use the authenticated session to protect workspace data.",
    keywords: [
      "login",
      "sign in",
      "signup",
      "sign up",
      "forgot password",
      "password reset",
      "otp",
      "account",
      "authentication",
    ],
  },

  {
    id: "ask-loop-documents",
    title: "Ask LOOP uploaded documents",
    content:
      "Ask LOOP supports attaching CSV and PDF documents to a conversation. The application extracts readable text from the uploaded file and sends that document text as additional conversational evidence. The workspace feedback dataset remains available alongside the document, so a question can compare the uploaded material with workspace feedback. Image-only or scanned PDFs do not currently yield readable text through the text extractor.",
    keywords: [
      "ask loop csv",
      "ask loop pdf",
      "upload pdf",
      "upload csv",
      "attached document",
      "uploaded document",
      "compare pdf",
      "compare csv",
    ],
  },

  {
    id: "settings-theme-channel",
    title: "Settings: themes and channels",
    content:
      "The Settings area includes management for workspace themes and channels. Themes are workspace-specific named categories with descriptions, colors, and active state. Channels are workspace-specific named sources with active state. These configuration records are separate from individual feedback records but are used by feedback organization and analytics.",
    keywords: [
      "settings themes",
      "settings channels",
      "theme management",
      "channel management",
      "configure theme",
      "configure channel",
      "theme description",
      "channel source",
    ],
  },

  {
    id: "team-page",
    title: "Team management",
    content:
      "LOOP has a Team area for workspace members and role-based access. Workspace users have ADMIN, ANALYST, or VIEWER roles. Workspace membership is tied to the authenticated workspace and server-side APIs enforce access and role permissions.",
    keywords: [
      "team page",
      "manage team",
      "workspace members",
      "member roles",
      "admin role",
      "analyst role",
      "viewer role",
      "role based access",
    ],
  },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[?!.,]/g, " ")
    .replace(/\s+/g, " ");
}

function scoreEntry(
  question: string,
  entry: LoopKnowledgeEntry
): number {
  const normalizedQuestion = normalize(question);

  let score = 0;

  if (normalizedQuestion.includes(normalize(entry.title))) {
    score += 10;
  }

  for (const keyword of entry.keywords) {
    const normalizedKeyword = normalize(keyword);

    if (normalizedQuestion.includes(normalizedKeyword)) {
      score += normalizedKeyword.includes(" ")
        ? 4
        : 2;
    }
  }

  return score;
}

export function searchLoopKnowledge(
  question: string,
  limit = 3
): LoopKnowledgeEntry[] {
  const scoredEntries = LOOP_KNOWLEDGE.map((entry) => ({
    entry,
    score: scoreEntry(question, entry),
  }));

  return scoredEntries
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.entry);
}

export function getLoopKnowledgeById(
  id: string
): LoopKnowledgeEntry | null {
  return LOOP_KNOWLEDGE.find((entry) => entry.id === id) ?? null;
}

export function getAllLoopKnowledge(): LoopKnowledgeEntry[] {
  return LOOP_KNOWLEDGE;
}