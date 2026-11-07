export type PythonToken = {
  kind:
    | "keyword"
    | "builtin"
    | "string"
    | "comment"
    | "number"
    | "function"
    | "decorator"
    | "operator"
    | "plain";
  text: string;
};
const keywords = new Set(
  "False None True and as assert async await break case class continue def del elif else except finally for from global if import in is lambda match nonlocal not or pass raise return try type while with yield".split(
    " ",
  ),
);
const builtins = new Set(
  "abs all any ascii bin bool breakpoint bytearray bytes callable chr classmethod compile complex delattr dict dir divmod enumerate eval exec filter float format frozenset getattr globals hasattr hash help hex id input int isinstance issubclass iter len list locals map max memoryview min next object oct open ord pow print property range repr reversed round set setattr slice sorted staticmethod str sum super tuple type vars zip __import__ self cls Exception ValueError TypeError RuntimeError KeyError IndexError StopIteration".split(
    " ",
  ),
);
// Strings and comments come first so their contents cannot become keywords.
// This is lexical highlighting; it does not execute or analyze Python code.
const pattern =
  /(?:[rRuUbBfF]{1,2})?(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\[^\r\n]|[^"\\\r\n])*(?:"|(?=\r?\n|$))|'(?:\\[^\r\n]|[^'\\\r\n])*(?:'|(?=\r?\n|$)))|#[^\r\n]*|@[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*|\b(?:0[xX][\da-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|\d[\d_]*(?:\.[\d_]*)?(?:[eE][+-]?[\d_]+)?[jJ]?|\.[\d_]+(?:[eE][+-]?[\d_]+)?[jJ]?)\b|[A-Za-z_]\w*|(?:\*\*|\/\/|:=|==|!=|<=|>=|->|[+\-*/%=<>!&|^~])+|\s+|./g;
export function tokenizePython(source: string): PythonToken[] {
  const tokens: PythonToken[] = [];
  let definition = false;
  for (const match of source.matchAll(pattern)) {
    const text = match[0];
    let kind: PythonToken["kind"] = "plain";
    if (/^(?:[rRuUbBfF]{1,2})?["']/.test(text)) kind = "string";
    else if (text.startsWith("#")) kind = "comment";
    else if (text.startsWith("@")) kind = "decorator";
    else if (/^(?:\d|\.\d)/.test(text)) kind = "number";
    else if (keywords.has(text)) kind = "keyword";
    else if (/^[A-Za-z_]\w*$/.test(text))
      kind = definition ? "function" : builtins.has(text) ? "builtin" : "plain";
    else if (/^[+\-*/%=<>!&|^~:]+/.test(text)) kind = "operator";
    tokens.push({ kind, text });
    if (/\r|\n/.test(text)) definition = false;
    if (/\S/.test(text)) definition = text === "def" || text === "class";
  }
  return tokens;
}
