import Link from "next/link";
import { LibraryClient } from "@/components/library/LibraryClient";

export default function LibraryPage() {
  return <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
    <Link className="text-sm text-[var(--green)]" href="/">← Dashboard</Link>
    <header className="mb-8 mt-10"><p className="text-sm text-[var(--muted)]">Your knowledge base</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Library</h1><p className="mt-3 max-w-2xl leading-7 text-[var(--muted)]">Keep your Markdown sources on this device, then choose which documents to process with AI.</p></header>
    <LibraryClient />
  </main>;
}
