import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type ExtractionStage = "preparing" | "analyzing" | "validating" | "saving" | "completed" | "failed" | "interrupted";
export type ProgressUpdate = { stage: ExtractionStage; message: string; completedBatches?: number; totalBatches?: number; resumedBatches?: number; currentBatch?: number };
export type ExtractionRun = {
  runId: string; documentId: string; ownerPid: number; stage: ExtractionStage; message: string;
  completedBatches: number; totalBatches: number; resumedBatches?: number; currentBatch?: number; startedAt: string; updatedAt: string;
  events: Array<{ at: string; stage: ExtractionStage; message: string }>;
};
export const isRunning = (stage: ExtractionStage) => !["completed", "failed", "interrupted"].includes(stage);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ExtractionRunStore {
  constructor(private readonly directory: string) {}

  private file(id: string, suffix = ".json") {
    if (!uuid.test(id)) throw new Error("Invalid extraction identifier");
    return join(this.directory, `${id}${suffix}`);
  }

  private write(run: ExtractionRun) {
    const target = this.file(run.runId);
    const temporary = `${target}.${randomUUID()}.tmp`;
    writeFileSync(temporary, JSON.stringify(run, null, 2), { mode: 0o600 });
    renameSync(temporary, target);
  }

  read(documentId: string, runId?: string): ExtractionRun | null {
    if (!runId) {
      const latest = this.file(documentId, ".latest");
      if (!existsSync(latest)) return null;
      runId = readFileSync(latest, "utf8");
    }
    const file = this.file(runId);
    if (!existsSync(file)) return null;
    const run = JSON.parse(readFileSync(file, "utf8")) as ExtractionRun;
    if (run.documentId !== documentId) return null;
    if (isRunning(run.stage)) {
      try { process.kill(run.ownerPid, 0); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ESRCH") {
          return this.update(run, { stage: "interrupted", message: "The server stopped before extraction finished. Retry extraction to start a new run." });
        }
      }
    }
    return run;
  }

  start(documentId: string, runId: string): { run: ExtractionRun; created: boolean } {
    mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    const lock = this.file(documentId, ".lock");
    const previous = this.read(documentId);
    if (previous && isRunning(previous.stage)) return { run: previous, created: false };
    if (existsSync(lock)) {
      const owner = JSON.parse(readFileSync(lock, "utf8")) as { pid: number };
      let alive = true;
      try { process.kill(owner.pid, 0); }
      catch (error) { if ((error as NodeJS.ErrnoException).code === "ESRCH") alive = false; }
      if (alive) throw new Error("Extraction is starting. Wait a moment and retry.");
      unlinkSync(lock);
    }
    writeFileSync(lock, JSON.stringify({ pid: process.pid, runId }), { flag: "wx", mode: 0o600 });
    try {
      if (existsSync(this.file(runId))) throw new Error("Run ID has already been used");
      const now = new Date().toISOString();
      const run: ExtractionRun = { runId, documentId, ownerPid: process.pid, stage: "preparing", message: "Reading the document and preparing batches", completedBatches: 0, totalBatches: 0, startedAt: now, updatedAt: now, events: [{ at: now, stage: "preparing", message: "Reading the document and preparing batches" }] };
      this.write(run);
      writeFileSync(this.file(documentId, ".latest"), runId, { mode: 0o600 });
      return { run, created: true };
    } catch (error) { unlinkSync(lock); throw error; }
  }

  recordError(run: ExtractionRun, error: unknown) {
    const detail = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { name: "UnknownError", message: String(error) };
    writeFileSync(this.file(run.runId, ".error.json"), JSON.stringify({ runId: run.runId, documentId: run.documentId, failedStage: run.stage, batch: run.currentBatch ?? run.completedBatches + 1, recordedAt: new Date().toISOString(), error: detail }, null, 2), { mode: 0o600 });
  }

  update(run: ExtractionRun, update: ProgressUpdate): ExtractionRun {
    const now = new Date().toISOString();
    Object.assign(run, update, { updatedAt: now });
    run.events.push({ at: now, stage: update.stage, message: update.message });
    this.write(run);
    if (!isRunning(run.stage)) {
      const lock = this.file(run.documentId, ".lock");
      if (existsSync(lock) && JSON.parse(readFileSync(lock, "utf8")).runId === run.runId) unlinkSync(lock);
    }
    return run;
  }
}
