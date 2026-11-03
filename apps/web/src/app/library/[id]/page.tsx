import Link from "next/link";
import { SourceDetailClient } from "@/components/library/SourceDetailClient";

export default async function SourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <main className="mx-auto min-h-screen max-w-5xl px-6 py-12"><Link className="text-sm text-primary" href="/library">← Library</Link><SourceDetailClient id={id} /></main>;
}
