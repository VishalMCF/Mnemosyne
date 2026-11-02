import Link from "next/link";
import { DashboardActivity, DashboardMetrics } from "@/components/dashboard/DashboardOverview";

const navItems = [
  { label: "Overview", href: "/", icon: "◫" },
  { label: "Library", href: "/library", icon: "▤" },
  { label: "Training", href: "/training", icon: "◎" },
  { label: "Analytics", href: "/analytics", icon: "⌁" },
];

export default function HomePage() {
  const today = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date());
  return (
    <main className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="flex flex-col border-b border-[var(--line)] bg-white px-5 py-6 lg:min-h-screen lg:border-b-0 lg:border-r lg:px-6">
        <Link href="/" className="mb-10 flex items-center gap-3" aria-label="Mnemosyne home">
          <span className="grid size-10 place-items-center rounded-xl bg-[var(--green)] text-xl text-white">m</span>
          <span><strong className="block text-[17px] tracking-tight">mnemosyne</strong><small className="text-xs text-[var(--muted)]">your second memory</small></span>
        </Link>
        <nav className="flex gap-2 lg:flex-col" aria-label="Main navigation">
          {navItems.map((item, index) => (
            <Link key={item.label} href={item.href} aria-current={index === 0 ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${index === 0 ? "bg-[var(--green-soft)] font-semibold text-[var(--green)]" : "text-[var(--muted)] hover:bg-[var(--paper)]"}`}>
              <span className="w-5 text-center text-base" aria-hidden="true">{item.icon}</span>{item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto hidden rounded-xl bg-[var(--paper)] p-4 lg:block">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Local workspace</p>
          <p className="mt-2 text-sm leading-5">Your notes and learning history stay on this device.</p>
          <span className="mt-3 inline-flex items-center gap-2 text-xs text-[var(--green)]"><i className="size-2 rounded-full bg-[var(--green)]" />Stored on this device</span>
        </div>
      </aside>

      <section className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div><p className="mb-2 text-sm text-[var(--muted)]">{today}</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Good morning.</h1><p className="mt-2 text-[var(--muted)]">A little recall today makes knowledge last.</p></div>
          <Link href="/training" className="rounded-lg bg-[var(--green)] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#2b5941]">Start a review <span aria-hidden="true">→</span></Link>
        </header>

        <DashboardMetrics />

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
          <section className="rounded-2xl border border-[var(--line)] bg-white p-5 sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Your focus</h2><p className="mt-1 text-sm text-[var(--muted)]">A short path through what matters next.</p></div><span className="rounded-full bg-[var(--paper)] px-3 py-1 text-xs text-[var(--muted)]">12 due</span></div>
            <div className="rounded-xl bg-[var(--paper)] px-5 py-6"><h3 className="text-sm font-medium">Your learning path starts with a source.</h3><p className="mt-2 max-w-lg text-sm leading-6 text-[var(--muted)]">Import a Markdown note and Mnemosyne will build a review queue from the ideas inside it.</p><Link className="mt-4 inline-block text-sm font-medium text-[var(--green)]" href="/library">Open your library →</Link></div>
          </section>

          <section className="flex flex-col rounded-2xl bg-[#e9eee7] p-6 sm:p-7">
            <div className="mb-8 flex items-center justify-between"><span className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-[var(--green)]">Practice rhythm</span><span className="text-xs text-[var(--muted)]">Recent weeks</span></div>
            <DashboardActivity />
            <p className="mt-7 border-t border-[#d5ddd3] pt-5 text-sm leading-6 text-[var(--muted)]">Your weekly answers and retention trend are saved locally.</p>
          </section>
        </div>

        <section className="mt-8 flex flex-col items-start justify-between gap-5 rounded-2xl border border-dashed border-[#cbd7cb] bg-white/60 p-6 sm:flex-row sm:items-center sm:p-7">
          <div><span className="mb-3 inline-block rounded-full bg-[var(--green-soft)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--green)]">Start your library</span><h2 className="text-lg font-semibold">Bring a note you want to remember.</h2><p className="mt-1 max-w-xl text-sm leading-6 text-[var(--muted)]">Import Markdown and Mnemosyne will help turn it into concepts you can recall, explain, and connect.</p></div>
          <Link href="/library" className="shrink-0 rounded-lg border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-medium hover:bg-[var(--paper)]">Explore library <span aria-hidden="true">→</span></Link>
        </section>
        <footer className="mt-10 flex flex-wrap justify-between gap-3 text-xs text-[var(--muted)]"><span>Built for understanding that sticks.</span><span>Local-first · Private by default</span></footer>
      </section>
    </main>
  );
}
