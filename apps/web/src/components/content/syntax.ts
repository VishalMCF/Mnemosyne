import { tokenizePython, type PythonToken } from "./python";
export type CodeLanguage =
  "python" | "typescript" | "javascript" | "json" | "text";
const aliases: Record<string, CodeLanguage> = {
  python: "python",
  python3: "python",
  py: "python",
  py3: "python",
  ts: "typescript",
  typescript: "typescript",
  tsx: "typescript",
  js: "javascript",
  javascript: "javascript",
  jsx: "javascript",
  json: "json",
  jsonc: "json",
  text: "text",
  plaintext: "text",
  txt: "text",
};
export function detectLanguage(code: string): CodeLanguage {
  // Only treat an entire unfenced value as code if its opening lines look like
  // code. A Python example later in a prose paragraph must not restyle all prose.
  const opening = code.replace(/^(?:\s*#[^\n]*(?:\n|$))+/, "").trimStart();
  if (
    /^(?:(?:async\s+)?def\s+\w+\([^\n]*\)[^\n]*:|class\s+\w+(?:\([^\n]*\))?\s*:|from\s+[\w.]+\s+import\s+\w|import\s+[\w.]+(?:\s+as\s+\w+)?\s*(?:\n|$)|(?:print|range|len|enumerate)\s*\()/.test(
      opening,
    )
  )
    return "python";
  if (/^[\[{]/.test(opening)) {
    try {
      JSON.parse(opening);
      return "json";
    } catch {
      /* Not JSON. */
    }
  }
  if (/^(?:export\s+)?(?:interface\s+\w+|type\s+\w+\s*=)/.test(opening))
    return "typescript";
  if (
    /^(?:(?:export\s+)?(?:const|let|var|function)\s+\w+|import\s+.+\s+from\s+['"])/.test(
      opening,
    )
  )
    return "javascript";
  return "text";
}
export function codeLanguage(code: string, language?: string): CodeLanguage {
  const label = language
    ?.trim()
    .toLowerCase()
    .replace(/^language-/, "");
  if (label && aliases[label] && aliases[label] !== "text")
    return aliases[label];
  return !label || aliases[label] === "text" ? detectLanguage(code) : "text";
}
const keywords = new Set(
  "abstract as async await break case catch class const constructor continue debugger declare default delete do else enum export extends finally for from function get if implements import in infer instanceof interface keyof let namespace new of private protected public readonly return set static super switch this throw try type typeof var void while with yield satisfies".split(
    " ",
  ),
);
const builtins = new Set(
  "true false null undefined NaN Infinity boolean number string unknown never any object console JSON Promise Array Object Map Set Error Date Math Record Partial Required Pick Omit Readonly".split(
    " ",
  ),
);
const scriptPattern =
  /\/\/[^\r\n]*|\/\*[\s\S]*?(?:\*\/|$)|"(?:\\[\s\S]|[^"\\])*(?:"|$)|'(?:\\[\s\S]|[^'\\])*(?:'|$)|`(?:\\[\s\S]|[^`\\])*(?:`|$)|\b(?:0[xX][\da-fA-F_]+|\d[\d_]*(?:\.[\d_]*)?(?:[eE][+-]?[\d_]+)?n?)\b|[A-Za-z_$][\w$]*|(?:=>|===|!==|==|!=|<=|>=|\?\?|\?\.|&&|\|\||[+\-*/%=<>!&|^~?:])+|\s+|./g;
export function tokenizeCode(
  code: string,
  language: CodeLanguage,
): PythonToken[] | null {
  if (code.length > 200_000 || language === "text") return null;
  if (language === "python") return tokenizePython(code);
  return Array.from(code.matchAll(scriptPattern), (match) => {
    const text = match[0];
    let kind: PythonToken["kind"] = "plain";
    if (/^\//.test(text) && /^\/[*\/]/.test(text)) kind = "comment";
    else if (/^["'`]/.test(text))
      kind =
        language === "json" &&
        /^\s*:/.test(code.slice(match.index! + text.length))
          ? "function"
          : "string";
    else if (/^\d/.test(text)) kind = "number";
    else if (keywords.has(text) && language !== "json") kind = "keyword";
    else if (builtins.has(text)) kind = "builtin";
    else if (
      /^[A-Za-z_$]/.test(text) &&
      /^\s*\(/.test(code.slice(match.index! + text.length))
    )
      kind = "function";
    else if (/^[+\-*/%=<>!&|^~?:]/.test(text)) kind = "operator";
    return { kind, text };
  });
}
