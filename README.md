# Mnemosyne

Local-first AI-assisted knowledge retention and cognitive training. Documents, extracted knowledge, and learning history stay on this machine. Remote AI processing is optional and will only run after an explicit user action.

## Requirements

- Node.js 20.9 or newer
- pnpm 9 or newer

## Local development

```sh
pnpm install
cp .env.example .env.local
pnpm db:setup
pnpm dev
```

Open <http://127.0.0.1:3000>. The development server binds to loopback only. The SQLite database and imported content are stored under the repository's ignored `data/` directory.

Useful commands:

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm --filter @mnemosyne/web exec playwright install chromium
pnpm test:e2e
pnpm build
```

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for workflow and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system boundaries.

## Product workflows

- Import and deduplicate Markdown files. Parsing, section hierarchy, chunks, and supported Mermaid graph extraction run locally.
- Explicitly trigger source-grounded AI extraction and retry it without losing the original source.
- Review active-recall, teach-back, architecture reconstruction, execution tracing, and failure-analysis exercises.
- Save responses, confidence, latency, hints, feedback, per-skill mastery, and configurable review intervals locally.
- Inspect source provenance, concept relationships, retention trends, weak skills, and review backlog.

Remote AI processing is optional and requires an OpenAI API key in `.env.local`. The application never requires cloud storage.
