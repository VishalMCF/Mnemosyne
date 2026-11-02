import { describe, expect, it } from "vitest";
import { extractGraph, identifyDiagram, parseMarkdown } from "@mnemosyne/ingestion";

describe("Markdown ingestion", () => {
  it("preserves headings, hierarchy, tables, code, and Mermaid provenance", () => {
    const markdown = [
      "# Request lifecycle",
      "",
      "## Middleware",
      "Middleware wraps request handling.",
      "",
      "| Stage | Work |",
      "| --- | --- |",
      "| Auth | Check identity |",
      "",
      "```ts",
      "next();",
      "```",
      "",
      "```mermaid",
      "flowchart LR",
      "Client[Browser] -->|sends| API[Handler]",
      "API --> DB[(SQLite)] --> Cache[Cache]",
      "```",
    ].join("\n");
    const parsed = parseMarkdown("doc-1", markdown);
    expect(parsed.title).toBe("Request lifecycle");
    expect(parsed.sections).toHaveLength(2);
    expect(parsed.sections[1]?.parentId).toBe(parsed.sections[0]?.id);
    expect(parsed.sections[1]?.startLine).toBe(3);
    expect(parsed.chunks.some((chunk) => chunk.content.includes("| Stage | Work |"))).toBe(true);
    expect(parsed.chunks.some((chunk) => chunk.content.includes("next();"))).toBe(true);
    expect(parsed.diagrams).toHaveLength(1);
    expect(parsed.diagrams[0]?.startLine).toBe(14);
    expect(parsed.diagrams[0]?.graph.nodes.map((node) => node.label)).toContain("Browser");
    expect(parsed.diagrams[0]?.graph.edges).toHaveLength(3);
  });

  it("handles content without headings as an introduction section", () => {
    const parsed = parseMarkdown("doc-2", "First paragraph.\n\nSecond paragraph.");
    expect(parsed.sections[0]?.heading).toBe("Introduction");
    expect(parsed.chunks[0]?.sectionId).toBe(parsed.sections[0]?.id);
  });
});

describe("Mermaid graph extraction", () => {
  it.each([
    ["sequenceDiagram\nparticipant A as Browser\nA->>B: request", "sequence", 2, 1],
    ["classDiagram\nclass API\nController <|-- API", "class", 2, 1],
    ["stateDiagram-v2\n[*] --> Idle\nIdle --> Ready: start", "state", 3, 2],
    ["erDiagram\nUSER ||--o{ ORDER : places", "er", 2, 1],
  ] as const)("parses %s", (source, type, nodes, edges) => {
    expect(identifyDiagram(source)).toBe(type);
    const graph = extractGraph(source, type);
    expect(graph.nodes).toHaveLength(nodes);
    expect(graph.edges).toHaveLength(edges);
  });
});
