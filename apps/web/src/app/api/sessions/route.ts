import { and, asc, eq, lte } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db/client";
import { isSameOriginRequest, jsonError } from "@/lib/http";
import { concepts, documents, exerciseConcepts, exercises, reviewStates, sections, sessionItems, sessions } from "@/lib/db/schema";

export const runtime = "nodejs";

async function findDueExercises(now = new Date(), limit = 30) {
  const rows = await db.select({
    exercise: exercises,
    section: sections,
    document: documents,
    review: reviewStates,
  }).from(exercises)
    .innerJoin(reviewStates, eq(reviewStates.exerciseId, exercises.id))
    .innerJoin(exerciseConcepts, eq(exerciseConcepts.exerciseId, exercises.id))
    .innerJoin(concepts, eq(concepts.id, exerciseConcepts.conceptId))
    .innerJoin(sections, eq(sections.id, exerciseConcepts.sectionId))
    .innerJoin(documents, eq(documents.id, sections.documentId))
    .where(and(eq(exercises.isCurrent, true), eq(concepts.isCurrent, true), lte(reviewStates.dueAt, now)))
    .orderBy(asc(reviewStates.dueAt), asc(exercises.difficulty))
    .limit(limit * 4);
  const grouped = new Map<string, { id: string; prompt: string; type: string; difficulty: number; dueAt: Date; sources: Array<{ documentId: string; title: string; sectionId: string; heading: string; startLine: number }> }>();
  for (const row of rows) {
    let item = grouped.get(row.exercise.id);
    if (!item) {
      item = { id: row.exercise.id, prompt: row.exercise.prompt, type: row.exercise.type, difficulty: row.exercise.difficulty, dueAt: row.review.dueAt, sources: [] };
      grouped.set(item.id, item);
    }
    if (!item.sources.some((source) => source.sectionId === row.section.id)) item.sources.push({ documentId: row.document.id, title: row.document.title, sectionId: row.section.id, heading: row.section.heading, startLine: row.section.startLine });
  }
  return [...grouped.values()].slice(0, limit);
}

export async function GET() {
  const exercisesDue = await findDueExercises();
  return Response.json({ exercises: exercisesDue, count: exercisesDue.length });
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return jsonError("Cross-origin requests are not allowed.", 403);
  const queue = await findDueExercises(new Date(), 10);
  if (!queue.length) return Response.json({ sessionId: null, exercises: [] });
  const sessionId = randomUUID();
  db.transaction((tx) => {
    tx.insert(sessions).values({ id: sessionId, startedAt: new Date() }).run();
    tx.insert(sessionItems).values(queue.map((exercise, order) => ({ sessionId, exerciseId: exercise.id, order }))).run();
  });
  return Response.json({ sessionId, exercises: queue }, { status: 201 });
}
