import { CodexProviderError } from "@mnemosyne/ai";
import { eq } from "drizzle-orm";
import { extractDocument } from "@/lib/knowledge/extract";
import { db } from "@/lib/db/client";
import { documents } from "@/lib/db/schema";
import { errorMessage, isSameOriginRequest, jsonError } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";

export async function POST(_request: Request, context: Context) {
  if (!isSameOriginRequest(_request)) return jsonError("Cross-origin requests are not allowed.", 403);
  const { id } = await context.params;
  try {
    return Response.json(await extractDocument(id));
  } catch (error) {
    const message = errorMessage(error);
    if (message === "Document not found") return jsonError(message, 404);
    const sanitized = error instanceof CodexProviderError
      ? message
      : "Knowledge extraction failed. Your imported Markdown remains available; check Codex and retry.";
    await db.update(documents).set({ status: "extraction_failed", lastError: sanitized, updatedAt: new Date() }).where(eq(documents.id, id));
    return jsonError(sanitized, 502);
  }
}
