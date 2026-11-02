"use client";

import { useEffect, useState } from "react";

type Overview = { documents: number; sections: number; concepts: number; exercises: number; responses: number; dueReviews: number; reviewsThisWeek: number; coveragePercent: number };
type Week = { week: string; count: number; correctness: number; completeness: number };

export function DashboardMetrics() {
  const [overview, setOverview] = useState<Overview | null>(null);
  useEffect(() => { void fetch("/api/analytics", { cache: "no-store" }).then((response) => response.json()).then((body: { overview?: Overview }) => setOverview(body.overview ?? null)).catch(() => {}); }, []);
  return <div className="grid gap-4 sm:grid-cols-3">
    <Metric label="Ready to review" value={overview?.dueReviews ?? "—"} detail={overview ? `${overview.reviewsThisWeek} scheduled this week` : "Loading local progress"} symbol="↻" />
    <Metric label="Responses saved" value={overview?.responses ?? "—"} detail="Your learning history stays here" symbol="✳" />
    <Metric label="Knowledge library" value={overview?.documents ?? "—"} detail={overview ? `${overview.concepts} concepts from ${overview.sections} sections` : "Loading local library"} symbol="▤" />
  </div>;
}

export function DashboardActivity() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  useEffect(() => { void fetch("/api/analytics", { cache: "no-store" }).then((response) => response.json()).then((body: { weeklyRetention?: Week[] }) => setWeeks(body.weeklyRetention ?? [])).catch(() => {}); }, []);
  const recent = weeks.slice(-7);
  if (!recent.length) return <div className="flex h-36 flex-1 items-center justify-center rounded-xl bg-white/40 px-5 text-center text-sm text-[var(--muted)]">Your practice history will build here after your first session.</div>;
  const peak = Math.max(...recent.map((week) => week.count), 1);
  return <div className="flex flex-1 items-end justify-between gap-3" aria-label="Weekly practice activity">
    {recent.map((week) => <div key={week.week} className="flex h-36 flex-1 flex-col items-center justify-end gap-2"><div className="w-full max-w-10 rounded-t-md bg-[var(--green)]" style={{ height: `${Math.max(8, week.count / peak * 100)}%` }} title={`${week.count} answers · ${week.correctness}% correct`} /><span className="text-[10px] text-[var(--muted)]">W{week.week.slice(-2)}</span></div>)}
  </div>;
}

function Metric({ label, value, detail, symbol }: { label: string; value: string | number; detail: string; symbol: string }) {
  return <article className="rounded-2xl border border-[var(--line)] bg-white p-5"><div className="flex items-center justify-between"><p className="text-sm text-[var(--muted)]">{label}</p><span className="text-[var(--green)]" aria-hidden="true">{symbol}</span></div><p className="mt-5 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-[var(--muted)]">{detail}</p></article>;
}
