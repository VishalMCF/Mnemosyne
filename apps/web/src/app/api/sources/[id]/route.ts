import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { concepts, documents, diagrams, exerciseConcepts, exercises, masteryStates, relationships, responses, reviewStates, sections, sessionItems, sessions, sources } from "@/lib/db/schema";
import { repositoryRoot } from "@/lib/db/config";
import { isSameOriginRequest, jsonError } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  const [source] = await db.select().from(sources).where(eq(sources.id, id)).limit(1);
  if (!source) return jsonError("Source not found.", 404);
  const [document] = await db.select({
    id: documents.id,
    title: documents.title,
    originalFilename: documents.originalFilename,
    status: documents.status,
    extractionVersion: documents.extractionVersion,
    lastError: documents.lastError,
    createdAt: documents.createdAt,
  }).from(documents).where(eq(documents.sourceId, source.id)).limit(1);
  if (!document) return jsonError("Source document not found.", 404);
  const [documentSections, documentDiagrams, documentConcepts] = await Promise.all([
    db.select().from(sections).where(eq(sections.documentId, document.id)).orderBy(sections.order),
    db.select().from(diagrams).where(eq(diagrams.documentId, document.id)),
    db.select({ id: concepts.id, name: concepts.name, definition: concepts.definition, kind: concepts.kind, confidence: concepts.confidence, sectionId: concepts.sectionId, generationVersion: concepts.generationVersion })
      .from(concepts).where(and(eq(concepts.documentId, document.id), eq(concepts.isCurrent, true))),
  ]);
  const graph = await db.select().from(relationships).where(and(eq(relationships.documentId, document.id), eq(relationships.generationVersion, document.extractionVersion)));
  return Response.json({
    source,
    document,
    sections: documentSections,
    diagrams: documentDiagrams.map((diagram) => ({ ...diagram, graph: JSON.parse(diagram.graphJson) as unknown })),
    concepts: documentConcepts,
    relationships: graph,
  });
}

export async function DELETE(_request: Request, context: Context) {
  if (!isSameOriginRequest(_request)) return jsonError("Cross-origin requests are not allowed.", 403);
  const { id } = await context.params;
  const [source] = await db.select().from(sources).where(eq(sources.id, id)).limit(1);
  if (!source) return jsonError("Source not found.", 404);
  const sourceDocuments = await db.select().from(documents).where(eq(documents.sourceId, source.id));
  const documentIds = sourceDocuments.map((document) => document.id);
  const paths = sourceDocuments.map((document) => {
    const resolved = path.resolve(repositoryRoot, document.storedPath);
    const uploadRoot = path.resolve(repositoryRoot, "data/uploads") + path.sep;
    if (!resolved.startsWith(uploadRoot)) throw new Error("Stored document path is invalid.");
    return resolved;
  });

  if (documentIds.length) {
    const conceptRows = await db.select({ id: concepts.id }).from(concepts).where(inArray(concepts.documentId, documentIds));
    const conceptIds = conceptRows.map((concept) => concept.id);
    const exerciseLinks = conceptIds.length
      ? await db.select({ exerciseId: exerciseConcepts.exerciseId }).from(exerciseConcepts).where(inArray(exerciseConcepts.conceptId, conceptIds))
      : [];
    const exerciseIds = [...new Set(exerciseLinks.map((link) => link.exerciseId))];
    const priorResponses = exerciseIds.length
      ? await db.select({ id: responses.id, sessionId: responses.sessionId }).from(responses).where(inArray(responses.exerciseId, exerciseIds))
      : [];
    const priorItems = exerciseIds.length
      ? await db.select({ sessionId: sessionItems.sessionId }).from(sessionItems).where(inArray(sessionItems.exerciseId, exerciseIds))
      : [];
    const sessionIds = [...new Set([...priorResponses.map((response) => response.sessionId), ...priorItems.map((item) => item.sessionId)])];
    db.transaction((tx) => {
      if (priorResponses.length) tx.delete(responses).where(inArray(responses.id, priorResponses.map((response) => response.id))).run();
      if (exerciseIds.length) {
        tx.delete(sessionItems).where(inArray(sessionItems.exerciseId, exerciseIds)).run();
        tx.delete(reviewStates).where(inArray(reviewStates.exerciseId, exerciseIds)).run();
        tx.delete(exercises).where(inArray(exercises.id, exerciseIds)).run();
      }
      if (conceptIds.length) {
        tx.delete(masteryStates).where(inArray(masteryStates.conceptId, conceptIds)).run();
        tx.delete(relationships).where(inArray(relationships.documentId, documentIds)).run();
      }
      tx.delete(sources).where(eq(sources.id, source.id)).run();
      for (const sessionId of sessionIds) {
        const [remainingResponses] = tx.select({ count: sql<number>`count(*)` }).from(responses).where(eq(responses.sessionId, sessionId)).all();
        const [remainingItems] = tx.select({ count: sql<number>`count(*)` }).from(sessionItems).where(eq(sessionItems.sessionId, sessionId)).all();
        if (remainingResponses?.count === 0 && remainingItems?.count === 0) tx.delete(sessions).where(eq(sessions.id, sessionId)).run();
      }
    });
  } else {
    await db.delete(sources).where(eq(sources.id, source.id));
  }
  await Promise.all(paths.map((filePath) => fs.rm(filePath, { force: true })));
  return Response.json({ deleted: true });
}
