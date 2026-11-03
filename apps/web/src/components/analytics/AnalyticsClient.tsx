"use client";

import { useEffect, useState } from "react";

type Analytics = {
  overview: { documents: number; sections: number; concepts: number; exercises: number; dueReviews: number; reviewsThisWeek: number; coveragePercent: number };
  weakConcepts: Array<{ conceptId: string; name: string; score: number; attempts: number; dimension: string }>;
  knowledgeGaps: Array<{ text: string; kind: "missing point" | "misconception"; count: number }>;
  weeklyRetention: Array<{ week: string; count: number; correctness: number; completeness: number }>;
};

export function AnalyticsClient() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void fetch("/api/analytics", { cache: "no-store" }).then(async (response) => {
      const body = await response.json() as Analytics | { error?: string };
      if (!response.ok) throw new Error("error" in body ? body.error || "Analytics unavailable." : "Analytics unavailable.");
      if (active) setData(body as Analytics);
    }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Analytics unavailable."); });
    return () => { active = false; };
  }, []);

  if (error) return <p role="alert" className="mt-8 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{error}</p>;
  if (!data) return <p className="mt-8 text-sm text-muted-foreground">Loading your local progress…</p>;
  const overview = data.overview;
  return <>
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="Knowledge sources" value={overview.documents} detail={`${overview.sections} parsed sections`} />
      <Metric label="Current concepts" value={overview.concepts} detail={`${overview.coveragePercent}% section coverage`} />
      <Metric label="Review backlog" value={overview.dueReviews} detail={`${overview.reviewsThisWeek} due in the next 7 days`} />
      <Metric label="Exercises" value={overview.exercises} detail="Across five practice dimensions" />
    </div>
    <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-2xl border border-border bg-card p-6"><div className="mb-6"><h2 className="text-lg font-semibold">Retention trend</h2><p className="mt-1 text-sm text-muted-foreground">Average correctness and completeness by week</p></div>
        {data.weeklyRetention.length ? <div className="space-y-4">{data.weeklyRetention.map((week) => <div key={week.week} className="grid grid-cols-[68px_1fr_94px] items-center gap-3"><span className="text-xs text-muted-foreground">{week.week}</span><div className="space-y-1.5"><Progress label="Correctness" value={week.correctness} color="bg-chart-3" /><Progress label="Completeness" value={week.completeness} color="bg-chart-1" /></div><span className="text-right text-xs text-muted-foreground">{week.count} response{week.count === 1 ? "" : "s"}</span></div>)}</div> : <Empty text="Complete a review session to start your retention trend." />}
      </section>
      <section className="rounded-2xl border border-border bg-card p-6"><div className="mb-6"><h2 className="text-lg font-semibold">Skills to revisit</h2><p className="mt-1 text-sm text-muted-foreground">Mastery stays separate by exercise type.</p></div>
        {data.weakConcepts.length ? <div className="space-y-3">{data.weakConcepts.map((item) => <div key={`${item.conceptId}-${item.dimension}`} className="rounded-xl bg-muted p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{item.name}</p><p className="mt-1 text-xs capitalize text-muted-foreground">{item.dimension.replaceAll("_", " ")} · {item.attempts} attempt{item.attempts === 1 ? "" : "s"}</p></div><span className="text-sm font-semibold text-primary">{item.score}%</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-card"><div className="h-full rounded-full bg-chart-3" style={{ width: `${item.score}%` }} /></div></div>)}</div> : <Empty text="Skill-level mastery appears after your first evaluated answer." />}
      </section>
    </div>
    <section className="mt-6 rounded-2xl border border-border bg-card p-6"><div className="mb-5"><h2 className="text-lg font-semibold">Recurring knowledge gaps</h2><p className="mt-1 text-sm text-muted-foreground">Themes from source-grounded response feedback.</p></div>{data.knowledgeGaps.length ? <div className="grid gap-3 md:grid-cols-2">{data.knowledgeGaps.map((gap) => <article key={`${gap.kind}-${gap.text}`} className="rounded-xl bg-muted p-4"><div className="flex items-center justify-between gap-3"><span className="text-[10px] uppercase tracking-wider text-primary">{gap.kind}</span><span className="text-xs text-muted-foreground">{gap.count} occurrence{gap.count === 1 ? "" : "s"}</span></div><p className="mt-2 text-sm leading-6">{gap.text}</p></article>)}</div> : <Empty text="Repeated missing points and misconceptions appear after reviewed answers." />}</section>
  </>;
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <article className="rounded-2xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-4 text-3xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></article>;
}

function Progress({ label, value, color }: { label: string; value: number; color: string }) {
  return <div className="flex items-center gap-2"><span className="w-20 text-[10px] text-muted-foreground">{label}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div><span className="w-8 text-right text-[10px] text-muted-foreground">{value}%</span></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl bg-muted p-5 text-sm leading-6 text-muted-foreground">{text}</div>;
}
