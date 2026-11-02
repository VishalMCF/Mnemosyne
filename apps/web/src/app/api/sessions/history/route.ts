import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { exercises, responses, sessions } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function GET() {
  const sessionRows = await db.select().from(sessions).orderBy(desc(sessions.startedAt)).limit(50);
  const sessionIds = sessionRows.map((session) => session.id);
  if (!sessionIds.length) return Response.json({ sessions: [] });
  const responseRows = await db.select({ response: responses, exercise: exercises })
    .from(responses).innerJoin(exercises, eq(exercises.id, responses.exerciseId))
    .where(inArray(responses.sessionId, sessionIds)).orderBy(desc(responses.createdAt));
  const grouped = new Map<string, Array<Record<string, unknown>>>();
  for (const row of responseRows) {
    const list = grouped.get(row.response.sessionId) ?? [];
    list.push({
      responseId: row.response.id,
      prompt: row.exercise.prompt,
      expectedAnswer: row.exercise.expectedAnswer,
      type: row.exercise.type,
      answer: row.response.answer,
      correctness: row.response.correctness,
      completeness: row.response.completeness,
      confidence: row.response.confidence,
      latencyMs: row.response.latencyMs,
      hintsUsed: row.response.hintsUsed,
      evaluation: JSON.parse(row.response.evaluationJson) as unknown,
      createdAt: row.response.createdAt,
    });
    grouped.set(row.response.sessionId, list);
  }
  return Response.json({ sessions: sessionRows.map((session) => ({ ...session, responses: grouped.get(session.id) ?? [] })) });
}
