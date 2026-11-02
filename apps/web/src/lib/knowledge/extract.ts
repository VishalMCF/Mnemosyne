import "server-only";

import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import { normalizeConceptName } from "@mnemosyne/knowledge";
import { PROMPT_VERSION } from "@mnemosyne/ai";
import { getAIProvider } from "@/lib/ai/provider";
import { db } from "@/lib/db/client";
import { chunks, concepts, documents, diagrams, exerciseConcepts, exercises, masteryStates, relationships, reviewStates, sections } from "@/lib/db/schema";


export async function extractDocument(documentId: string) {
  const [document] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
  if (!document) throw new Error("Document not found");
  const [sourceSections, sourceChunks, sourceDiagrams] = await Promise.all([
    db.select().from(sections).where(eq(sections.documentId, document.id)).orderBy(asc(sections.order)),
    db.select().from(chunks).where(eq(chunks.documentId, document.id)).orderBy(asc(chunks.order)),
    db.select().from(diagrams).where(eq(diagrams.documentId, document.id)),
  ]);
  if (!sourceSections.length) throw new Error("Document has no parsed content to process");

  const provider = getAIProvider();
  const sectionById = new Map<string, (typeof sourceSections)[number]>(sourceSections.map((section) => [section.id, section] as const));
  const chunkInputs = sourceChunks.map((chunk) => {
    const section = chunk.sectionId ? sectionById.get(chunk.sectionId) : sourceSections.find((entry) => entry.headingLevel === 0);
    return { order: section?.order ?? 0, heading: section?.heading ?? "Document", content: chunk.content };
  });
  if (!chunkInputs.length) chunkInputs.push(...sourceSections.map((section) => ({ order: section.order, heading: section.heading, content: section.content.slice(0, 8_000) })));
  const batches: typeof chunkInputs[] = [];
  let batch: typeof chunkInputs = [];
  let batchSize = 0;
  for (const item of chunkInputs) {
    if (batch.length && (batch.length >= 5 || batchSize + item.content.length > 20_000)) {
      batches.push(batch);
      batch = [];
      batchSize = 0;
    }
    batch.push(item);
    batchSize += item.content.length;
  }
  if (batch.length) batches.push(batch);
  const extracted: Awaited<ReturnType<typeof provider.extractKnowledge>>[] = [];
  for (const sectionBatch of batches) {
    const orders = new Set(sectionBatch.map((item) => item.order));
    extracted.push(await provider.extractKnowledge({
      title: document.title,
      sections: sectionBatch,
      diagrams: sourceDiagrams.filter((diagram) => orders.has(sectionById.get(diagram.sectionId ?? "")?.order ?? -1)).map((diagram) => ({
        type: diagram.type,
        source: diagram.source.slice(0, 4_000),
        graph: limitGraph(JSON.parse(diagram.graphJson) as { nodes?: unknown[]; edges?: unknown[] }),
        sectionOrder: sectionById.get(diagram.sectionId ?? "")?.order ?? 0,
      })),
    }));
  }
  const result = {
    concepts: [...new Map(extracted.flatMap((item) => item.concepts).map((item) => [`${item.sectionOrder}:${normalizeConceptName(item.name)}`, item])).values()],
    relationships: [...new Map(extracted.flatMap((item) => item.relationships).map((item) => [`${item.sectionOrder}:${normalizeConceptName(item.sourceName)}:${normalizeConceptName(item.targetName)}:${item.relationship}`, item])).values()],
    exercises: [...new Map(extracted.flatMap((item) => item.exercises).map((item) => [`${item.type}:${item.prompt.trim().toLowerCase()}`, item])).values()],
  };
  const sectionByOrder = new Map<number, (typeof sourceSections)[number]>(sourceSections.map((section) => [section.order, section] as const));
  for (const item of [...result.concepts, ...result.relationships, ...result.exercises]) {
    const order = "sectionOrder" in item ? item.sectionOrder : 0;
    if (!sectionByOrder.has(order)) throw new Error("AI output cited a source section that does not exist");
  }

  const version = document.extractionVersion + 1;
  const oldConcepts = await db.select().from(concepts).where(and(eq(concepts.documentId, document.id), eq(concepts.isCurrent, true)));
  const oldConceptIds = oldConcepts.map((concept) => concept.id);
  const oldStates = oldConceptIds.length
    ? await db.select().from(masteryStates).where(inArray(masteryStates.conceptId, oldConceptIds))
    : [];
  const newConcepts = new Map<string, typeof concepts.$inferInsert>();
  const oldByKey = new Map<string, (typeof oldConcepts)[number]>(oldConcepts.map((item) => [`${item.sectionId}:${item.normalizedName}`, item] as const));
  const conceptRows: (typeof concepts.$inferInsert)[] = [];

  for (const item of result.concepts) {
    const sourceSection = sectionByOrder.get(item.sectionOrder)!;
    const normalizedName = normalizeConceptName(item.name);
    const key = `${sourceSection.id}:${normalizedName}`;
    if (newConcepts.has(key)) continue;
    const row = {
      id: randomUUID(),
      documentId: document.id,
      sectionId: sourceSection.id,
      name: item.name,
      normalizedName,
      definition: item.definition,
      kind: item.kind,
      confidence: Math.round(item.confidence),
      generationVersion: version,
      isCurrent: true,
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      promptVersion: PROMPT_VERSION,
    } satisfies typeof concepts.$inferInsert;
    newConcepts.set(key, row);
    conceptRows.push(row);
  }
  const allNames = new Set(conceptRows.map((row) => row.normalizedName));
  const groundedExercises = result.exercises.filter((item) => item.conceptNames.some((name) => allNames.has(normalizeConceptName(name))));

  const oldExerciseLinks = oldConceptIds.length
    ? await db.select({ exerciseId: exerciseConcepts.exerciseId }).from(exerciseConcepts).where(inArray(exerciseConcepts.conceptId, oldConceptIds))
    : [];
  const oldExerciseIds = [...new Set(oldExerciseLinks.map((row) => row.exerciseId))];
  const exerciseRows = groundedExercises.map((item) => ({
    id: randomUUID(),
    prompt: item.prompt,
    expectedAnswer: item.expectedAnswer,
    type: item.type,
    difficulty: item.difficulty,
    generationVersion: version,
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    promptVersion: PROMPT_VERSION,
    isCurrent: true,
  } satisfies typeof exercises.$inferInsert));

  let persistedRelationshipCount = 0;
  await db.transaction((tx) => {
    if (oldConceptIds.length) {
      tx.update(concepts).set({ isCurrent: false }).where(inArray(concepts.id, oldConceptIds)).run();
    }
    if (oldExerciseIds.length) tx.update(exercises).set({ isCurrent: false }).where(inArray(exercises.id, oldExerciseIds)).run();
    if (conceptRows.length) tx.insert(concepts).values(conceptRows).run();

    if (result.relationships.length) {
      const relationRows = result.relationships.flatMap((item) => {
        const sourceName = normalizeConceptName(item.sourceName);
        const targetName = normalizeConceptName(item.targetName);
        const sourceSection = sectionByOrder.get(item.sectionOrder);
        if (!sourceSection) return [];
        const sourceConcept = conceptRows.find((row) => row.normalizedName === sourceName && row.sectionId === sourceSection.id)
          ?? conceptRows.find((row) => row.normalizedName === sourceName);
        const targetConcept = conceptRows.find((row) => row.normalizedName === targetName && row.sectionId === sourceSection.id)
          ?? conceptRows.find((row) => row.normalizedName === targetName);
        if (!sourceConcept || !targetConcept) return [];
        return [{ id: randomUUID(), documentId: document.id, sourceConceptId: sourceConcept.id!, targetConceptId: targetConcept.id!, sectionId: sourceSection.id, relationship: item.relationship, confidence: Math.round(item.confidence), generationVersion: version }];
      });
      if (relationRows.length) {
        tx.insert(relationships).values(relationRows).run();
        persistedRelationshipCount = relationRows.length;
      }
    }

    for (let i = 0; i < groundedExercises.length; i += 1) {
      const item = groundedExercises[i]!;
      const exercise = exerciseRows[i]!;
      tx.insert(exercises).values(exercise).run();
      const linked = conceptRows.filter((row) => item.conceptNames.some((name) => normalizeConceptName(name) === row.normalizedName));
      for (const concept of linked) tx.insert(exerciseConcepts).values({ exerciseId: exercise.id, conceptId: concept.id!, sectionId: concept.sectionId }).run();
      tx.insert(reviewStates).values({ exerciseId: exercise.id, dueAt: new Date(), intervalDays: 0, repetitions: 0, updatedAt: new Date() }).run();
    }

    for (const concept of conceptRows) {
      const previous = oldByKey.get(`${concept.sectionId}:${concept.normalizedName}`);
      if (!previous) continue;
      for (const state of oldStates.filter((entry) => entry.conceptId === previous.id)) {
        tx.insert(masteryStates).values({ conceptId: concept.id!, exerciseType: state.exerciseType, score: state.score, attempts: state.attempts, updatedAt: new Date() }).onConflictDoNothing().run();
      }
    }

    tx.update(documents).set({ extractionVersion: version, status: "extracted", lastError: null, updatedAt: new Date() }).where(eq(documents.id, document.id)).run();
  });
  return { documentId: document.id, generationVersion: version, concepts: conceptRows.length, relationships: persistedRelationshipCount, exercises: exerciseRows.length };
}

function limitGraph(graph: { nodes?: unknown[]; edges?: unknown[] }) {
  return { nodes: (graph.nodes ?? []).slice(0, 300), edges: (graph.edges ?? []).slice(0, 600) };
}
