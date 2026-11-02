import path from "node:path";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(path.resolve(process.cwd(), "../.."));

export const repositoryRoot = path.resolve(process.cwd(), "../..");
const configuredPath = process.env.DATABASE_URL ?? "./data/database/mnemosyne.sqlite";

export const databasePath = path.isAbsolute(configuredPath)
  ? configuredPath
  : path.resolve(repositoryRoot, configuredPath);
