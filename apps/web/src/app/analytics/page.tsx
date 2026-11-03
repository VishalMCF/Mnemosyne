import Link from "next/link";
import { AnalyticsClient } from "@/components/analytics/AnalyticsClient";

export default function AnalyticsPage() {
  return <main className="mx-auto min-h-screen max-w-6xl px-6 py-12">
    <Link className="text-sm text-primary" href="/">← Dashboard</Link>
    <header className="mt-10"><p className="text-sm text-muted-foreground">Progress over time</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Analytics</h1><p className="mt-3 max-w-2xl leading-7 text-muted-foreground">Understand what is sticking, what needs practice, and which kind of understanding is changing.</p></header>
    <AnalyticsClient />
  </main>;
}
