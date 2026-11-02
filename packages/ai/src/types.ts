import { z } from "zod";

export const exerciseTypeSchema = z.enum([
  "active_recall",
  "teach_back",
  "architecture_reconstruction",
  "execution_tracing",
  "failure_analysis",
]);

export const extractionSchema = z.object({
  concepts: z.array(z.object({
    name: z.string().min(1).max(120),
    definition: z.string().min(1).max(2_000),
    kind: z.enum(["concept", "definition", "responsibility", "process", "invariant", "prerequisite"]),
    sectionOrder: z.number().int().nonnegative(),
    confidence: z.number().min(0).max(100),
  })).max(100),
  relationships: z.array(z.object({
    sourceName: z.string().min(1),
    targetName: z.string().min(1),
    relationship: z.string().min(1).max(120),
    sectionOrder: z.number().int().nonnegative(),
    confidence: z.number().min(0).max(100),
  })).max(200),
  exercises: z.array(z.object({
    conceptNames: z.array(z.string().min(1)).min(1).max(8),
    type: exerciseTypeSchema,
    prompt: z.string().min(1).max(1_500),
    expectedAnswer: z.string().min(1).max(3_000),
    difficulty: z.number().int().min(1).max(5),
    sectionOrder: z.number().int().nonnegative(),
  })).max(100),
});

export const evaluationSchema = z.object({
  correctness: z.number().int().min(0).max(100),
  completeness: z.number().int().min(0).max(100),
  explanation: z.string().min(1).max(2_000),
  missingPoints: z.array(z.string().max(500)).max(20),
  misconceptions: z.array(z.string().max(500)).max(20),
  sourceSectionOrders: z.array(z.number().int().nonnegative()).max(30),
});

export type ExerciseType = z.infer<typeof exerciseTypeSchema>;
export type ExtractionResult = z.infer<typeof extractionSchema>;
export type EvaluationResult = z.infer<typeof evaluationSchema>;
export const EVALUATION_PROMPT_VERSION = "mnemosyne-evaluation-v1";

export interface SourceSection {
  order: number;
  heading: string;
  content: string;
}

export interface ExtractionInput {
  title: string;
  sections: SourceSection[];
  diagrams: Array<{ type: string; source: string; graph: unknown; sectionOrder: number }>;
}

export interface EvaluationInput {
  prompt: string;
  expectedAnswer: string;
  answer: string;
  sourceSections: SourceSection[];
}

export interface AIProvider {
  extractKnowledge(input: ExtractionInput): Promise<ExtractionResult>;
  evaluateResponse(input: EvaluationInput): Promise<EvaluationResult>;
}
