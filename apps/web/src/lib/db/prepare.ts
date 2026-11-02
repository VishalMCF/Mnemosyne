import fs from "node:fs";
import path from "node:path";
import { databasePath } from "./config";

fs.mkdirSync(path.dirname(databasePath), { recursive: true, mode: 0o700 });
