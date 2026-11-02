import { foreignKey, index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const createdAt = (name = "created_at") => integer(name, { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date());

export const sources = sqliteTable("sources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: createdAt(),
});

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").notNull().references(() => sources.id, { onDelete: "cascade" }),
  originalFilename: text("original_filename").notNull(),
  storedPath: text("stored_path").notNull(),
  sha256: text("sha256").notNull().unique(),
  title: text("title").notNull(),
  status: text("status", { enum: ["imported", "parsed", "extraction_failed", "extracted"] }).notNull().default("imported"),
  extractionVersion: integer("extraction_version").notNull().default(0),
  lastError: text("last_error"),
  createdAt: createdAt(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
}, (table) => [index("documents_source_idx").on(table.sourceId)]);

export const sections = sqliteTable("sections", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  parentId: text("parent_id"),
  heading: text("heading").notNull(),
  headingLevel: integer("heading_level").notNull(),
  order: integer("order").notNull(),
  startLine: integer("start_line").notNull(),
  endLine: integer("end_line").notNull(),
  content: text("content").notNull(),
}, (table) => [
  index("sections_document_order_idx").on(table.documentId, table.order),
  foreignKey({ columns: [table.parentId], foreignColumns: [table.id], name: "sections_parent_fk" }).onDelete("cascade"),
]);

export const chunks = sqliteTable("chunks", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  sectionId: text("section_id").references(() => sections.id, { onDelete: "cascade" }),
  order: integer("order").notNull(),
  content: text("content").notNull(),
  tokenEstimate: integer("token_estimate").notNull(),
}, (table) => [index("chunks_document_order_idx").on(table.documentId, table.order)]);

export const diagrams = sqliteTable("diagrams", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  sectionId: text("section_id").references(() => sections.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["flowchart", "sequence", "class", "state", "er", "other"] }).notNull(),
  source: text("source").notNull(),
  graphJson: text("graph_json").notNull(),
  extractionConfidence: integer("extraction_confidence").notNull(),
  startLine: integer("start_line").notNull(),
  endLine: integer("end_line").notNull(),
});

export const concepts = sqliteTable("concepts", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  sectionId: text("section_id").notNull().references(() => sections.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  definition: text("definition").notNull(),
  kind: text("kind", { enum: ["concept", "definition", "responsibility", "process", "invariant", "prerequisite"] }).notNull(),
  confidence: integer("confidence").notNull(),
  generationVersion: integer("generation_version").notNull(),
  isCurrent: integer("is_current", { mode: "boolean" }).notNull().default(true),
  model: text("model").notNull(),
  promptVersion: text("prompt_version").notNull(),
  createdAt: createdAt(),
}, (table) => [uniqueIndex("concept_document_section_name_version_idx").on(table.documentId, table.sectionId, table.normalizedName, table.generationVersion), index("concepts_current_idx").on(table.documentId, table.isCurrent)]);

export const relationships = sqliteTable("relationships", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  sourceConceptId: text("source_concept_id").notNull().references(() => concepts.id, { onDelete: "cascade" }),
  targetConceptId: text("target_concept_id").notNull().references(() => concepts.id, { onDelete: "cascade" }),
  sectionId: text("section_id").notNull().references(() => sections.id, { onDelete: "cascade" }),
  relationship: text("relationship").notNull(),
  confidence: integer("confidence").notNull(),
  generationVersion: integer("generation_version").notNull(),
});

export const exercises = sqliteTable("exercises", {
  id: text("id").primaryKey(),
  prompt: text("prompt").notNull(),
  expectedAnswer: text("expected_answer").notNull(),
  type: text("type", { enum: ["active_recall", "teach_back", "architecture_reconstruction", "execution_tracing", "failure_analysis"] }).notNull(),
  difficulty: integer("difficulty").notNull(),
  generationVersion: integer("generation_version").notNull(),
  model: text("model").notNull(),
  promptVersion: text("prompt_version").notNull(),
  isCurrent: integer("is_current", { mode: "boolean" }).notNull().default(true),
  createdAt: createdAt(),
}, (table) => [index("exercises_type_current_idx").on(table.type, table.isCurrent)]);

export const exerciseConcepts = sqliteTable("exercise_concepts", {
  exerciseId: text("exercise_id").notNull().references(() => exercises.id, { onDelete: "cascade" }),
  conceptId: text("concept_id").notNull().references(() => concepts.id, { onDelete: "cascade" }),
  sectionId: text("section_id").notNull().references(() => sections.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.exerciseId, table.conceptId, table.sectionId] })]);

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  startedAt: createdAt("started_at"),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
});

export const sessionItems = sqliteTable("session_items", {
  sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  exerciseId: text("exercise_id").notNull().references(() => exercises.id, { onDelete: "restrict" }),
  order: integer("order").notNull(),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
}, (table) => [primaryKey({ columns: [table.sessionId, table.exerciseId] })]);

export const responses = sqliteTable("responses", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  exerciseId: text("exercise_id").notNull().references(() => exercises.id, { onDelete: "restrict" }),
  answer: text("answer").notNull(),
  correctness: integer("correctness").notNull(),
  completeness: integer("completeness").notNull(),
  confidence: integer("confidence").notNull(),
  latencyMs: integer("latency_ms").notNull(),
  hintsUsed: integer("hints_used").notNull().default(0),
  evaluationJson: text("evaluation_json").notNull(),
  evaluatorModel: text("evaluator_model").notNull(),
  evaluationPromptVersion: text("evaluation_prompt_version").notNull(),
  createdAt: createdAt(),
}, (table) => [uniqueIndex("responses_session_exercise_unique").on(table.sessionId, table.exerciseId), index("responses_session_idx").on(table.sessionId), index("responses_exercise_idx").on(table.exerciseId), index("responses_created_idx").on(table.createdAt)]);

export const reviewStates = sqliteTable("review_states", {
  exerciseId: text("exercise_id").primaryKey().references(() => exercises.id, { onDelete: "cascade" }),
  dueAt: integer("due_at", { mode: "timestamp_ms" }).notNull(),
  intervalDays: real("interval_days").notNull().default(0),
  repetitions: integer("repetitions").notNull().default(0),
  lastQuality: integer("last_quality"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
}, (table) => [index("review_due_idx").on(table.dueAt)]);

export const masteryStates = sqliteTable("mastery_states", {
  conceptId: text("concept_id").notNull().references(() => concepts.id, { onDelete: "cascade" }),
  exerciseType: text("exercise_type", { enum: ["active_recall", "teach_back", "architecture_reconstruction", "execution_tracing", "failure_analysis"] }).notNull(),
  score: integer("score").notNull().default(0),
  attempts: integer("attempts").notNull().default(0),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
}, (table) => [primaryKey({ columns: [table.conceptId, table.exerciseType] })]);

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});
