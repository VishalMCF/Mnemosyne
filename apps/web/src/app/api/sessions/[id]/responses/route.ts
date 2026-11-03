import { randomUUID } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getAIProvider } from "@/lib/ai/provider";
import { CodexProviderError, EVALUATION_PROMPT_VERSION, type EvaluationResult } from "@mnemosyne/ai";
import { db } from "@/lib/db/client";
import { concepts, documents, exerciseConcepts, exercises, masteryStates, responses, reviewStates, sections, sessionItems, sessions } from "@/lib/db/schema";
import { errorMessage, isSameOriginRequest, jsonError } from "@/lib/http";
import { scheduleNextReview, updateMastery } from "@mnemosyne/learning";

type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";
const answerSchema = z.object({
  exerciseId: z.string().uuid(),
  answer: z.string().trim().min(1).max(10_000),
  confidence: z.number().int().min(1).max(5),
  latencyMs: z.number().int().min(0).max(3_600_000),
  hintsUsed: z.number().int().min(0).max(20).default(0),
});

export async function POST(request: Request, context: Context) {
  if (!isSameOriginRequest(request)) return jsonError("Cross-origin requests are not allowed.", 403);
  const { id: sessionId } = await context.params;
  const parsedBody = await request.json().catch(() => null);
  const validation = answerSchema.safeParse(parsedBody);
  if (!validation.success) return jsonError("Provide an answer, confidence from 1–5, and a valid exercise.");
  const input = validation.data;
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!session || session.completedAt) return jsonError("This learning session is no longer active.", 404);
  const [sessionItem] = await db.select().from(sessionItems).where(and(eq(sessionItems.sessionId, sessionId), eq(sessionItems.exerciseId, input.exerciseId))).limit(1);
  if (!sessionItem || sessionItem.completedAt) return jsonError("This exercise is not available in the active session.", 409);
  const [exercise] = await db.select().from(exercises).where(eq(exercises.id, input.exerciseId)).limit(1);
  if (!exercise) return jsonError("Exercise not found.", 404);
  if (!exercise.isCurrent) return jsonError("This exercise changed after the session started. Begin a fresh review to continue.", 409);

  const provenanceRows = await db.select({ conceptId: concepts.id, conceptName: concepts.name, sectionId: sections.id, sectionHeading: sections.heading, sectionOrder: sections.order, sectionContent: sections.content, startLine: sections.startLine, documentId: documents.id, documentTitle: documents.title })
    .from(exerciseConcepts)
    .innerJoin(concepts, eq(concepts.id, exerciseConcepts.conceptId))
    .innerJoin(sections, eq(sections.id, exerciseConcepts.sectionId))
    .innerJoin(documents, eq(documents.id, sections.documentId))
    .where(eq(exerciseConcepts.exerciseId, exercise.id));
  type ExerciseProvenance = {
    conceptId: string;
    conceptName: string;
    sectionId: string;
    sectionHeading: string;
    sectionOrder: number;
    sectionContent: string;
    startLine: number;
    documentId: string;
    documentTitle: string;
  };
  const provenance = [...new Map<string, ExerciseProvenance>(provenanceRows.map((source) => [source.conceptId, source] as [string, ExerciseProvenance])).values()];
  if (!provenance.length) return jsonError("The source for this exercise is unavailable.", 409);

  const provider = getAIProvider();
  let evaluation: EvaluationResult;
  try {
    evaluation = await provider.evaluateResponse({
      prompt: exercise.prompt,
      expectedAnswer: exercise.expectedAnswer,
      answer: input.answer,
      sourceSections: provenance.map((source) => ({ order: source.sectionOrder, heading: source.sectionHeading, content: source.sectionContent.slice(0, 6_000) })),
    });
  } catch (error) {
    const message = errorMessage(error);
    return jsonError(error instanceof CodexProviderError ? message : "Evaluation failed. Your answer has not been submitted; check Codex and retry.", 502);
  }
  const citedOrders = new Set(provenance.map((source) => source.sectionOrder));
  const score = Math.round(evaluation.correctness * 0.65 + evaluation.completeness * 0.35);
  const sourceReferences = provenance.filter((source) => evaluation.sourceSectionOrders.includes(source.sectionOrder) && citedOrders.has(source.sectionOrder))
    .map((source) => ({ documentId: source.documentId, documentTitle: source.documentTitle, sectionId: source.sectionId, sectionHeading: source.sectionHeading, startLine: source.startLine }));
  const [previousState] = await db.select().from(reviewStates).where(eq(reviewStates.exerciseId, exercise.id)).limit(1);
  const schedule = scheduleNextReview({ ...evaluation, confidence: input.confidence, latencyMs: input.latencyMs, hintsUsed: input.hintsUsed }, previousState ? { intervalDays: previousState.intervalDays, repetitions: previousState.repetitions } : null);
  const responseId = randomUUID();
  const masteryChanges = await Promise.all(provenance.map(async (source) => {
    const [prior] = await db.select().from(masteryStates).where(and(eq(masteryStates.conceptId, source.conceptId), eq(masteryStates.exerciseType, exercise.type))).limit(1);
    return { conceptId: source.conceptId, score: updateMastery(prior?.score ?? 0, evaluation.correctness, evaluation.completeness), attempts: (prior?.attempts ?? 0) + 1 };
  }));
  const quality = Math.round(evaluation.correctness * 0.6 + evaluation.completeness * 0.4);

  db.transaction((tx) => {
    tx.insert(responses).values({
      id: responseId,
      sessionId,
      exerciseId: exercise.id,
      answer: input.answer,
      correctness: evaluation.correctness,
      completeness: evaluation.completeness,
      confidence: input.confidence,
      latencyMs: input.latencyMs,
      hintsUsed: input.hintsUsed,
      evaluationJson: JSON.stringify({ ...evaluation, score, sourceReferences }),
      evaluatorModel: provider.model,
      evaluationPromptVersion: EVALUATION_PROMPT_VERSION,
    }).run();
    tx.insert(reviewStates).values({ exerciseId: exercise.id, dueAt: schedule.dueAt, intervalDays: schedule.intervalDays, repetitions: schedule.repetitions, lastQuality: quality, updatedAt: new Date() })
      .onConflictDoUpdate({ target: reviewStates.exerciseId, set: { dueAt: schedule.dueAt, intervalDays: schedule.intervalDays, repetitions: schedule.repetitions, lastQuality: quality, updatedAt: new Date() } }).run();
    for (const mastery of masteryChanges) {
      tx.insert(masteryStates).values({ conceptId: mastery.conceptId, exerciseType: exercise.type, score: mastery.score, attempts: mastery.attempts, updatedAt: new Date() })
        .onConflictDoUpdate({ target: [masteryStates.conceptId, masteryStates.exerciseType], set: { score: mastery.score, attempts: mastery.attempts, updatedAt: new Date() } }).run();
    }
    tx.update(sessionItems).set({ completedAt: new Date() }).where(and(eq(sessionItems.sessionId, sessionId), eq(sessionItems.exerciseId, exercise.id))).run();
    const [remaining] = tx.select({ count: sql<number>`count(*)` }).from(sessionItems).where(and(eq(sessionItems.sessionId, sessionId), isNull(sessionItems.completedAt))).all();
    if (remaining?.count === 0) tx.update(sessions).set({ completedAt: new Date() }).where(eq(sessions.id, sessionId)).run();
  });
  const [item] = await db.select({ total: sql<number>`count(*)`, done: sql<number>`sum(case when completed_at is not null then 1 else 0 end)` }).from(sessionItems).where(eq(sessionItems.sessionId, sessionId));
  return Response.json({
    responseId,
    exerciseId: exercise.id,
    evaluation: { ...evaluation, score, sourceReferences },
    expectedAnswer: exercise.expectedAnswer,
    schedule: { dueAt: schedule.dueAt, rating: schedule.rating, intervalDays: schedule.intervalDays },
    progress: { completed: item?.done ?? 0, total: item?.total ?? 0 },
  });
}
