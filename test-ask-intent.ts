import { detectAskLoopIntent } from "./lib/ask-loop/intent";

const questions = [
  "How many total feedback are there?",
  "How many positive and negative feedback are there?",
  "What percentage of feedback is negative?",
  "How many feedback are new?",
  "How many new feedback did we receive this week?",
  "Show me feedback by channel",
  "Which themes have the most feedback?",
  "What are customers complaining about most?",
  "What problems are customers having with billing?",
  "What is LOOP?",
  "How do I create feedback?",
  "How does Google Form integration work?",
  "Which themes are trending?",
  "What are customers saying about the mobile experience?",
  "Tell me something unrelated",
];

for (const question of questions) {
  console.log(`\nQuestion: ${question}`);
  console.log(`Intent:   ${detectAskLoopIntent(question)}`);
}