# Mnemosyne

Local-first AI-assisted knowledge retention and cognitive training. Documents, extracted knowledge, and learning history stay on this machine. Remote AI processing is optional and will only run after an explicit user action.

## Requirements

- Node.js 20.9 or newer
- pnpm 9 or newer
- Codex CLI signed in with ChatGPT (`codex login`) for knowledge extraction and answer evaluation

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

AI processing uses headless `codex exec` with your existing ChatGPT login. No API key is required. The default is `gpt-5.6-sol` with medium reasoning effort; set `CODEX_MODEL` to override the model or `CODEX_BIN` to use an absolute Codex executable path. Sign in once with `codex login` on the machine running the app. Source content is sent to Codex only when you explicitly extract knowledge or submit an answer. The application never requires cloud storage.

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

## Cognitive Learning Studio prototype

Run `pnpm dev` from the repository root and open <http://127.0.0.1:3000/studio>. The existing dashboard includes an **Open Studio** link. Existing `/library`, `/training`, and `/analytics` screens remain available through **Existing Mnemosyne**.

The prototype is fully client-side: it does not call the API, execute provider CLIs, modify the SQLite database, or send content to a service. All sample reading content is original. Book titles identify companion exercises, not reproduced chapters.

Explore the Library, open a document, and start its six-stage learning program. Annotate selected passages, compress the argument, build concept graphs, reconstruct with the source hidden, and apply the material to a changed scenario. The coach uses deterministic questions and feedback. Reference comparisons use normalized concept names and directed relationship labels, with a penalty for unmatched concepts and relationships; they are illustrative, not semantic or scientific evaluations.

Drafts, annotations, graphs, completed stages, reconstruction results, review schedules, themes, and visual provider settings persist under `mnemosyne.studio.v1` in browser localStorage. Coach chat is session-only. Settings can export progress or clear only prototype learning data. Clearing browser storage clears saved prototype progress.

Exact local commands (Node 20.9+; this machine has a working Node 24 install):

```sh
cd /Users/apple/Desktop/personal-projects/mnemosyne
export PATH="/Users/apple/.nvm/versions/node/v24.14.0/bin:$PATH"
pnpm dev
```

Open <http://127.0.0.1:3000/studio>. Keep the terminal open. No API key or Codex login is required for the prototype.

Validation commands:

```sh
pnpm typecheck
pnpm lint
pnpm build
pnpm --filter @mnemosyne/web exec vitest run src/lib/studio.test.ts
# Alternative compiler when a restricted environment blocks Turbopack's local ports:
pnpm --filter @mnemosyne/web exec next build --webpack
```

At implementation time, typechecking and the Webpack build pass. The standard build and development server are blocked by port-binding restrictions in the agent environment. Repository lint is blocked before code analysis because the installed `typescript-eslint` package rejects TypeScript 7. No dependencies were added or upgraded. Browser end-to-end interactions could not be verified in that environment.
