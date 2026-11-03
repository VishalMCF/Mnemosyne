"use client";

import Link from "next/link";
import { aiErrorMessage } from "@/lib/ai/error-message";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type SourceRow = {
  id: string;
  documentId: string;
  name: string;
  title: string;
  originalFilename: string;
  status: "imported" | "parsed" | "extraction_failed" | "extracted";
  extractionVersion: number;
  lastError: string | null;
  sectionCount: number;
  conceptCount: number;
};

export function LibraryClient() {
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const response = await fetch("/api/sources", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load your local library.");
    const body = await response.json() as { sources: SourceRow[] };
    setSources(body.sources);
  }, []);

  useEffect(() => { void refresh().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load your local library.")); }, [refresh]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true); setError(""); setNotice("");
      const form = new FormData(formElement);
    try {
      const response = await fetch("/api/sources", { method: "POST", body: form });
      const body = await response.json() as { imported?: Array<{ title: string; duplicate: boolean }>; errors?: Array<{ filename: string; error: string }>; error?: string };
      if (!response.ok && !body.imported?.length) throw new Error(body.errors?.map((item) => `${item.filename}: ${item.error}`).join(" ") || body.error || "Import failed.");
      const imported = body.imported?.length ?? 0;
      const duplicates = body.imported?.filter((item) => item.duplicate).length ?? 0;
      setNotice(`${imported} file${imported === 1 ? "" : "s"} processed${duplicates ? `; ${duplicates} duplicate${duplicates === 1 ? "" : "s"} skipped` : ""}.`);
      if (body.errors?.length) setError(body.errors.map((item) => `${item.filename}: ${item.error}`).join(" "));
      formElement.reset();
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Import failed."); }
    finally { setBusy(false); }
  }

  async function extract(source: SourceRow) {
    if (!source.status || source.status === "imported") {
      setError("This source needs a successful local parse before AI extraction.");
      return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/documents/${source.documentId}/extract`, { method: "POST" });
      const body = await response.json() as { error?: string; concepts?: number; exercises?: number };
      if (!response.ok) throw new Error(body.error || "Extraction failed.");
      setNotice(`Extracted ${body.concepts ?? 0} concepts and created ${body.exercises ?? 0} exercises.`);
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Extraction failed."); await refresh(); }
    finally { setBusy(false); }
  }

  async function parse(source: SourceRow) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/documents/${source.documentId}/parse`, { method: "POST" });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Parsing failed.");
      setNotice("Markdown parsed and stored locally.");
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Parsing failed."); }
    finally { setBusy(false); }
  }

  async function remove(source: SourceRow) {
    if (!window.confirm(`Delete “${source.title}” and its generated knowledge and training history?`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/sources/${source.id}`, { method: "DELETE" });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Could not delete this source.");
      setNotice("Source and its generated knowledge were deleted.");
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not delete this source."); }
    finally { setBusy(false); }
  }

  return <div>
    <form onSubmit={upload} className="rounded-2xl border border-dashed border-border bg-card p-6 sm:p-8">
      <label className="block text-sm font-semibold" htmlFor="markdown-files">Import Markdown files</label>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">Files stay on this machine. Choose “Extract knowledge” to process this source through your signed-in Codex account.</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input id="markdown-files" name="files" type="file" accept=".md,.markdown,text/markdown,text/plain" multiple required className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-4 file:py-2 file:font-medium file:text-primary" />
        <button disabled={busy} className="shrink-0 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">{busy ? "Working…" : "Import locally"}</button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Markdown only · up to 5 MB per file · 20 files per import</p>
    </form>
    {notice && <p role="status" className="mt-4 rounded-lg bg-accent px-4 py-3 text-sm text-primary">{notice}</p>}
    {error && <p role="alert" className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

    <section className="mt-10">
      <div className="mb-4 flex items-end justify-between"><div><h2 className="text-lg font-semibold">Your sources</h2><p className="mt-1 text-sm text-muted-foreground">{sources.length} local document{sources.length === 1 ? "" : "s"}</p></div></div>
      {sources.length === 0 ? <div className="rounded-2xl border border-border bg-card p-8 text-center"><p className="font-medium">Your library is ready for its first note.</p><p className="mt-2 text-sm text-muted-foreground">Choose a Markdown file above to get started.</p></div> : <div className="space-y-3">{sources.map((source) => <article key={source.id} className="rounded-2xl border border-border bg-card p-5 sm:flex sm:items-center sm:justify-between sm:gap-6"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Link href={`/library/${source.id}`} className="truncate font-semibold hover:text-primary">{source.title}</Link><span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">{labelStatus(source.status)}</span></div><p className="mt-1 truncate text-sm text-muted-foreground">{source.originalFilename} · {source.sectionCount} sections · {source.conceptCount} concepts</p>{source.lastError && <p className="mt-2 text-xs text-destructive">{aiErrorMessage(source.lastError)}</p>}</div><div className="mt-4 flex shrink-0 flex-wrap gap-2 sm:mt-0">{source.status === "imported" && <button type="button" disabled={busy} onClick={() => void parse(source)} className="rounded-lg border border-border px-3 py-2 text-xs font-medium disabled:opacity-40">Retry local parse</button>}<button type="button" disabled={busy || source.status === "imported"} onClick={() => void extract(source)} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-primary disabled:cursor-not-allowed disabled:opacity-40">{source.status === "extracted" ? "Re-extract with AI" : "Extract knowledge with AI"}</button><button type="button" disabled={busy} onClick={() => void remove(source)} className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground disabled:opacity-40">Delete</button></div></article>)}</div>}
    </section>
  </div>;
}

function labelStatus(status: SourceRow["status"]) {
  return ({ imported: "Needs parse", parsed: "Parsed locally", extraction_failed: "AI retry available", extracted: "Knowledge ready" })[status];
}
