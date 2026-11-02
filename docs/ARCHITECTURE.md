# Architecture

## Shape

Mnemosyne is a local Next.js App Router application and a modular monolith. `apps/web` owns the UI and server endpoints. Business capabilities live in internal workspace packages and are imported directly; they are not independently deployed services.

```text
Browser (127.0.0.1)
        │
        ▼
Next.js UI and server routes
        │
        ├── core domain and application services
        ├── ingestion ── knowledge ── learning
        ├── AI provider interface (server only; remote call is explicit)
        └── database repositories ── SQLite file under data/
```

## Capability boundaries

- `packages/core`: domain types, application services, and ports/interfaces.
- `packages/ingestion`: deterministic Markdown parsing, Mermaid extraction, and chunking.
- `packages/knowledge`: concept extraction contracts, provenance, relationships, and graph operations.
- `packages/learning`: exercise types, evaluation, sessions, and scheduling.
- `packages/ai`: provider adapters, prompt contracts, and structured output validation.
- `packages/database`: Drizzle schema, migrations, and repository implementations.
- `apps/web`: Next.js pages, server-only orchestration, and HTTP boundaries.

These packages are workspace modules in one repository, not separately published products. Markdown/Mermaid parsing and learning schedules are implemented as pure capability modules. Next.js API routes coordinate persistence and provider calls. Avoid cross-capability database access; capabilities should use explicit repository interfaces.

## Data ownership and persistence

SQLite stores structured state. Original Markdown files and backups live under the ignored repository-level `data/` directory. No cloud storage is part of the application. The AI provider interface is server-only, so browser code never receives credentials. A source document is persisted before optional AI extraction; extraction failure must leave it available for retry.

## Request and processing flow

1. Validate and persist an explicitly imported file with a SHA-256 duplicate check.
2. Parse Markdown and Mermaid deterministically and persist source locations, chunks, diagram source, graph candidates, and extraction confidence.
3. Offer AI extraction as a separate, explicit action.
4. Validate AI output against Zod schemas and attach provenance.
5. Generate versioned exercises from accepted concepts and source references.
6. Evaluate answers against the cited source sections, save response details, update mastery by exercise type, and schedule reviews locally.

Imported text is untrusted data. Prompts must isolate it as quoted content, use no tools, and never treat document instructions as system instructions.

## Local security boundary

Development and production local servers bind to loopback. File access is restricted to the import flow and managed data directory. Rendered Markdown and Mermaid must be sanitized. Secrets belong in local environment configuration and server-only modules. Database, imported files, and backups remain gitignored.

## Foundation choices

The initial persistence driver is SQLite via `better-sqlite3` and Drizzle. Synchronous SQLite access is appropriate for the single-user local server and keeps the first database boundary small. Next.js App Router provides the UI and local application server. Tailwind provides styling; UI components should remain accessible and may follow the shadcn/ui copy-in pattern as product surfaces grow.
