import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SourceContent } from "../components/content/SourceContent";
import { codeLanguage, tokenizeCode } from "../components/content/syntax";
const render = (source: string) =>
  renderToStaticMarkup(createElement(SourceContent, { source }));

describe("highlighting in source and training content", () => {
  it("highlights Python with aliases, missing labels, and plain-code input", () => {
    for (const label of ["python", "py", "python3", "PYTHON", "text", ""]) {
      const html = render(
        `Question\n\n\`\`\`${label}\ndef greet(name):\n    return "hello"\n\`\`\``,
      );
      expect(html).toContain("language-python");
      expect(html).toContain("mn-token-keyword");
      expect(html).toContain("mn-token-string");
    }
    expect(render("def greet():\n    return 1")).toContain("language-python");
    expect(render("import os\nprint(os.getcwd())")).toContain(
      "language-python",
    );
  });

  it("highlights TypeScript and JSON, which are present in imported documents", () => {
    expect(
      render("```typescript\ninterface Item { id: number; }\n```"),
    ).toContain("mn-token-keyword");
    const json = render(
      '```json\n{"name": "item", "enabled": true, "count": 42}\n```',
    );
    expect(json).toContain("language-json");
    expect(json).toContain("mn-token-number");
    expect(json).toContain("mn-token-builtin");
  });

  it("keeps explanations as prose while rendering embedded code safely", () => {
    const html = render(
      'Explain this example:\n\n```python\nvalue = "<script>alert(1)</script>"\n```\n\nThen predict the outcome.',
    );
    expect(html).toContain("Explain this example:");
    expect(html).toContain("Then predict the outcome.");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(
      render("Explain Python:\ndef example():\n    return 1"),
    ).not.toContain("language-python");
  });

  it("preserves whitespace and source characters for all supported languages", () => {
    for (const [language, source] of [
      ["python", 'def greet():\n    # comment\n    return "hello"\n'],
      ["typescript", "const value: number = 42;\n// comment\n"],
      ["json", '{"value":42}\n'],
    ] as const) {
      expect(
        tokenizeCode(source, language)
          ?.map((token) => token.text)
          .join(""),
      ).toBe(source);
    }
    expect(codeLanguage('print("hello")', "bash")).toBe("text");
  });
});
