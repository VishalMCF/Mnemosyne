import { CodexProviderError, extractionJsonSchema, PROMPT_VERSION, type AIProvider, type ExtractionInput, type ExtractionResult } from "@mnemosyne/ai";
import { ExtractionCheckpoints } from "./extraction-checkpoints";
import type { ProgressUpdate } from "./extraction-run-store";

function grounded(result: ExtractionResult, input: ExtractionInput) {
  const orders = new Set(input.sections.map((section) => section.order));
  return [...result.concepts, ...result.relationships, ...result.exercises].every((item) => orders.has(item.sectionOrder));
}

export async function extractBatches(
  inputs: ExtractionInput[],
  provider: AIProvider & { model: string },
  checkpoints: ExtractionCheckpoints,
  report: (update: ProgressUpdate) => void,
): Promise<ExtractionResult[]> {
  const keys = inputs.map((input) => checkpoints.key({ input, model: provider.model, promptVersion: PROMPT_VERSION, schema: extractionJsonSchema }));
  const saved = await Promise.all(keys.map((key) => checkpoints.read(key)));
  // Ignore outdated source references even when the checkpoint JSON is valid.
  const restored = saved.map((result, index) => result && grounded(result, inputs[index]!) ? result : null);
  const resumedBatches = restored.filter(Boolean).length;
  let completedBatches = resumedBatches;
  const totalBatches = inputs.length;
  const next = restored.findIndex((result) => !result);
  report({ stage: "preparing", completedBatches, totalBatches, resumedBatches,
    message: resumedBatches
      ? `Restored ${resumedBatches} of ${totalBatches} saved batches. ${next < 0 ? "All batches are ready; completing extraction." : `Resuming at batch ${next + 1}.`}`
      : `No saved batches match this document and model. Starting ${totalBatches} batches.` });

  const extracted: ExtractionResult[] = [];
  for (const [index, input] of inputs.entries()) {
    const cached = restored[index];
    if (cached) { extracted.push(cached); continue; }
    report({ stage: "analyzing", message: `Codex is analyzing batch ${index + 1} of ${totalBatches}; waiting for its response`, completedBatches, totalBatches, resumedBatches, currentBatch: index + 1 });
    let result: ExtractionResult;
    try { result = await provider.extractKnowledge(input); }
    catch (error) {
      if (error instanceof CodexProviderError) throw new CodexProviderError(`Batch ${index + 1} of ${totalBatches}: ${error.message}`);
      throw error;
    }
    if (!grounded(result, input)) throw new CodexProviderError(`Batch ${index + 1}: Codex cited a section not included in this batch. Retry extraction.`);
    // Commit each batch before advancing progress, so retries skip completed calls.
    await checkpoints.save(keys[index]!, result);
    extracted.push(result);
    completedBatches += 1;
    report({ stage: "analyzing", message: `Saved batch ${index + 1} of ${totalBatches}`, completedBatches, totalBatches, resumedBatches, currentBatch: index + 1 });
  }
  return extracted;
}
