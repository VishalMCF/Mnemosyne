import { and, asc, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { concepts, documents, exercises, masteryStates, reviewStates, sections, responses } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function GET() {
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const eightWeeksAgo = new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000);
  const [documentCount, sectionCount, conceptCount, exerciseCount, responseCount, dueCount, nextWeekCount, weakConcepts, weekly, recentResponses] = await Promise.all([
    db.select({ count: count() }).from(documents),
    db.select({ count: count() }).from(sections),
    db.select({ count: count() }).from(concepts).where(eq(concepts.isCurrent, true)),
    db.select({ count: count() }).from(exercises).where(eq(exercises.isCurrent, true)),
    db.select({ count: count() }).from(responses),
    db.select({ count: count() }).from(reviewStates).innerJoin(exercises, eq(exercises.id, reviewStates.exerciseId)).where(and(eq(exercises.isCurrent, true), lte(reviewStates.dueAt, now))),
    db.select({ count: count() }).from(reviewStates).innerJoin(exercises, eq(exercises.id, reviewStates.exerciseId)).where(and(eq(exercises.isCurrent, true), gte(reviewStates.dueAt, now), lte(reviewStates.dueAt, nextWeek))),
    db.select({ concept: concepts, mastery: masteryStates }).from(masteryStates).innerJoin(concepts, eq(concepts.id, masteryStates.conceptId)).where(eq(concepts.isCurrent, true)).orderBy(asc(masteryStates.score)).limit(12),
    db.select({ week: sql<string>`strftime('%Y-%W', ${responses.createdAt} / 1000, 'unixepoch')`, count: count(), correctness: sql<number>`round(avg(${responses.correctness}))`, completeness: sql<number>`round(avg(${responses.completeness}))` })
      .from(responses).where(gte(responses.createdAt, eightWeeksAgo)).groupBy(sql`strftime('%Y-%W', ${responses.createdAt} / 1000, 'unixepoch')`).orderBy(asc(sql`strftime('%Y-%W', ${responses.createdAt} / 1000, 'unixepoch')`)),
    db.select({ evaluationJson: responses.evaluationJson }).from(responses).orderBy(desc(responses.createdAt)).limit(500),
  ]);
  const gapCounts = new Map<string, { text: string; kind: "missing point" | "misconception"; count: number }>();
  for (const row of recentResponses) {
    try {
      const evaluation = JSON.parse(row.evaluationJson) as { missingPoints?: string[]; misconceptions?: string[] };
      for (const [kind, values] of [["missing point", evaluation.missingPoints ?? []], ["misconception", evaluation.misconceptions ?? []]] as const) {
        for (const text of values) {
          const key = `${kind}:${text.trim().toLocaleLowerCase("en-US")}`;
          const prior = gapCounts.get(key);
          gapCounts.set(key, prior ? { ...prior, count: prior.count + 1 } : { kind, text, count: 1 });
        }
      }
    } catch { /* skip malformed historical evaluation JSON */ }
  }
  const totalSections = sectionCount[0]?.count ?? 0;
  const totalConcepts = conceptCount[0]?.count ?? 0;
  return Response.json({
    overview: {
      documents: documentCount[0]?.count ?? 0,
      sections: totalSections,
      concepts: totalConcepts,
      exercises: exerciseCount[0]?.count ?? 0,
      responses: responseCount[0]?.count ?? 0,
      dueReviews: dueCount[0]?.count ?? 0,
      reviewsThisWeek: nextWeekCount[0]?.count ?? 0,
      coveragePercent: totalSections ? Math.round(Math.min(100, (totalConcepts / totalSections) * 100)) : 0,
    },
    weakConcepts: weakConcepts.map((row) => ({ conceptId: row.concept.id, name: row.concept.name, score: row.mastery.score, attempts: row.mastery.attempts, dimension: row.mastery.exerciseType })),
    knowledgeGaps: [...gapCounts.values()].sort((a, b) => b.count - a.count).slice(0, 12),
    weeklyRetention: weekly,
  });
}
