"use client";

import { useEffect, useState } from "react";
import type { ExtractionRun } from "@/lib/knowledge/extraction-run-store";

const active = (run: ExtractionRun) => !["completed", "failed", "interrupted"].includes(run.stage);

export function ExtractionProgress({ documentId, runId, onFinished }: { documentId: string; runId?: string; onFinished: () => Promise<void> }) {
  const [run, setRun] = useState<ExtractionRun | null>(null);
  const [connectionError, setConnectionError] = useState("");
  const [now, setNow] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let notified = false;
    async function poll() {
      try {
        const query = runId ? `?runId=${encodeURIComponent(runId)}` : "";
        const response = await fetch(`/api/documents/${documentId}/extract${query}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Could not read extraction status");
        const body = await response.json() as { run: ExtractionRun | null };
        if (cancelled) return;
        setRun(body.run); setConnectionError(""); setNow(Date.now());
        if (body.run && !active(body.run)) {
          if (!notified) { notified = true; await onFinished(); }
          return;
        }
        if (!body.run && !runId) return;
      } catch {
        if (cancelled) return;
        setConnectionError("Status connection lost. Retrying automatically; this does not mean extraction failed.");
      }
      if (!cancelled) timer = setTimeout(() => void poll(), 2000);
    }
    setRun(null); setCopied(false);
    void poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [documentId, runId, onFinished]);

  useEffect(() => {
    if (!run || !active(run)) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [run]);

  if (!run && !runId && !connectionError) return null;
  const displayedId = run?.runId ?? runId;
  const elapsed = run ? Math.max(0, Math.floor(((active(run) ? now || Date.now() : Date.parse(run.updatedAt)) - Date.parse(run.startedAt)) / 1000)) : 0;
  const duration = `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;
  return <section className="mt-2 rounded-xl border border-border bg-muted/50 p-4" aria-label="Extraction progress">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p role="status" className="text-sm font-medium">{run ? `${run.stage[0].toUpperCase()}${run.stage.slice(1)} · ${duration}` : "Starting extraction…"}</p>
      {run && <span className="text-xs text-muted-foreground">Updated {new Date(run.updatedAt).toLocaleTimeString()}</span>}
    </div>
    <p className="mt-2 text-sm text-muted-foreground">{run?.message ?? "Waiting for the server to register this run."}</p>
    {run && <div className="mt-3">
      <progress aria-label="Document batches completed" className="h-2 w-full accent-primary" value={run.totalBatches ? run.completedBatches : active(run) ? undefined : 0} max={run.totalBatches || 1} />
      <p className="mt-1 text-xs text-muted-foreground">{run.totalBatches ? `${run.completedBatches} of ${run.totalBatches} batches complete` : "Preparing document batches"}{run.stage === "analyzing" && " · Progress updates when each Codex response arrives."}</p>
    </div>}
    {!!run?.resumedBatches && <p className="mt-2 text-xs text-muted-foreground">Resumed with {run.resumedBatches} saved batches. Codex only processes the remaining batches.</p>}
    {run && ["failed", "interrupted"].includes(run.stage) && <p className="mt-2 text-xs text-muted-foreground">Click Resume extraction to reuse saved batches and continue. Saved batches must match the current source, model, and extraction settings.</p>}
    {connectionError && <p role="alert" className="mt-2 text-xs text-destructive">{connectionError}</p>}
    {displayedId && <div className="mt-3 flex flex-wrap items-center gap-2 text-xs"><span className="text-muted-foreground">Run ID:</span><code className="select-all break-all">{displayedId}</code><button type="button" className="rounded border border-border px-2 py-1" onClick={() => { void navigator.clipboard.writeText(displayedId).then(() => setCopied(true)).catch(() => setConnectionError("Select the run ID to copy it manually.")); }}>{copied ? "Copied" : "Copy ID"}</button></div>}
    {run && <details className="mt-3 text-xs"><summary className="cursor-pointer font-medium">Stage history</summary><ol className="mt-2 space-y-2">{run.events.map((event, index) => <li key={index} className="text-muted-foreground"><time>{new Date(event.at).toLocaleTimeString()}</time> · {event.message}</li>)}</ol></details>}
  </section>;
}
