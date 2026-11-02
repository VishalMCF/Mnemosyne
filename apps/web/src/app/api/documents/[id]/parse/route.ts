import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { parseMarkdown } from "@mnemosyne/ingestion";
import { db } from "@/lib/db/client";
import { chunks, diagrams, documents, sections } from "@/lib/db/schema";
import { repositoryRoot } from "@/lib/db/config";
import { errorMessage, isSameOriginRequest, jsonError } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";

export async function POST(_request: Request, context: Context) {
  if (!isSameOriginRequest(_request)) return jsonError("Cross-origin requests are not allowed.", 403);
  const { id } = await context.params;
  const [document] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  if (!document) return jsonError("Document not found.", 404);
  if (document.status !== "imported" || document.extractionVersion > 0) return jsonError("Only documents without a completed parse can be retried.", 409);
  const filePath = path.resolve(repositoryRoot, document.storedPath);
  const uploadRoot = path.resolve(repositoryRoot, "data/uploads") + path.sep;
  if (!filePath.startsWith(uploadRoot)) return jsonError("Stored document path is invalid.", 400);
  try {
    const source = await fs.readFile(filePath, "utf8");
    const parsed = parseMarkdown(document.id, source);
    db.transaction((tx) => {
      tx.delete(sections).where(eq(sections.documentId, document.id)).run();
      tx.update(documents).set({ title: parsed.title, status: "parsed", lastError: null, updatedAt: new Date() }).where(eq(documents.id, document.id)).run();
      if (parsed.sections.length) tx.insert(sections).values(parsed.sections.map((row) => ({ ...row, documentId: document.id }))).run();
      if (parsed.chunks.length) tx.insert(chunks).values(parsed.chunks.map((row) => ({ ...row, documentId: document.id }))).run();
      if (parsed.diagrams.length) tx.insert(diagrams).values(parsed.diagrams.map((row) => ({
        id: row.id, documentId: document.id, sectionId: row.sectionId, type: row.type, source: row.source,
        graphJson: JSON.stringify(row.graph), extractionConfidence: row.extractionConfidence, startLine: row.startLine, endLine: row.endLine,
      }))).run();
    });
    return Response.json({ documentId: document.id, status: "parsed", sections: parsed.sections.length, diagrams: parsed.diagrams.length });
  } catch (error) {
    await db.update(documents).set({ status: "imported", lastError: errorMessage(error).slice(0, 500), updatedAt: new Date() }).where(eq(documents.id, id));
    return jsonError("Markdown parsing failed. The original file is still available to retry.", 422);
  }
}
