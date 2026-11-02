# Development

## Commands

Run from the repository root with pnpm:

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start Next.js bound to `127.0.0.1:3000` |
| `pnpm typecheck` | TypeScript validation |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest unit tests |
| `pnpm test:e2e` | Playwright browser tests |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Apply local SQLite migrations |
| `pnpm build` | Production build |

Before the first browser test run, install its browser with `pnpm --filter @mnemosyne/web exec playwright install chromium`.

Copy `.env.example` to `.env.local` for local settings. `DATABASE_URL` accepts an absolute path or a path relative to the repository root. Never commit `.env.local`, database files, imported documents, or backups.

## Milestone workflow

Implement one product milestone at a time. Keep the change reviewable, update architecture/data-flow documentation when boundaries change, and run the checks relevant to the change. Do not begin the next milestone until the current implementation has been reviewed.

## Code organization

Keep Next.js routes thin. Put domain behavior behind capability-oriented modules and use interfaces at boundaries. Keep file-system, SQLite, and AI provider code server-only. Prefer deterministic parsing and scheduling rules; isolate model-dependent behavior behind the provider contract.

The spaced repetition defaults live in `packages/learning/src/scheduling.ts` and can be overridden through the scheduler's interval options. Keep defaults explicit and reviewable when tuning them.

## UI conventions

Use Tailwind for layout and component styles, with accessible semantic HTML. Adopt small shadcn/ui-style components as needed rather than coupling domain code to UI primitives. The dashboard is a local-first orientation surface; its sample activity is presentational until analytics data exists.
