export type DiagramType = "flowchart" | "sequence" | "class" | "state" | "er" | "other";

export interface GraphNode {
  id: string;
  label: string;
  type: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  relationship: string;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ParsedSection {
  id: string;
  parentId: string | null;
  heading: string;
  headingLevel: number;
  order: number;
  startLine: number;
  endLine: number;
  content: string;
}

export interface ParsedChunk {
  id: string;
  sectionId: string | null;
  order: number;
  content: string;
  tokenEstimate: number;
}

export interface ParsedDiagram {
  id: string;
  sectionId: string | null;
  type: DiagramType;
  source: string;
  graph: KnowledgeGraph;
  extractionConfidence: number;
  startLine: number;
  endLine: number;
}

export interface ParsedDocument {
  title: string;
  sections: ParsedSection[];
  chunks: ParsedChunk[];
  diagrams: ParsedDiagram[];
}
