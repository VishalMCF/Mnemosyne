import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CodexProvider, CodexProviderError } from "@mnemosyne/ai";

const directories: string[] = [];
const evaluation = { correctness: 90, completeness: 80, explanation: "Grounded answer.", missingPoints: [], misconceptions: [], sourceSectionOrders: [0] };
const input = { prompt: "Explain the log.", expectedAnswer: "It records writes.", answer: "It records writes.", sourceSections: [{ order: 0, heading: "Log", content: "The log records writes." }] };

afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });

async function fakeCodex(script: string, timeout = 5_000) {
  const directory = await mkdtemp(join(tmpdir(), "mnemosyne-provider-test-"));
  directories.push(directory);
  const executable = join(directory, "fake codex");
  await writeFile(executable, `#!${process.execPath}\n${script}`, { mode: 0o700 });
  return { provider: new CodexProvider("gpt-5.6-sol", executable, timeout), directory };
}

describe("Codex headless provider", () => {
  it("passes untrusted input over stdin, uses ChatGPT/Sol medium, validates final output, and cleans up", async () => {
    const { provider, directory } = await fakeCodex(`
      const fs = require('node:fs');
      let input = '';
      process.stdin.on('data', chunk => input += chunk);
      process.stdin.on('end', () => {
        const args = process.argv.slice(2);
        const output = args[args.indexOf('--output-last-message') + 1];
        fs.writeFileSync(output, JSON.stringify(${JSON.stringify(evaluation)}));
        fs.writeFileSync(process.argv[1] + '.capture', JSON.stringify({ args, input, cwd: process.cwd(), schema: JSON.parse(fs.readFileSync(args[args.indexOf('--output-schema') + 1], 'utf8')), hasKey: Boolean(process.env.OPENAI_API_KEY || process.env.CODEX_API_KEY) }));
        console.log('progress logs are not JSON');
      });
    `);
    expect(await provider.evaluateResponse(input)).toEqual(evaluation);
    const capture = JSON.parse(await readFile(join(directory, "fake codex.capture"), "utf8"));
    expect(capture.args).toContain('model_reasoning_effort="medium"');
    expect(capture.args).toContain('forced_login_method="chatgpt"');
    expect(capture.args).toContain("gpt-5.6-sol");
    expect(capture.args).toContain("--ignore-user-config");
    expect(capture.args).toContain("--ephemeral");
    expect(capture.args).toContain("read-only");
    expect(capture.args).toContain("shell_tool");
    expect(capture.hasKey).toBe(false);
    expect(capture.schema.properties.correctness.maximum).toBe(100);
    expect(capture.schema.properties.explanation.maxLength).toBe(2000);
    expect(capture.input).toContain(JSON.stringify(input));
    expect(capture.args.join(" ")).not.toContain(input.answer);
    await expect(readFile(join(capture.cwd, "result.json"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects schema-invalid responses", async () => {
    const { provider } = await fakeCodex(`require('node:fs').writeFileSync(process.argv[process.argv.indexOf('--output-last-message') + 1], JSON.stringify(${JSON.stringify({ ...evaluation, correctness: 101 })}));`);
    await expect(provider.evaluateResponse(input)).rejects.toThrow("Codex response failed validation: correctness");
  });

  it("rejects invalid JSON without returning process logs", async () => {
    const { provider } = await fakeCodex(`require('node:fs').writeFileSync(process.argv[process.argv.indexOf('--output-last-message') + 1], 'bad JSON');`);
    await expect(provider.evaluateResponse(input)).rejects.toThrow("invalid JSON");
  });

  it("reports missing CLI and expired login safely", async () => {
    await expect(new CodexProvider("gpt-5.6-sol", "/nonexistent/mnemosyne-codex").evaluateResponse(input)).rejects.toThrow("Codex CLI was not found");
    const { provider } = await fakeCodex("console.error('401 authentication failure: sensitive details'); process.exit(1);");
    await expect(provider.evaluateResponse(input)).rejects.toThrow("Sign in to Codex with your ChatGPT account");
  });

  it("terminates timed-out requests", async () => {
    const { provider } = await fakeCodex("setInterval(() => {}, 1000);", 100);
    await expect(provider.evaluateResponse(input)).rejects.toThrow(CodexProviderError);
    await expect(provider.evaluateResponse(input)).rejects.toThrow("too long");
  });

  it("supports extraction through the same structured-output boundary", async () => {
    const result = { concepts: [{ name: "Log", definition: "Records writes.", kind: "concept", sectionOrder: 0, confidence: 95 }], relationships: [], exercises: [] };
    const { provider } = await fakeCodex(`require('node:fs').writeFileSync(process.argv[process.argv.indexOf('--output-last-message') + 1], JSON.stringify(${JSON.stringify(result)}));`);
    expect(await provider.extractKnowledge({ title: "Storage", sections: input.sourceSections, diagrams: [] })).toEqual(result);
  });
});
