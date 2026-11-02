import type { DiagramType, KnowledgeGraph } from "./types";

const idPattern = "[\\w$.-]{1,200}";
const MAX_GRAPH_NODES = 2_000;
const MAX_GRAPH_EDGES = 4_000;

export function identifyDiagram(source: string): DiagramType {
  const first = source.split(/\r?\n/).map((line) => line.trim()).find((line) => line && !line.startsWith("%%"))?.toLowerCase() ?? "";
  if (/^(flowchart|graph)\b/.test(first)) return "flowchart";
  if (first.startsWith("sequencediagram")) return "sequence";
  if (first.startsWith("classdiagram")) return "class";
  if (first.startsWith("statediagram")) return "state";
  if (first.startsWith("erdiagram")) return "er";
  return "other";
}

export function extractGraph(source: string, type: DiagramType): KnowledgeGraph {
  const nodes = new Map<string, { id: string; label: string; type: string }>();
  const edges: KnowledgeGraph["edges"] = [];
  const addNode = (id: string | undefined, label?: string, nodeType = "component") => {
    if (!id || nodes.size >= MAX_GRAPH_NODES) return;
    if (id === "[*]") {
      if (!nodes.has(id)) nodes.set(id, { id, label: "Start / end", type: "state_marker" });
      return;
    }
    const boundedId = id.slice(0, 200);
    const existing = nodes.get(boundedId);
    if (existing) {
      if (label?.trim()) existing.label = label.trim().slice(0, 500);
      if (nodeType !== "component") existing.type = nodeType;
    } else nodes.set(boundedId, { id: boundedId, label: label?.trim().slice(0, 500) || boundedId, type: nodeType });
  };
  const addEdge = (sourceId: string, targetId: string, relationship: string) => {
    const source = sourceId === "[*]" ? sourceId : sourceId.slice(0, 200);
    const target = targetId === "[*]" ? targetId : targetId.slice(0, 200);
    addNode(source);
    addNode(target);
    if (edges.length < MAX_GRAPH_EDGES && nodes.has(source) && nodes.has(target)) edges.push({ source, target, relationship: relationship.slice(0, 300) });
  };

  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("%%")) continue;
    if (type === "flowchart") {
      const endpoint = `(${idPattern})(?:\\s*(?:\\[[^\\]]*\\]|\\([^)]*\\)|\\{[^}]*\\}))?`;
      const edgePattern = new RegExp(`${endpoint}\\s*(-->|---|==>|-\\.->|--o|--x|<--|<---)\\s*(?:\\|([^|]*)\\|\\s*)?${endpoint}`, "g");
      let edge: RegExpExecArray | null;
      while ((edge = edgePattern.exec(line)) !== null) {
        addNode(edge[1], nodeLabel(line, edge[1]));
        addNode(edge[4], nodeLabel(line, edge[4]));
        addEdge(edge[1], edge[4], edge[3]?.trim() || edge[2]);
        const targetOffset = edge[0].lastIndexOf(edge[4]);
        edgePattern.lastIndex = edge.index + Math.max(1, targetOffset);
      }
      for (const match of line.matchAll(new RegExp(`(${idPattern})\\s*(?:\\[([^\\]]+)\\]|\\(([^)]+)\\)|\\{([^}]+)\\})`, "g"))) {
        addNode(match[1], match[2] ?? match[3] ?? match[4]);
      }
      const bare = new RegExp(`^(${idPattern})$`).exec(line);
      if (bare) addNode(bare[1]);
    } else if (type === "sequence") {
      const participant = /^(?:participant|actor)\s+([\w.-]+)(?:\s+as\s+(.+))?$/i.exec(line);
      if (participant) addNode(participant[1], participant[2] ?? participant[1], "participant");
      const message = /^([\w.-]+)\s*(-+>>?|-->>?|->>?|--?>|<--+|<<-+)\s*([\w.-]+)\s*:\s*(.*)$/.exec(line);
      if (message) addEdge(message[1], message[3], message[4] || message[2]);
    } else if (type === "class") {
      const relation = /^([\w.$]+)\s+(<\|\.\.\.|<\|--|\*--|o--|--\*|--o|\.\.\.|--|\.\.\|>)\s+([\w.$]+)(?:\s*:\s*(.*))?$/.exec(line);
      if (relation) addEdge(relation[1], relation[3], `${relation[2]}${relation[4] ? ` ${relation[4]}` : ""}`);
      const klass = /^class\s+([\w.$]+)/.exec(line);
      if (klass) addNode(klass[1], klass[1], "class");
    } else if (type === "state") {
      const transition = /^(?:\[\*\]|[\w.$*-]+)\s+--?>\s+(?:\[\*\]|[\w.$*-]+)(?:\s*:\s*(.*))?$/.exec(line);
      if (transition) {
        const [from, to] = line.split(/\s+--?>\s+/);
        addEdge(from!.trim(), to!.split(/\s*:/, 1)[0]!.trim(), transition[1] || "transition");
      }
    } else if (type === "er") {
      const relation = /^([\w.-]+)\s+([|o}{.]+)--([|o}{.]+)\s+([\w.-]+)\s*:\s*(.+)$/.exec(line);
      if (relation) addEdge(relation[1], relation[4], relation[5]);
    }
  }

  return { nodes: [...nodes.values()], edges };
}

function nodeLabel(line: string, id: string): string | undefined {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`${escaped}\\s*(?:\\[([^\\]]+)\\]|\\(([^)]+)\\)|\\{([^}]+)\\})`).exec(line);
  return match?.[1] ?? match?.[2] ?? match?.[3];
}
