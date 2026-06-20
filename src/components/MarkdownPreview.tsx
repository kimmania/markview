import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface MarkdownPreviewProps {
  content: string;
  darkMode: boolean;
}

export default function MarkdownPreview({ content, darkMode }: MarkdownPreviewProps) {
  return (
    <div
      className={`h-full overflow-auto px-6 py-4 prose max-w-none ${
        darkMode ? 'prose-invert' : ''
      }`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h1: ({ children }) => <h1 className="text-2xl font-bold mt-6 mb-3">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-semibold mt-5 mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-medium mt-4 mb-2">{children}</h3>,
          p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-slate-300 dark:border-slate-600 pl-4 italic my-3 text-slate-600 dark:text-slate-400">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isBlock = className?.includes('hljs');
            if (isBlock) {
              return (
                <pre className={`rounded-md overflow-auto my-3 p-3 text-sm ${
                  darkMode
                    ? 'bg-slate-800 text-slate-200'
                    : 'bg-slate-100 text-slate-800'
                }`}>
                  <code className={className}>{children}</code>
                </pre>
              );
            }
            return (
              <code className={`px-1.5 py-0.5 rounded text-sm ${
                darkMode
                  ? 'bg-slate-700 text-slate-200'
                  : 'bg-slate-100 text-slate-800'
              }`}>
                {children}
              </code>
            );
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-slate-200 dark:border-slate-700">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-100 dark:bg-slate-800">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border border-slate-200 dark:border-slate-700 px-3 py-2 text-left font-semibold text-sm">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm">
              {children}
            </td>
          ),
          hr: () => <hr className="my-4 border-slate-200 dark:border-slate-700" />,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
