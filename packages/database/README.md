# Database

`src/schema.ts` is the Drizzle SQLite schema for the local single-user application. Generate migration SQL with `pnpm db:generate` and apply it with `pnpm db:migrate`. The database file is under ignored `data/database/` by default; never commit it.
