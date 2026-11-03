"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { aiErrorMessage } from "@/lib/ai/error-message";
import { MermaidDiagram } from "@/components/diagrams/MermaidDiagram";

type Detail = {
  source: { id: string; name: string };
  document: { id: string; title: string; originalFilename: string; status: string; lastError: string | null };
  sections: Array<{ id: string; parentId: string | null; heading: string; headingLevel: number; startLine: number; endLine: number; content: string }>;
  diagrams: Array<{ id: string; type: string; source: string; extractionConfidence: number; startLine: number; graph: { nodes: Array<{ id: string; label: string; type: string }>; edges: Array<{ source: string; target: string; relationship: string }> } }>;
  concepts: Array<{ id: string; name: string; definition: string; kind: string; confidence: number; sectionId: string }>;
  relationships: Array<{ sourceConceptId: string; targetConceptId: string; relationship: string; confidence: number }>;
};

export function SourceDetailClient({ id }: { id: string }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void fetch(`/api/sources/${id}`, { cache: "no-store" }).then(async (response) => {
      const body = await response.json() as Detail | { error: string };
      if (!response.ok) throw new Error("error" in body ? body.error : "Could not load this source.");
      if (active) setDetail(body as Detail);
    }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Could not load this source."); });
    return () => { active = false; };
  }, [id]);

  if (error) return <p role="alert" className="mt-8 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{error}</p>;
  if (!detail) return <p className="mt-8 text-sm text-muted-foreground">Loading source…</p>;
  const conceptsById = new Map<string, Detail["concepts"][number]>(detail.concepts.map((concept) => [concept.id, concept] as const));
  return <>
    <header className="mb-8 mt-10"><p className="text-sm text-muted-foreground">{detail.document.originalFilename}</p><h1 className="mt-2 break-words text-4xl font-semibold tracking-tight">{detail.document.title}</h1><p className="mt-3 text-sm text-muted-foreground">{detail.sections.length} sections · {detail.concepts.length} current concepts · {detail.diagrams.length} diagrams</p></header>
    {detail.document.lastError && <p className="mb-6 rounded-lg bg-secondary p-4 text-sm text-secondary-foreground">{aiErrorMessage(detail.document.lastError)}</p>}
    <section className="mb-10"><h2 className="mb-4 text-lg font-semibold">Knowledge graph</h2>{detail.concepts.length ? <div className="rounded-2xl border border-border bg-card p-5"><div className="flex flex-wrap gap-3">{detail.concepts.map((concept) => <article key={concept.id} className="max-w-sm rounded-xl bg-muted p-4"><div className="flex items-center justify-between gap-4"><span className="text-[10px] uppercase tracking-wider text-primary">{concept.kind}</span><span className="text-[10px] text-muted-foreground">AI confidence {concept.confidence}%</span></div><h3 className="mt-1 font-semibold">{concept.name}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{concept.definition}</p></article>)}</div>{detail.relationships.length > 0 && <div className="mt-5 border-t border-border pt-4"><h3 className="mb-3 text-sm font-medium">Relationships</h3><ul className="space-y-2">{detail.relationships.map((relation, index) => <li key={`${relation.sourceConceptId}-${relation.targetConceptId}-${index}`} className="text-sm"><strong>{conceptsById.get(relation.sourceConceptId)?.name ?? "Concept"}</strong><span className="mx-2 text-muted-foreground">— {relation.relationship} →</span><strong>{conceptsById.get(relation.targetConceptId)?.name ?? "Concept"}</strong><span className="ml-2 text-xs text-muted-foreground">{relation.confidence}%</span></li>)}</ul></div>}</div> : <div className="rounded-2xl border border-dashed border-border bg-card p-6"><p className="font-medium">No extracted concepts yet</p><p className="mt-1 text-sm text-muted-foreground">Choose “Extract knowledge with AI” in the library to build a source-linked concept graph.</p></div>}</section>
    {detail.diagrams.length > 0 && <section className="mb-10"><h2 className="mb-4 text-lg font-semibold">Mermaid diagrams</h2><div className="space-y-5">{detail.diagrams.map((diagram) => <article key={diagram.id} className="rounded-2xl border border-border bg-card p-5"><div className="mb-4 flex items-center justify-between"><h3 className="font-medium capitalize">{diagram.type} diagram</h3><span className="text-xs text-muted-foreground">Lines {diagram.startLine}–{diagram.endLine} · graph extraction {diagram.extractionConfidence}%</span></div><MermaidDiagram diagramId={diagram.id} source={diagram.source} />{diagram.graph.nodes.length > 0 && <div className="mt-4 text-xs leading-5 text-muted-foreground"><strong className="text-foreground">Parsed graph:</strong> {diagram.graph.nodes.length} nodes, {diagram.graph.edges.length} edges</div>}</article>)}</div></section>}
    <section><h2 className="mb-4 text-lg font-semibold">Document structure</h2><div className="space-y-3">{detail.sections.map((section) => <details key={section.id} className="rounded-xl border border-border bg-card"><summary className="cursor-pointer px-4 py-3 text-sm font-medium">{section.heading}<span className="ml-2 text-xs font-normal text-muted-foreground">Lines {section.startLine}–{section.endLine}</span></summary><div className="border-t border-border px-4 py-4"><pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6 text-muted-foreground">{section.content}</pre></div></details>)}</div></section>
  </>;
}
