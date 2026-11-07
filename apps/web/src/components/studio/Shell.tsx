"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Library,
  BookOpen,
  Brain,
  Network,
  RotateCcw,
  ChartNoAxesCombined,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Moon,
  Sun,
  ArrowUpRight,
} from "lucide-react";
import { useStudio } from "./Store";
import type { ReactNode } from "react";
const nav = [
  ["Dashboard", "", LayoutDashboard],
  ["Library", "library", Library],
  ["Reading Studio", "read", BookOpen],
  ["Cognitive Skills", "skills", Brain],
  ["Knowledge Graph", "graph", Network],
  ["Review Queue", "reviews", RotateCcw],
  ["Analytics", "analytics", ChartNoAxesCombined],
  ["Settings", "settings", Settings],
] as const;
export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { state, update, storageError } = useStudio();
  const dueCount = [0, 1, 2, 3].filter(
    (index) =>
      !state.reviews.some(
        (review) =>
          review.id === String(index) && Date.parse(review.due) > Date.now(),
      ),
  ).length;
  const current =
    nav.find((item) =>
      item[1]
        ? pathname.startsWith(`/studio/${item[1]}`)
        : pathname === "/studio",
    )?.[0] ?? "Learning workspace";
  return (
    <div className={`s-shell ${state.collapsed ? "collapsed" : ""}`}>
      <aside className="s-sidebar">
        <Link href="/studio" className="s-brand">
          <span className="s-brand-mark">
            m<span>·</span>
          </span>
          <strong>mnemosyne</strong>
        </Link>
        <nav aria-label="Studio navigation">
          {nav.map(([label, path, Icon]) => (
            <Link
              key={label}
              href={`/studio${path ? `/${path}` : ""}`}
              title={label}
              aria-current={label === current ? "page" : undefined}
              className={label === current ? "active" : ""}
            >
              <Icon size={17} />
              <span>{label}</span>
              {label === "Review Queue" && <small>{dueCount}</small>}
            </Link>
          ))}
        </nav>
        <div className="s-sidebar-bottom">
          <Link href="/" className="s-legacy">
            Existing Mnemosyne <ArrowUpRight size={14} />
          </Link>
          <Link href="/studio/settings" className="s-profile">
            <span className="s-avatar">V</span>
            <span>Vishal</span>
            <Settings size={15} />
          </Link>
        </div>
      </aside>
      <div className="s-main">
        <header className="s-topbar">
          <div>
            <button
              className="s-icon"
              aria-label={
                state.collapsed ? "Expand sidebar" : "Collapse sidebar"
              }
              onClick={() => update((s) => ({ ...s, collapsed: !s.collapsed }))}
            >
              {state.collapsed ? (
                <PanelLeftOpen size={17} />
              ) : (
                <PanelLeftClose size={17} />
              )}
            </button>
            <span>{current}</span>
          </div>
          <div>
            <span className="s-demo">Prototype</span>
            <button
              className="s-icon"
              aria-label="Toggle theme"
              onClick={() =>
                update((s) => ({
                  ...s,
                  theme: s.theme === "dark" ? "light" : "dark",
                }))
              }
            >
              {state.theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>
        {storageError && (
          <p className="s-warning" role="alert">
            {storageError}
          </p>
        )}
        <main className="s-content">{children}</main>
      </div>
    </div>
  );
}
