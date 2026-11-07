import { afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ExtractionRunStore } from "./knowledge/extraction-run-store";

const directories: string[] = [];
function setup() {
  const directory = mkdtempSync(join(tmpdir(), "mnemosyne-progress-"));
  directories.push(directory);
  return { directory, store: new ExtractionRunStore(directory), documentId: randomUUID(), runId: randomUUID() };
}
afterEach(() => { for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true }); });

describe("durable extraction progress", () => {
  it("persists stages and batch counts for a newly opened status reader", () => {
    const { directory, store, documentId, runId } = setup();
    const { run } = store.start(documentId, runId);
    store.update(run, { stage: "analyzing", message: "Waiting for batch 1", completedBatches: 0, totalBatches: 3 });
    const restored = new ExtractionRunStore(directory).read(documentId);
    expect(restored).toMatchObject({ runId, stage: "analyzing", totalBatches: 3, completedBatches: 0 });
    store.update(run, { stage: "analyzing", message: "Batch 1 finished", completedBatches: 1 });
    store.update(run, { stage: "failed", message: "Codex timed out" });
    expect(store.read(documentId, runId)?.events.map((event) => event.message)).toEqual(["Reading the document and preparing batches", "Waiting for batch 1", "Batch 1 finished", "Codex timed out"]);
  });

  it("reuses the active run and permits a new run after a terminal state", () => {
    const { store, documentId, runId } = setup();
    const { run } = store.start(documentId, runId);
    expect(store.start(documentId, randomUUID())).toMatchObject({ created: false, run: { runId } });
    store.update(run, { stage: "completed", message: "Saved" });
    expect(store.start(documentId, randomUUID()).created).toBe(true);
    expect(store.read(documentId, runId)?.stage).toBe("completed");
  });

  it("marks a run interrupted when its server process has exited and allows retry", () => {
    const { directory, store, documentId, runId } = setup();
    const { run } = store.start(documentId, runId);
    writeFileSync(join(directory, `${runId}.json`), JSON.stringify({ ...run, ownerPid: 2147483647 }));
    expect(store.read(documentId)?.stage).toBe("interrupted");
    expect(store.start(documentId, randomUUID()).created).toBe(true);
  });

  it("rejects invalid identifiers and prevents reading another document's run", () => {
    const { directory, store, documentId, runId } = setup();
    store.start(documentId, runId);
    expect(store.read(randomUUID(), runId)).toBeNull();
    expect(() => store.read(documentId, "../../secret")).toThrow("Invalid extraction identifier");
    expect(JSON.parse(readFileSync(join(directory, `${runId}.json`), "utf8")).documentId).toBe(documentId);
  });
});
