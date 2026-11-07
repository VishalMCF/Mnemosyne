import Link from "next/link";
import { LibraryClient } from "@/components/library/LibraryClient";

export default function LibraryPage() {
  return <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
    <Link className="text-sm text-primary" href="/">← Dashboard</Link>
    <header className="mb-8 mt-10"><p className="text-sm text-muted-foreground">Your knowledge base</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Library</h1><p className="mt-3 max-w-2xl leading-7 text-muted-foreground">Save pasted notes or Markdown files to your local library. Notes are parsed automatically; process selected documents with Codex when you’re ready.</p></header>
    <LibraryClient />
  </main>;
}
