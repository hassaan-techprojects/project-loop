import { searchLoopKnowledge } from "./lib/ask-loop/knowledge";

const questions = [
  "What is LOOP?",
  "What does LOOP do?",
  "How do I create feedback?",
  "How can I import feedback using CSV?",
  "How does Google Form integration work?",
  "What are themes and channels?",
  "What can I see on the Overview dashboard?",
  "How does the Feedback inbox work?",
  "What are the feedback statuses?",
  "What is the Trends page?",
  "What can an Admin do?",
  "What can an Analyst do?",
  "What can a Viewer do?",
  "What is Ask LOOP?",
  "How does sentiment work?",
  "What is Voice of Customer?",
];

for (const question of questions) {
  console.log(`\nQuestion: ${question}`);

  const results = searchLoopKnowledge(question, 2);

  if (results.length === 0) {
    console.log("Knowledge results: none");
    continue;
  }

  for (const result of results) {
    console.log(`- ${result.title}`);
  }
}