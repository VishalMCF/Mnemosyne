import "server-only";

import { CodexProvider, DEFAULT_CODEX_MODEL } from "@mnemosyne/ai";

export function getAIProvider(): CodexProvider {
  return new CodexProvider(
    process.env.CODEX_MODEL?.trim() || DEFAULT_CODEX_MODEL,
    process.env.CODEX_BIN?.trim() || "codex",
  );
}
