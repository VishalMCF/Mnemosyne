import { defineConfig } from "drizzle-kit";
import { databasePath } from "./src/lib/db/config";

export default defineConfig({
  schema: "../../packages/database/src/schema.ts",
  out: "../../packages/database/migrations",
  dialect: "sqlite",
  dbCredentials: { url: databasePath },
});
