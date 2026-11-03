// Translate setup failures saved before the switch to Codex authentication.
export function aiErrorMessage(message: string): string {
  return message.includes("OPENAI_API_KEY")
    ? "Retry extraction using your signed-in Codex account."
    : message;
}
