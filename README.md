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

## Learn product development by building Mnemosyne

Use Mnemosyne as a product lab, not only as a software project. Treat product books as hypotheses about how to make decisions: apply one idea to a real product choice, observe what happens, and decide whether it helped in this context. A working feature proves it can be built; it does not prove learners want it, can use it, or retain more with it.

Start with a specific learning problem and establish a baseline before adding more features. For example:

> When I study technical documents, I often recognize the material while rereading but cannot explain the system later. Can Mnemosyne help me explain it from memory after a delay, with less effort than my current approach?

Try the smallest useful test first: compare a learner's normal study method with a simple Mnemosyne study-and-recall workflow on comparable material. Record study time, what the learner can recall or explain the next day, where they get stuck, and whether they return to review. Usage counts can help explain behavior, but do not by themselves show that learning improved. When testing with other people, explain what stays local and what an AI provider receives; get their agreement before processing their documents.

For each experiment, capture:

```text
Question:
Who has this problem?
What do they do today?
Our assumption:
Smallest test:
What we expected:
What happened:
What surprised us:
Decision: continue / change / stop
What evidence would change our mind?
```

Useful lenses to try include validated learning and build–measure–learn from [The Lean Startup](https://lean.st/principles/validated-learning/), ongoing user discovery from [Continuous Discovery Habits](https://www.producttalk.org/continuous-discovery-habits/), product risk discovery from [Inspired](https://www.svpg.com/four-big-risks/), and problem, appetite, scope, and exclusions from [Shape Up](https://basecamp.com/shapeup). Apply practices where they help answer a real question; adapt or skip ceremony that does not fit a solo, Codex-assisted project. User conversations can reveal patterns, but a few conversations do not prove market demand. Treat the current feature set as assumptions and let observed learning outcomes guide the next slice.
