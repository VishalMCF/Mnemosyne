export function normalizeConceptName(name: string): string {
  return name.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

export function confidenceLabel(confidence: number): "high" | "medium" | "low" {
  return confidence >= 80 ? "high" : confidence >= 50 ? "medium" : "low";
}
