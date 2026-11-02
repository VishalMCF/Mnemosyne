import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { asc, eq, sql } from "drizzle-orm";
import { parseMarkdown, type ParsedDocument } from "@mnemosyne/ingestion";
import { db } from "@/lib/db/client";
import { chunks, diagrams, documents, sections, sources } from "@/lib/db/schema";
import { repositoryRoot } from "@/lib/db/config";
import { errorMessage, isSameOriginRequest, jsonError } from "@/lib/http";

export const runtime = "nodejs";
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_FILES_PER_IMPORT = 20;
const acceptedMimeTypes = new Set(["", "text/markdown", "text/plain", "application/octet-stream"]);

export async function GET() {
  const rows = await db.select({
    id: sources.id,
    name: sources.name,
    createdAt: sources.createdAt,
    documentId: documents.id,
    title: documents.title,
    originalFilename: documents.originalFilename,
    status: documents.status,
    extractionVersion: documents.extractionVersion,
    lastError: documents.lastError,
    sectionCount: sql<number>`(select count(*) from sections where sections.document_id = ${documents.id})`,
    conceptCount: sql<number>`(select count(*) from concepts where concepts.document_id = ${documents.id} and concepts.is_current = 1)`,
  }).from(sources).innerJoin(documents, eq(documents.sourceId, sources.id)).orderBy(asc(sources.createdAt));
  return Response.json({ sources: rows });
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return jsonError("Cross-origin requests are not allowed.", 403);
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_FILES_PER_IMPORT * MAX_FILE_BYTES + 1024 * 1024) return jsonError("Import payload is too large.", 413);
  let form: FormData;
  try { form = await request.formData(); } catch { return jsonError("Expected a multipart form upload."); }
  const files = form.getAll("files").filter((value): value is File => value instanceof File);
  if (!files.length) return jsonError("Choose at least one Markdown file.");
  if (files.length > MAX_FILES_PER_IMPORT) return jsonError(`Import at most ${MAX_FILES_PER_IMPORT} files at a time.`);

  const imported: Array<Record<string, unknown>> = [];
  const errors: Array<{ filename: string; error: string }> = [];
  for (const file of files) {
    try { imported.push(await importMarkdown(file)); }
    catch (error) { errors.push({ filename: path.basename(file.name || "unknown.md"), error: errorMessage(error) }); }
  }
  return Response.json({ imported, errors }, { status: imported.length ? 201 : 422 });
}

async function importMarkdown(file: File) {
  const name = path.basename(file.name).trim();
  if (!name || name.includes("\0") || !/\.(md|markdown)$/i.test(name)) throw new Error("Only .md and .markdown files are supported.");
  if (!acceptedMimeTypes.has(file.type.toLowerCase())) throw new Error("The uploaded file must be plain Markdown text.");
  if (file.size <= 0 || file.size > MAX_FILE_BYTES) throw new Error("File must be between 1 byte and 5 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  let markdown: string;
  try { markdown = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { throw new Error("File is not valid UTF-8 text."); }
  if (markdown.includes("\0")) throw new Error("Binary content is not allowed in Markdown files.");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const [duplicate] = await db.select({ id: documents.id, title: documents.title }).from(documents).where(eq(documents.sha256, sha256)).limit(1);
  if (duplicate) return { documentId: duplicate.id, title: duplicate.title, duplicate: true };

  const sourceId = randomUUID();
  const documentId = randomUUID();
  const safeName = name.replace(/[^\p{L}\p{N} .()_-]/gu, "_").slice(0, 180) || "document.md";
  const storedPath = path.posix.join("data", "uploads", sourceId, `${documentId}.md`);
  const absolutePath = path.resolve(repositoryRoot, storedPath);
  const uploadRoot = path.resolve(repositoryRoot, "data/uploads") + path.sep;
  if (!absolutePath.startsWith(uploadRoot)) throw new Error("Invalid storage path.");
  await fs.mkdir(path.dirname(absolutePath), { recursive: true, mode: 0o700 });
  await fs.writeFile(absolutePath, bytes, { flag: "wx", mode: 0o600 });

  try {
    let parsed: ParsedDocument | undefined;
    let parseError: string | null = null;
    try { parsed = parseMarkdown(documentId, markdown); }
    catch (error) { parseError = errorMessage(error).slice(0, 500); }
    const title = parsed?.title ?? safeName.replace(/\.(md|markdown)$/i, "");
    db.transaction((tx) => {
      tx.insert(sources).values({ id: sourceId, name: safeName }).run();
      tx.insert(documents).values({
        id: documentId,
        sourceId,
        originalFilename: safeName,
        storedPath,
        sha256,
        title,
        status: parseError ? "imported" : "parsed",
        lastError: parseError,
      }).run();
      if (parsed) {
        if (parsed.sections.length) tx.insert(sections).values(parsed.sections.map((section) => ({ ...section, documentId })).map((section) => ({
          id: section.id, documentId, parentId: section.parentId, heading: section.heading, headingLevel: section.headingLevel,
          order: section.order, startLine: section.startLine, endLine: section.endLine, content: section.content,
        }))).run();
        if (parsed.chunks.length) tx.insert(chunks).values(parsed.chunks.map((chunk) => ({ ...chunk, documentId })).map((chunk) => ({
          id: chunk.id, documentId, sectionId: chunk.sectionId, order: chunk.order, content: chunk.content, tokenEstimate: chunk.tokenEstimate,
        }))).run();
        if (parsed.diagrams.length) tx.insert(diagrams).values(parsed.diagrams.map((diagram) => ({
          id: diagram.id, documentId, sectionId: diagram.sectionId, type: diagram.type, source: diagram.source,
          graphJson: JSON.stringify(diagram.graph), extractionConfidence: diagram.extractionConfidence,
          startLine: diagram.startLine, endLine: diagram.endLine,
        }))).run();
      }
    });
    return { documentId, sourceId, title, status: parseError ? "imported" : "parsed", duplicate: false };
  } catch (error) {
    await fs.rm(absolutePath, { force: true });
    throw error;
  }
}
