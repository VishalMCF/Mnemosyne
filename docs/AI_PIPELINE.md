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
