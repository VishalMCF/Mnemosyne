import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CodexProviderError, type ExtractionInput, type ExtractionResult } from "@mnemosyne/ai";
import { extractBatches } from "./knowledge/extraction-batches";
import { ExtractionCheckpoints } from "./knowledge/extraction-checkpoints";
import type { ProgressUpdate } from "./knowledge/extraction-run-store";

const directories: string[] = [];
const inputs: ExtractionInput[] = [0, 1, 2].map((order) => ({ title: "Notes", sections: [{ order, heading: `Section ${order}`, content: `Content ${order}` }], diagrams: [] }));
const result = (input: ExtractionInput): ExtractionResult => ({ concepts: [{ name: input.sections[0]!.heading, definition: "A source-grounded concept.", kind: "concept", sectionOrder: input.sections[0]!.order, confidence: 90 }], relationships: [], exercises: [] });
async function setup() {
  const directory = await mkdtemp(join(tmpdir(), "mnemosyne-resume-")); directories.push(directory);
  return { directory, checkpoints: new ExtractionCheckpoints(directory) };
}
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });

describe("resuming extraction after partial failure", () => {
  it("preserves batch 1 after batch 2 fails, then calls the provider only for batches 2 and 3", async () => {
    const { directory, checkpoints } = await setup();
    const first = { model: "sol", evaluateResponse: vi.fn(), extractKnowledge: vi.fn(async (input: ExtractionInput) => {
      if (input.sections[0]!.order === 1) throw new CodexProviderError("connection failed");
      return result(input);
    }) };
    await expect(extractBatches(inputs, first, checkpoints, () => {})).rejects.toThrow("Batch 2 of 3");
    expect(first.extractKnowledge).toHaveBeenCalledTimes(2);

    const retry = { model: "sol", evaluateResponse: vi.fn(), extractKnowledge: vi.fn(async (input: ExtractionInput) => result(input)) };
    const updates: ProgressUpdate[] = [];
    const output = await extractBatches(inputs, retry, new ExtractionCheckpoints(directory), (update) => updates.push(update));
    expect(retry.extractKnowledge.mock.calls.map(([input]) => input.sections[0]!.order)).toEqual([1, 2]);
    expect(output.map((batch) => batch.concepts[0]!.sectionOrder)).toEqual([0, 1, 2]);
    expect(updates[0]).toMatchObject({ completedBatches: 1, resumedBatches: 1, totalBatches: 3 });
    expect(updates[0]!.message).toContain("Resuming at batch 2");
    expect(updates.filter((update) => update.message.includes("Codex is analyzing")).map((update) => update.currentBatch)).toEqual([2, 3]);
    expect(updates.at(-1)?.completedBatches).toBe(3);
  });

  it("makes no Codex calls when all batches completed before a persistence failure", async () => {
    const { checkpoints } = await setup();
    const provider = { model: "sol", evaluateResponse: vi.fn(), extractKnowledge: vi.fn(async (input: ExtractionInput) => result(input)) };
    await extractBatches(inputs, provider, checkpoints, () => {});
    provider.extractKnowledge.mockClear();
    const updates: ProgressUpdate[] = [];
    expect(await extractBatches(inputs, provider, checkpoints, (update) => updates.push(update))).toHaveLength(3);
    expect(provider.extractKnowledge).not.toHaveBeenCalled();
    expect(updates[0]).toMatchObject({ completedBatches: 3, resumedBatches: 3 });
  });

  it("only regenerates a changed batch and restores later unchanged batches in order", async () => {
    const { checkpoints } = await setup();
    const provider = { model: "sol", evaluateResponse: vi.fn(), extractKnowledge: vi.fn(async (input: ExtractionInput) => result(input)) };
    await extractBatches(inputs, provider, checkpoints, () => {});
    provider.extractKnowledge.mockClear();
    const changed = inputs.map((input, index) => index === 1 ? { ...input, sections: [{ ...input.sections[0]!, content: "Changed content" }] } : input);
    const updates: ProgressUpdate[] = [];
    await extractBatches(changed, provider, checkpoints, (update) => updates.push(update));
    expect(provider.extractKnowledge).toHaveBeenCalledTimes(1);
    expect(provider.extractKnowledge.mock.calls[0]![0]).toEqual(changed[1]);
    expect(updates[0]).toMatchObject({ resumedBatches: 2, completedBatches: 2 });
  });
});
