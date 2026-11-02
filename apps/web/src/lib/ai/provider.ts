import "server-only";

import { OpenAIProvider } from "@mnemosyne/ai";

export function getAIProvider(): OpenAIProvider {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("AI is not configured. Add OPENAI_API_KEY to your local .env.local file.");
  return new OpenAIProvider(apiKey, process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini");
}
