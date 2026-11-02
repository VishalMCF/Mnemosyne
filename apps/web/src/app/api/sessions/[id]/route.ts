import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { exercises, responses, sessionItems, sessions } from "@/lib/db/schema";
import { jsonError } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  const [session] = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  if (!session) return jsonError("Session not found.", 404);
  const rows = await db.select({ item: sessionItems, exercise: exercises, response: responses })
    .from(sessionItems)
    .innerJoin(exercises, eq(exercises.id, sessionItems.exerciseId))
    .leftJoin(responses, and(eq(responses.exerciseId, exercises.id), eq(responses.sessionId, id)))
    .where(eq(sessionItems.sessionId, id))
    .orderBy(asc(sessionItems.order));
  return Response.json({
    session,
    exercises: rows.map((row) => ({
      id: row.exercise.id,
      prompt: row.exercise.prompt,
      type: row.exercise.type,
      difficulty: row.exercise.difficulty,
      completed: Boolean(row.item.completedAt),
      evaluation: row.response ? JSON.parse(row.response.evaluationJson) as unknown : null,
      expectedAnswer: row.response ? row.exercise.expectedAnswer : undefined,
    })),
  });
}
