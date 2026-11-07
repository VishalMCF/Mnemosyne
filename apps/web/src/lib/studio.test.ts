import { describe, expect, it } from "vitest";
import {
  blankGraph,
  compareGraph,
  documents,
  referenceGraph,
} from "../components/studio/data";

describe("studio reconstruction comparison", () => {
  it("starts a memory exercise with no answer nodes or edges", () => {
    const empty = blankGraph();
    expect(empty).toEqual({ nodes: [], edges: [] });
    const result = compareGraph(empty, referenceGraph(documents[0]!));
    expect(result.score).toBe(0);
    expect(result.correct).toHaveLength(0);
    expect(result.missing).toHaveLength(4);
  });
  it("compares labels rather than generated node IDs", () => {
    const reference = referenceGraph(documents[0]!);
    const learner = {
      nodes: reference.nodes.map((node) => ({
        ...node,
        id: `mine-${node.id}`,
      })),
      edges: reference.edges.map((edge) => ({
        ...edge,
        id: `mine-${edge.id}`,
        from: `mine-${edge.from}`,
        to: `mine-${edge.to}`,
      })),
    };
    expect(compareGraph(learner, reference)).toMatchObject({
      score: 100,
      missing: [],
      extra: [],
      incorrectEdges: [],
    });
  });
  it("identifies reversed relationships and extra concepts", () => {
    const reference = referenceGraph(documents[0]!);
    const learner = {
      nodes: [
        ...reference.nodes,
        { id: "extra", label: "Unrelated", x: 0, y: 0 },
      ],
      edges: reference.edges.map((edge) => ({
        ...edge,
        from: edge.to,
        to: edge.from,
      })),
    };
    const result = compareGraph(learner, reference);
    expect(result.correct).toHaveLength(4);
    expect(result.extra).toEqual(["Unrelated"]);
    expect(result.correctEdges).toHaveLength(0);
    expect(result.incorrectEdges).toHaveLength(3);
    expect(result.score).toBeLessThan(100);
  });
  it("does not inflate the score for duplicate recalled labels", () => {
    const reference = referenceGraph(documents[0]!);
    const repeated = {
      nodes: Array.from({ length: 10 }, (_, index) => ({
        ...reference.nodes[0]!,
        id: String(index),
      })),
      edges: [],
    };
    expect(compareGraph(repeated, reference).correct).toHaveLength(1);
  });
  it("provides a grounded graph and distinct exercise for every sample document", () => {
    for (const doc of documents) {
      const graph = referenceGraph(doc);
      expect(doc.sections).toHaveLength(4);
      expect(doc.scenario.length).toBeGreaterThan(100);
      expect(graph.nodes).toHaveLength(4);
      for (const edge of graph.edges) {
        expect(graph.nodes.some((node) => node.id === edge.from)).toBe(true);
        expect(graph.nodes.some((node) => node.id === edge.to)).toBe(true);
      }
      expect(compareGraph(graph, graph).score).toBe(100);
    }
  });
});
