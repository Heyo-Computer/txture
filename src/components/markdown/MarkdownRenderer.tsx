import { useMemo } from "preact/hooks";
import { marked } from "marked";
import DOMPurify from "dompurify";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const html = useMemo(() => {
    const raw = marked.parse(content, { async: false }) as string;
    return DOMPurify.sanitize(raw);
  }, [content]);

  return (
    <div
      class="markdown-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
