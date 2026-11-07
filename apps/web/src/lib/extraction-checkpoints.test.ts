import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ExtractionCheckpoints } from "./knowledge/extraction-checkpoints";

const directories: string[] = [];
const result = { concepts: [], relationships: [], exercises: [] };
async function setup() {
  const directory = await mkdtemp(join(tmpdir(), "mnemosyne-checkpoint-test-"));
  directories.push(directory);
  return { directory, cache: new ExtractionCheckpoints(directory) };
}
afterEach(async () => { await Promise.all(directories.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))); });

describe("extraction batch checkpoints", () => {
  it("restores validated completed batches after recreating the reader", async () => {
    const { directory, cache } = await setup();
    const key = cache.key({ input: "batch 1", model: "sol", promptVersion: "v2" });
    await cache.save(key, result);
    expect(await new ExtractionCheckpoints(directory).read(key)).toEqual(result);
    expect(await cache.read(cache.key({ input: "batch 2", model: "sol", promptVersion: "v2" }))).toBeNull();
    expect(await cache.read(cache.key({ input: "batch 1", model: "different", promptVersion: "v2" }))).toBeNull();
    expect(await cache.read(cache.key({ input: "batch 1", model: "sol", promptVersion: "v3" }))).toBeNull();
  });

  it("regenerates damaged checkpoints and refuses to cache invalid model output", async () => {
    const { directory, cache } = await setup();
    const key = cache.key("batch");
    await writeFile(join(directory, `${key}.json`), "incomplete json");
    expect(await cache.read(key)).toBeNull();
    await expect(cache.save(key, { ...result, concepts: [{}] } as never)).rejects.toThrow();
  });

  it("removes checkpoints on completion", async () => {
    const { cache } = await setup();
    const key = cache.key("batch");
    await cache.save(key, result);
    await cache.clear();
    expect(await cache.read(key)).toBeNull();
  });
});
