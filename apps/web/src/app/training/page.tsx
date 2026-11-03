import Link from "next/link";
import { TrainingClient } from "@/components/training/TrainingClient";
import { SessionHistory } from "@/components/training/SessionHistory";

export default function TrainingPage() {
  return <main className="mx-auto min-h-screen max-w-4xl px-6 py-12">
    <Link className="text-sm text-primary" href="/">← Dashboard</Link>
    <header className="mb-8 mt-10"><p className="text-sm text-muted-foreground">Practice with purpose</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Training</h1><p className="mt-3 max-w-2xl leading-7 text-muted-foreground">Recall first. Then review source-grounded feedback and track how each kind of understanding changes.</p></header>
    <TrainingClient />
    <SessionHistory />
  </main>;
}
