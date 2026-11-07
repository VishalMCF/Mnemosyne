"use client";

import Link from "next/link";
import { SourceContent } from "@/components/content/SourceContent";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type SourceReference = { documentId: string; title: string; sectionId: string; heading: string; startLine: number };
type Exercise = { id: string; prompt: string; type: string; difficulty: number; dueAt: string; sources: SourceReference[] };
type Evaluation = { score: number; correctness: number; completeness: number; explanation: string; missingPoints: string[]; misconceptions: string[]; sourceReferences: Array<{ documentTitle: string; sectionHeading: string; startLine: number }> };

export function TrainingClient() {
  const [dueCount, setDueCount] = useState(0);
  const [queue, setQueue] = useState<Exercise[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [confidence, setConfidence] = useState(3);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showHints, setShowHints] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [expectedAnswer, setExpectedAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [startedAt, setStartedAt] = useState(0);

  const refreshDue = useCallback(async () => {
    const response = await fetch("/api/sessions", { cache: "no-store" });
    const body = await response.json() as { count?: number };
    if (response.ok) setDueCount(body.count ?? 0);
  }, []);
  useEffect(() => { void refreshDue(); }, [refreshDue]);

  async function startSession() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/sessions", { method: "POST" });
      const body = await response.json() as { error?: string; sessionId: string | null; exercises: Exercise[] };
      if (!response.ok) throw new Error(body.error || "Could not start a session.");
      setQueue(body.exercises);
      setSessionId(body.sessionId ?? "");
      setIndex(0); setAnswer(""); setEvaluation(null); setExpectedAnswer(""); setStartedAt(Date.now()); setHintsUsed(0); setShowHints(false);
      await refreshDue();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not start a session."); }
    finally { setBusy(false); }
  }

  async function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sessionId || !current) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/sessions/${sessionId}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId: current.id, answer, confidence, hintsUsed, latencyMs: Math.max(0, Date.now() - startedAt) }),
      });
      const body = await response.json() as { error?: string; evaluation?: Evaluation; expectedAnswer?: string };
      if (!response.ok) throw new Error(body.error || "Could not evaluate this response.");
      setEvaluation(body.evaluation ?? null);
      setExpectedAnswer(body.expectedAnswer ?? "");
      await refreshDue();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not evaluate this response."); }
    finally { setBusy(false); }
  }

  function nextExercise() {
    setIndex((value) => value + 1);
    setAnswer(""); setEvaluation(null); setExpectedAnswer(""); setConfidence(3); setHintsUsed(0); setShowHints(false); setStartedAt(Date.now());
  }

  const current = queue[index];
  const done = Boolean(sessionId) && index >= queue.length;

  if (!sessionId) return <section className="mt-8 rounded-2xl border border-border bg-card p-7 sm:p-10">
    <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-accent text-xl text-primary">◎</div>
    <p className="text-sm text-muted-foreground">{dueCount} review{dueCount === 1 ? "" : "s"} ready</p>
    <h2 className="mt-1 text-2xl font-semibold">Practice from memory.</h2>
    <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Answer before looking at your notes. Mnemosyne will compare your response with the original source and keep recall, explanation, and reasoning as separate skills.</p>
    {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    {dueCount ? <button onClick={() => void startSession()} disabled={busy} className="mt-6 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">{busy ? "Preparing…" : "Start review"}</button> : <div className="mt-6 rounded-xl bg-muted p-4 text-sm text-muted-foreground">Your queue is clear. <Link className="font-medium text-primary" href="/library">Add a source to create exercises →</Link></div>}
  </section>;

  if (done || !current) return <section className="mt-8 rounded-2xl border border-border bg-card p-8 sm:p-10">
    <p className="text-sm text-primary">Session complete</p><h2 className="mt-2 text-3xl font-semibold">Good work showing up.</h2><p className="mt-2 text-sm text-muted-foreground">Your answers and review schedule are saved locally. You can see progress by skill in Analytics.</p><div className="mt-6 flex flex-wrap gap-3"><button onClick={() => { setSessionId(""); setQueue([]); }} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">Return to training</button><Link className="rounded-lg border border-border px-4 py-2.5 text-sm" href="/analytics">View progress</Link></div>
  </section>;

  return <section className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-8">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-muted-foreground">{prettyType(current.type)} · difficulty {current.difficulty}/5</p><h2 className="mt-2 text-lg font-semibold">Review {index + 1} of {queue.length}</h2></div><div className="h-2 w-32 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${((index + (evaluation ? 1 : 0)) / queue.length) * 100}%` }} /></div></div>
    <div className="rounded-xl bg-muted p-5 text-base leading-7"><SourceContent source={current.prompt}/></div>
    {!evaluation ? <form onSubmit={submitAnswer} className="mt-5">
      <p className="mb-3 text-xs leading-5 text-muted-foreground">Codex evaluates your answer against the exercise’s cited source sections using your signed-in account.</p>
      <label htmlFor="answer" className="mb-2 block text-sm font-medium">Your answer</label>
      <textarea id="answer" value={answer} onChange={(event) => setAnswer(event.target.value)} rows={7} maxLength={10_000} required placeholder="Write what you remember. You can refine your answer before submitting." className="w-full resize-y rounded-xl border border-input bg-background p-4 text-sm leading-6 outline-none focus:border-ring" />
      <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-4"><label className="text-sm">Confidence <select value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} className="ml-2 rounded-lg border border-input bg-background px-2 py-2">{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} / 5</option>)}</select></label><button type="button" onClick={() => { setShowHints((value) => !value); if (!showHints) setHintsUsed((value) => value + 1); }} className="text-sm text-primary">{showHints ? "Hide source hints" : "Show source hints"}</button><button disabled={busy || !answer.trim()} className="ml-auto rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">{busy ? "Evaluating…" : "Submit answer"}</button></div>
      {showHints && <div className="mt-4 rounded-lg bg-secondary p-4 text-sm text-secondary-foreground"><strong>Source locations</strong><ul className="mt-2 list-inside list-disc">{current.sources.map((source) => <li key={source.sectionId}>{source.title} · {source.heading} · line {source.startLine}</li>)}</ul></div>}
    </form> : <div className="mt-5 space-y-4">
      <div className="grid gap-3 sm:grid-cols-3"><ScoreCard label="Overall" value={evaluation.score} /><ScoreCard label="Correctness" value={evaluation.correctness} /><ScoreCard label="Completeness" value={evaluation.completeness} /></div>
      <div className="rounded-xl bg-accent p-5"><h3 className="text-sm font-semibold">Feedback</h3><div className="mt-2 text-sm leading-6"><SourceContent source={evaluation.explanation}/></div></div>
      {evaluation.missingPoints.length > 0 && <FeedbackList title="Points to add" items={evaluation.missingPoints} />}
      {evaluation.misconceptions.length > 0 && <FeedbackList title="Misconceptions to revisit" items={evaluation.misconceptions} />}
      <details className="rounded-xl border border-border p-4"><summary className="cursor-pointer text-sm font-medium">Compare with the source answer</summary><div className="mt-3 text-sm leading-6 text-muted-foreground"><SourceContent source={expectedAnswer}/></div><p className="mt-3 text-xs text-muted-foreground">Evidence: {evaluation.sourceReferences.map((source) => `${source.documentTitle} · ${source.sectionHeading}, line ${source.startLine}`).join("; ") || "Original source"}</p></details>
      <button onClick={nextExercise} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">{index + 1 === queue.length ? "Finish session" : "Next exercise →"}</button>
    </div>}
    {error && <p role="alert" className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
  </section>;
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-muted p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}<span className="ml-1 text-sm font-normal text-muted-foreground">/100</span></p></div>;
}

function FeedbackList({ title, items }: { title: string; items: string[] }) {
  return <div className="rounded-xl border border-border p-4"><h3 className="text-sm font-semibold">{title}</h3><ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-6 text-muted-foreground">{items.map((item, index) => <li key={`${index}-${item}`}><SourceContent source={item}/></li>)}</ul></div>;
}

function prettyType(value: string) { return value.replaceAll("_", " "); }
