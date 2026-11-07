import { randomUUID } from "node:crypto";
import path from "node:path";
import { z } from "zod";
import { ExtractionRunStore } from "@/lib/knowledge/extraction-run-store";
import { repositoryRoot } from "@/lib/db/config";
import { CodexProviderError } from "@mnemosyne/ai";
import { eq } from "drizzle-orm";
import { extractDocument } from "@/lib/knowledge/extract";
import { db } from "@/lib/db/client";
import { documents } from "@/lib/db/schema";
import { errorMessage, isSameOriginRequest, jsonError } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";
const runs = new ExtractionRunStore(path.join(repositoryRoot, "data/extraction-runs"));

export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  const runId = new URL(request.url).searchParams.get("runId") ?? undefined;
  if (!z.string().uuid().safeParse(id).success || (runId && !z.string().uuid().safeParse(runId).success)) return jsonError("Invalid extraction identifier.");
  return Response.json({ run: runs.read(id, runId) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(_request: Request, context: Context) {
  if (!isSameOriginRequest(_request)) return jsonError("Cross-origin requests are not allowed.", 403);
  const { id } = await context.params;
  const runId = _request.headers.get("X-Extraction-Run-Id") || randomUUID();
  if (!z.string().uuid().safeParse(id).success || !z.string().uuid().safeParse(runId).success) return jsonError("Invalid extraction identifier.");
  const [document] = await db.select({ id: documents.id }).from(documents).where(eq(documents.id, id)).limit(1);
  if (!document) return jsonError("Document not found", 404);
  let started: ReturnType<typeof runs.start>;
  try { started = runs.start(id, runId); }
  catch { return jsonError("Could not start extraction. Another request may be starting; wait a moment and retry.", 409); }
  const { run, created } = started;
  if (!created) return Response.json({ error: "An extraction is already running for this document.", runId: run.runId }, { status: 409 });
  console.info(`[extraction ${runId}] Started document ${id}`);
  try {
    const result = await extractDocument(id, (update) => {
      runs.update(run, update);
      console.info(`[extraction ${runId}] ${update.stage}: ${update.message}`);
    });
    runs.update(run, { stage: "completed", message: `Saved ${result.concepts} concepts, ${result.relationships} relationships, and ${result.exercises} training exercises` });
    console.info(`[extraction ${runId}] Completed: ${result.concepts} concepts, ${result.exercises} exercises`);
    return Response.json({ ...result, runId });
  } catch (error) {
    runs.recordError(run, error);
    const message = errorMessage(error);
    const sanitized = error instanceof CodexProviderError
      ? message
      : "Knowledge extraction failed. Your imported Markdown remains available; check Codex and retry.";
    runs.update(run, { stage: "failed", message: sanitized });
    console.error(`[extraction ${runId}] Failed: ${sanitized}`);
    await db.update(documents).set({ status: "extraction_failed", lastError: sanitized, updatedAt: new Date() }).where(eq(documents.id, id));
    return Response.json({ error: sanitized, runId }, { status: 502 });
  }
}
