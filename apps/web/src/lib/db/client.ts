import "server-only";

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { databasePath } from "./config";
import * as schema from "./schema";

fs.mkdirSync(path.dirname(databasePath), { recursive: true, mode: 0o700 });

const sqlite = new Database(databasePath);
fs.chmodSync(databasePath, 0o600);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
