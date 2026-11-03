"use client";

import { useEffect, useState } from "react";

export function MermaidDiagram({ source, diagramId }: { source: string; diagramId: string }) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState(false);

  if (source.length > 50_000) return <pre className="max-h-96 overflow-auto rounded-xl bg-muted p-4 text-xs leading-5 text-muted-foreground">Diagram source is large; showing its text instead of rendering it.\n\n{source}</pre>;

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [{ default: mermaid }, { default: createDOMPurify }] = await Promise.all([import("mermaid"), import("dompurify")]);
        const DOMPurify = createDOMPurify(window);
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral", suppressErrorRendering: true });
        const rendered = await mermaid.render(`diagram-${diagramId.replace(/[^\w-]/g, "")}`, source);
        const safeSvg = DOMPurify.sanitize(rendered.svg, { USE_PROFILES: { svg: true, svgFilters: true } });
        if (active) setSvg(safeSvg);
      } catch {
        if (active) setError(true);
      }
    })();
    return () => { active = false; };
  }, [diagramId, source]);

  if (error) return <pre className="overflow-x-auto rounded-xl bg-muted p-4 text-xs leading-5 text-muted-foreground">{source}</pre>;
  if (!svg) return <div className="grid min-h-40 place-items-center rounded-xl bg-muted text-sm text-muted-foreground">Rendering diagram…</div>;
  return <div className="overflow-x-auto rounded-xl bg-muted p-4 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}
