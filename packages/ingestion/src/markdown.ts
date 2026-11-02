import { createHash } from "node:crypto";
import { unified } from "unified";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { extractGraph, identifyDiagram } from "./graph";
import type { ParsedChunk, ParsedDiagram, ParsedDocument, ParsedSection } from "./types";

const MAX_CHUNK_CHARS = 5_000;

type AstNode = {
  type: string;
  value?: string;
  lang?: string | null;
  depth?: number;
  position?: { start: { line: number }; end: { line: number } };
  children?: AstNode[];
};

export function parseMarkdown(documentId: string, source: string): ParsedDocument {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(source);
  const lines = source.split(/\r?\n/);
  const blocks = tree.children as unknown as AstNode[];
  const headings = blocks.flatMap((node) => node.type === "heading" && node.position
    ? [{ line: node.position.start.line, level: node.depth ?? 1, text: stringify(node) }]
    : []);
  const title = headings.find((heading) => heading.level === 1)?.text || firstMeaningfulLine(lines) || "Untitled document";
  const sections: ParsedSection[] = [];
  const hierarchy: ParsedSection[] = [];
  const introEnd = headings[0]?.line ? headings[0].line - 1 : lines.length;

  if (introEnd > 0 && lines.slice(0, introEnd).join("\n").trim()) {
    sections.push(createSection(documentId, sections.length, null, "Introduction", 0, 1, introEnd, lines));
  }

  for (let i = 0; i < headings.length; i += 1) {
    const heading = headings[i]!;
    while (hierarchy.length && hierarchy[hierarchy.length - 1]!.headingLevel >= heading.level) hierarchy.pop();
    const nextSameOrHigher = headings.slice(i + 1).find((next) => next.level <= heading.level);
    const sectionEnd = nextSameOrHigher ? nextSameOrHigher.line - 1 : lines.length;
    const section = createSection(documentId, sections.length, hierarchy.at(-1)?.id ?? null, heading.text, heading.level, heading.line, sectionEnd, lines);
    sections.push(section);
    hierarchy.push(section);
  }

  const chunks = chunkAstBlocks(documentId, blocks, sections, lines);
  const diagrams: ParsedDiagram[] = [];
  for (const node of blocks) {
    if (node.type !== "code" || node.lang?.toLowerCase() !== "mermaid" || !node.position) continue;
    const diagramSource = node.value?.trim() ?? "";
    if (!diagramSource) continue;
    const startLine = node.position.start.line;
    const endLine = node.position.end.line;
    const sectionId = sectionForLine(sections, startLine);
    const type = identifyDiagram(diagramSource);
    const graph = extractGraph(diagramSource, type);
    diagrams.push({
      id: stableId(documentId, "diagram", startLine, diagramSource),
      sectionId,
      type,
      source: diagramSource,
      graph,
      extractionConfidence: type === "other" ? 25 : graph.edges.length ? 80 : graph.nodes.length ? 55 : 35,
      startLine,
      endLine,
    });
  }
  return { title, sections, chunks, diagrams };
}

function createSection(
  documentId: string,
  order: number,
  parentId: string | null,
  heading: string,
  headingLevel: number,
  startLine: number,
  endLine: number,
  lines: string[],
): ParsedSection {
  const boundedEnd = Math.max(startLine, endLine);
  return {
    id: stableId(documentId, "section", startLine, heading),
    parentId,
    heading,
    headingLevel,
    order,
    startLine,
    endLine: boundedEnd,
    content: lines.slice(startLine - 1, boundedEnd).join("\n").trim(),
  };
}

function chunkAstBlocks(documentId: string, blocks: AstNode[], sections: ParsedSection[], lines: string[]): ParsedChunk[] {
  const chunks: ParsedChunk[] = [];
  let activeSectionId: string | null = null;
  let buffer = "";
  const flush = () => {
    const content = buffer.trim();
    if (!content) return;
    const order = chunks.length;
    chunks.push({
      id: stableId(documentId, "chunk", order + 1, content.slice(0, 200)),
      sectionId: activeSectionId,
      order,
      content,
      tokenEstimate: Math.max(1, Math.ceil(content.length / 4)),
    });
    buffer = "";
  };

  for (const node of blocks) {
    if (!node.position) continue;
    if (node.type === "heading") {
      const section = sections.find((candidate) => candidate.startLine === node.position?.start.line);
      if (section) {
        if (buffer && activeSectionId !== section.id) flush();
        activeSectionId = section.id;
      }
    }
    const startLine = node.position.start.line;
    const endLine = node.position.end.line;
    const content = node.type === "code" && node.lang?.toLowerCase() === "mermaid"
      ? `Mermaid diagram (${identifyDiagram(node.value ?? "")}):\n${node.value ?? ""}`
      : lines.slice(startLine - 1, endLine).join("\n");
    const clean = content.trim();
    if (!clean) continue;
    for (let offset = 0; offset < clean.length; offset += MAX_CHUNK_CHARS) {
      const part = clean.slice(offset, offset + MAX_CHUNK_CHARS);
      if (buffer && buffer.length + part.length + 2 > MAX_CHUNK_CHARS) flush();
      buffer += `${buffer ? "\n\n" : ""}${part}`;
      if (buffer.length >= MAX_CHUNK_CHARS) flush();
    }
  }
  flush();
  return chunks;
}

function stringify(node: AstNode): string {
  const values: string[] = [];
  const visit = (current: AstNode) => {
    if (typeof current.value === "string") values.push(current.value);
    for (const child of current.children ?? []) visit(child);
  };
  visit(node);
  return values.join("").trim();
}

function firstMeaningfulLine(lines: string[]): string | undefined {
  return lines.map((line) => line.trim()).find((line) => line && !line.startsWith("<!--"))?.replace(/^#+\s*/, "").slice(0, 160);
}

function sectionForLine(sections: ParsedSection[], line: number): string | null {
  return [...sections].reverse().find((section) => section.startLine <= line && section.endLine >= line)?.id ?? null;
}

function stableId(documentId: string, kind: string, position: number, value: string): string {
  return createHash("sha256").update(`${documentId}\0${kind}\0${position}\0${value}`).digest("hex").slice(0, 32);
}
