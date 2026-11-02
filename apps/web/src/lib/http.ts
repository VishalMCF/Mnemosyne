export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

export function isSameOriginRequest(request: Request): boolean {
  const requestUrl = new URL(request.url);
  if (!new Set(["127.0.0.1", "localhost"]).has(requestUrl.hostname)) return false;
  const expected = requestUrl.origin;
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  try {
    if (origin) return new URL(origin).origin === expected;
    if (referer) return new URL(referer).origin === expected;
    return true;
  } catch {
    return false;
  }
}
