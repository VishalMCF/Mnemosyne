# AI pipeline

## Provider boundary

AI calls stay behind the provider-independent server-side interface in `packages/ai`. The provider invokes headless Codex with the existing ChatGPT login. It defaults to `gpt-5.6-sol` and medium reasoning effort. No API key is required. `CODEX_MODEL` and `CODEX_BIN` are optional server-side settings.

```ts
interface AIProvider {
  extractKnowledge(input: ExtractionInput): Promise<ExtractionResult>;
  evaluateResponse(input: EvaluationInput): Promise<EvaluationResult>;
}
```

Validate structured responses with Zod before persistence. Keep Codex authentication and provider configuration server-side. Use `--output-schema` and read only the final JSON output; process logs are never treated as model output or exposed to the client.

Each call uses an isolated temporary directory, stdin for input, `--ephemeral`, `--ignore-user-config`, read-only sandboxing, disabled web search and execution/integration features, and a three-minute process timeout. Force ChatGPT authentication and omit API-key environment variables. Clean up temporary files on every exit. Failures return actionable Codex setup, login, timeout, or connection messages without exposing raw CLI logs.

## Explicit, separate processing

File validation, deterministic parsing, chunking, and local persistence happen before AI extraction. AI processing is a distinct user-triggered action and sends bounded chunks from only the selected document. A provider failure leaves the imported document and parsed content intact and retryable. No document is sent remotely merely because it was imported.

## Grounding and untrusted content

The source document is the evidence for extraction and evaluation. Every concept and exercise carries document and section references. Evaluation returns correctness, completeness, explanation, missing points, misconceptions, and evidence references. The model is an assistant, not the authority: feedback must be traceable to source material and reviewable.

Treat document content as untrusted quoted data. Do not provide tools to extraction/evaluation calls. Ignore embedded requests to change instructions, access secrets, or perform actions. Bound input size and validate all returned fields.

## Versioning

Persist provider/model identity, prompt version, schema version, and timestamp for generated artifacts. Reprocessing should create a new extraction version while preserving learner response and scheduling history.

## Extraction progress and debugging

Every extraction has a UUID run ID displayed on the Library card with a copy button. The progress panel polls `GET /api/documents/{documentId}/extract` every two seconds while a run is active. Add `?runId={runId}` to look up a particular run for that document. The stages are preparing, analyzing, validating, saving, and completed (or failed/interrupted). Batch progress counts finished Codex calls; it does not estimate progress inside an individual model response.

Snapshots and timestamped stage events are saved in ignored `data/extraction-runs/{runId}.json`. Terminal messages include `[extraction {runId}]`. To investigate a shared run ID, open that JSON file for its document ID, stage, completed/total batches, timestamps, and event history. No source text or model reasoning is included in this history. A document lock prevents duplicate extractions, and a run whose server process has exited is marked interrupted when its status is read.

The extraction still runs within the POST request, rather than a durable background worker. Refreshing the Library reconnects to saved progress. Server interruption requires starting a new run. Validated batches are checkpointed under `data/extraction-checkpoints/{documentId}/` and reused on retry when input, model, prompt version, and schema match. Checkpoints are removed after the full extraction commits successfully.

The JSON schema supplied to Codex is generated from the same Zod schema used for output validation, including all string, array, numeric, and difficulty bounds. Validation failures identify the batch and rejected fields. Original server exceptions are saved locally as `data/extraction-runs/{runId}.error.json` alongside the progress snapshot; browser responses continue to use safe error messages. Older runs created before exception capture cannot recover their original failure details.

### Resuming a partial extraction

For a failed document, choose **Resume extraction** in the Library. The server prepares the complete batch plan, validates all matching checkpoints first, and initializes the new run's progress with the restored count. Its first history entry reports how many batches were restored and which missing batch will run next. Completed batches are skipped without another Codex call. `resumedBatches` is recorded in the run snapshot and shown in the progress panel. Remaining results are merged in original batch order, including when only a middle batch is missing.

Checkpoint identity is compatible with the original per-batch checkpoint files. Changes to source input, model, prompt version, or output schema invalidate only matching cache entries; they are regenerated. A retry after all batches succeeded but saving failed can reuse every batch and proceed directly to validation and persistence. Checkpoints are cleared only after the full database transaction succeeds.
