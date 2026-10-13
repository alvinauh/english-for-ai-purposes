import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ source }: { source: string }) {
  return (
    <div className="prose-course">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href = "", children }) =>
            href.startsWith("/") ? <Link href={href}>{children}</Link> : <a href={href} target="_blank" rel="noreferrer">{children}</a>,
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
