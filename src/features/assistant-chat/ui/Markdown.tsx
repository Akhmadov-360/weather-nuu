import ReactMarkdown from 'react-markdown';
import { completePartialMarkdown } from '../model/complete-partial';

/** Only web addresses become links: no javascript:, data:, mailto: or protocol-relative addresses. */
function safeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : '';
}

type MarkdownProps = {
  text: string;
  /** The answer is still arriving: close open markup so it does not flicker. */
  streaming?: boolean;
  className?: string;
};

/**
 * The model's answer as formatted text. Built on react-markdown, which renders React elements and never
 * raw HTML; `skipHtml` also drops any HTML the model writes. Links open in a new tab.
 */
export function Markdown({ text, streaming = false, className }: MarkdownProps): React.JSX.Element {
  return (
    <div className={className}>
      <ReactMarkdown
        skipHtml
        urlTransform={safeUrl}
        components={{
          a: ({ href, children }) =>
            href ? (
              <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                {children}
              </a>
            ) : (
              <span>{children}</span>
            ),
        }}
      >
        {streaming ? completePartialMarkdown(text) : text}
      </ReactMarkdown>
    </div>
  );
}
