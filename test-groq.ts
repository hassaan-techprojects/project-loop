import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config({ path: ".env.local" });

async function main() {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const groq = new Groq({
    apiKey,
  });

  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-20b",
    messages: [
      {
        role: "user",
        content: "Reply exactly with: Hello LOOP",
      },
    ],
  });

  console.log(completion.choices[0]?.message?.content ?? "");
}

main().catch((error) => {
  console.error("Groq test failed:", error);
  process.exit(1);
});