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

  if (error) return <p role="alert" className="mt-8 rounded-xl bg-[#fff0ec] p-4 text-sm text-[#9b3e2d]">{error}</p>;
  if (!data) return <p className="mt-8 text-sm text-[var(--muted)]">Loading your local progress…</p>;
  const overview = data.overview;
  return <>
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="Knowledge sources" value={overview.documents} detail={`${overview.sections} parsed sections`} />
      <Metric label="Current concepts" value={overview.concepts} detail={`${overview.coveragePercent}% section coverage`} />
      <Metric label="Review backlog" value={overview.dueReviews} detail={`${overview.reviewsThisWeek} due in the next 7 days`} />
      <Metric label="Exercises" value={overview.exercises} detail="Across five practice dimensions" />
    </div>
    <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-2xl border border-[var(--line)] bg-white p-6"><div className="mb-6"><h2 className="text-lg font-semibold">Retention trend</h2><p className="mt-1 text-sm text-[var(--muted)]">Average correctness and completeness by week</p></div>
        {data.weeklyRetention.length ? <div className="space-y-4">{data.weeklyRetention.map((week) => <div key={week.week} className="grid grid-cols-[68px_1fr_94px] items-center gap-3"><span className="text-xs text-[var(--muted)]">{week.week}</span><div className="space-y-1.5"><Progress label="Correctness" value={week.correctness} color="bg-[var(--green)]" /><Progress label="Completeness" value={week.completeness} color="bg-[#99b4a0]" /></div><span className="text-right text-xs text-[var(--muted)]">{week.count} response{week.count === 1 ? "" : "s"}</span></div>)}</div> : <Empty text="Complete a review session to start your retention trend." />}
      </section>
      <section className="rounded-2xl border border-[var(--line)] bg-white p-6"><div className="mb-6"><h2 className="text-lg font-semibold">Skills to revisit</h2><p className="mt-1 text-sm text-[var(--muted)]">Mastery stays separate by exercise type.</p></div>
        {data.weakConcepts.length ? <div className="space-y-3">{data.weakConcepts.map((item) => <div key={`${item.conceptId}-${item.dimension}`} className="rounded-xl bg-[var(--paper)] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{item.name}</p><p className="mt-1 text-xs capitalize text-[var(--muted)]">{item.dimension.replaceAll("_", " ")} · {item.attempts} attempt{item.attempts === 1 ? "" : "s"}</p></div><span className="text-sm font-semibold text-[var(--green)]">{item.score}%</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-[var(--green)]" style={{ width: `${item.score}%` }} /></div></div>)}</div> : <Empty text="Skill-level mastery appears after your first evaluated answer." />}
      </section>
    </div>
    <section className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-6"><div className="mb-5"><h2 className="text-lg font-semibold">Recurring knowledge gaps</h2><p className="mt-1 text-sm text-[var(--muted)]">Themes from source-grounded response feedback.</p></div>{data.knowledgeGaps.length ? <div className="grid gap-3 md:grid-cols-2">{data.knowledgeGaps.map((gap) => <article key={`${gap.kind}-${gap.text}`} className="rounded-xl bg-[var(--paper)] p-4"><div className="flex items-center justify-between gap-3"><span className="text-[10px] uppercase tracking-wider text-[var(--green)]">{gap.kind}</span><span className="text-xs text-[var(--muted)]">{gap.count} occurrence{gap.count === 1 ? "" : "s"}</span></div><p className="mt-2 text-sm leading-6">{gap.text}</p></article>)}</div> : <Empty text="Repeated missing points and misconceptions appear after reviewed answers." />}</section>
  </>;
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <article className="rounded-2xl border border-[var(--line)] bg-white p-5"><p className="text-sm text-[var(--muted)]">{label}</p><p className="mt-4 text-3xl font-semibold">{value}</p><p className="mt-1 text-xs text-[var(--muted)]">{detail}</p></article>;
}

function Progress({ label, value, color }: { label: string; value: number; color: string }) {
  return <div className="flex items-center gap-2"><span className="w-20 text-[10px] text-[var(--muted)]">{label}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--paper)]"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div><span className="w-8 text-right text-[10px] text-[var(--muted)]">{value}%</span></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl bg-[var(--paper)] p-5 text-sm leading-6 text-[var(--muted)]">{text}</div>;
}
