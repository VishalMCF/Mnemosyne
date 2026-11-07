"use client";
import { useMemo, type ReactNode } from "react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import { codeLanguage, detectLanguage, tokenizeCode } from "./syntax";

export function CodeBlock({
  code,
  language,
}: {
  code: string;
  language?: string;
}) {
  const resolved = codeLanguage(code, language);
  const title =
    resolved === "text"
      ? language || "Code"
      : {
          python: "Python",
          typescript: "TypeScript",
          javascript: "JavaScript",
          json: "JSON",
        }[resolved];
  const tokens = useMemo(() => tokenizeCode(code, resolved), [code, resolved]);
  return (
    <figure className="mn-code">
      <figcaption>{title}</figcaption>
      <pre tabIndex={0} aria-label={`${title} code`}>
        <code className={`language-${resolved}`}>
          {tokens
            ? tokens.map((token, index) =>
                token.kind === "plain" ? (
                  token.text
                ) : (
                  <span className={`mn-token-${token.kind}`} key={index}>
                    {token.text}
                  </span>
                ),
              )
            : code}
        </code>
      </pre>
    </figure>
  );
}
type AstNode = {
  type: string;
  lang?: string | null;
  value?: string;
  position?: { start: { offset?: number }; end: { offset?: number } };
  children?: AstNode[];
};
export function SourceContent({
  source,
  renderText,
}: {
  source: string;
  renderText?: (text: string) => ReactNode;
}) {
  const blocks = useMemo(() => {
    const root = unified().use(remarkParse).parse(source) as AstNode;
    const code: AstNode[] = [];
    function visit(node: AstNode) {
      if (node.type === "code") code.push(node);
      else node.children?.forEach(visit);
    }
    visit(root);
    return code;
  }, [source]);
  if (!blocks.length && detectLanguage(source) !== "text")
    return (
      <div className="mn-source-content">
        <CodeBlock code={source} />
      </div>
    );
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const [index, block] of blocks.entries()) {
    const start = block.position?.start.offset;
    const end = block.position?.end.offset;
    if (start === undefined || end === undefined) continue;
    if (start > cursor) {
      const text = source.slice(cursor, start);
      parts.push(
        <div className="mn-source-text" key={`text-${index}`}>
          {renderText ? renderText(text) : text}
        </div>,
      );
    }
    parts.push(
      <CodeBlock
        key={`code-${index}`}
        code={block.value ?? ""}
        language={block.lang ?? "text"}
      />,
    );
    cursor = end;
  }
  if (cursor < source.length) {
    const text = source.slice(cursor);
    parts.push(
      <div className="mn-source-text" key="remaining">
        {renderText ? renderText(text) : text}
      </div>,
    );
  }
  return <div className="mn-source-content">{parts}</div>;
}
