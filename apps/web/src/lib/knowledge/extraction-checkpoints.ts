import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { extractionSchema, type ExtractionResult } from "@mnemosyne/ai";

// Checkpoints are local, validated model output. They are reused only for identical
// input, model, prompt version, and schema, and removed after a successful commit.
export class ExtractionCheckpoints {
  constructor(private readonly directory: string) {}

  key(identity: unknown) { return createHash("sha256").update(JSON.stringify(identity)).digest("hex"); }
  private file(key: string) {
    if (!/^[a-f0-9]{64}$/.test(key)) throw new Error("Invalid checkpoint key");
    return join(this.directory, `${key}.json`);
  }
  async read(key: string): Promise<ExtractionResult | null> {
    try { return extractionSchema.parse(JSON.parse(await readFile(this.file(key), "utf8"))); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      // A damaged checkpoint is safe to regenerate; never persist its contents.
      if (error instanceof SyntaxError || (error as Error).name === "ZodError") return null;
      throw error;
    }
  }
  async save(key: string, result: ExtractionResult) {
    const validated = extractionSchema.parse(result);
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const target = this.file(key);
    const temporary = `${target}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(validated), { mode: 0o600 });
    await rename(temporary, target);
  }
  async clear() { await rm(this.directory, { recursive: true, force: true }); }
}
