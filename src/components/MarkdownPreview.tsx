import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import mermaid from 'mermaid';
import { convertFileSrc } from '@tauri-apps/api/core';

interface MarkdownPreviewProps {
  content: string;
  darkMode: boolean;
  currentFile: string | null;
}

function MermaidBlock({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const id = `mermaid-${Math.random().toString(36).slice(2)}`;
    mermaid
      .render(id, chart)
      .then(({ svg: svgStr }) => {
        if (!cancelled) setSvg(svgStr);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Mermaid render error');
      });
    return () => { cancelled = true; };
  }, [chart]);

  if (error) {
    return (
      <div className="rounded-md overflow-auto my-4 p-3 text-sm bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
        <p className="font-semibold">Mermaid Error</p>
        <pre className="mt-1 whitespace-pre-wrap">{error}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="rounded-md overflow-auto my-4 p-3 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function resolveImageSrc(src: string, currentFile: string | null): string {
  if (!src) return '';
  if (/^https?:\/\//.test(src)) return src;
  if (src.startsWith('/')) return convertFileSrc(src);
  if (currentFile) {
    const dir = currentFile.substring(0, currentFile.lastIndexOf('/'));
    return convertFileSrc(`${dir}/${src}`);
  }
  return src;
}

export default function MarkdownPreview({ content, darkMode, currentFile }: MarkdownPreviewProps) {
  const CodeComponent = ({ inline, className, children }: any) => {
    const match = /language-(\w+)/.exec(className || '');
    const lang = match ? match[1] : '';

    if (!inline && lang === 'mermaid') {
      return <MermaidBlock chart={String(children || '').trim()} />;
    }

    if (!inline) {
      return (
        <pre className={`rounded-md overflow-auto my-4 p-4 text-sm ${
          darkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-800'
        }`}>
          <code className={className}>{children}</code>
        </pre>
      );
    }

    return (
      <code className={`px-1.5 py-0.5 rounded text-sm font-mono ${
        darkMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-800'
      }`}>
        {children}
      </code>
    );
  };

  return (
    <div
      className={`h-full overflow-auto px-6 py-6 prose prose-slate max-w-none ${
        darkMode ? 'prose-invert dark:prose-invert' : ''
      }`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          code: CodeComponent,
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
            <th className="border border-slate-200 dark:border-slate-700 px-3 py-2 text-left font-semibold text-sm dark:text-slate-100">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm dark:text-slate-200">
              {children}
            </td>
          ),
          hr: () => <hr className="my-6 border-slate-200 dark:border-slate-700" />,
          a: ({ children, href, className }) => {
            const isWiki = className?.includes('internal');
            return (
              <a
                href={href}
                target={isWiki ? undefined : '_blank'}
                rel={isWiki ? undefined : 'noopener noreferrer'}
                className={isWiki
                  ? 'text-amber-600 dark:text-amber-400 hover:underline'
                  : 'text-blue-600 dark:text-blue-400 hover:underline'
                }
              >
                {children}
              </a>
            );
          },
          img: ({ src, alt }) => {
            const resolvedSrc = resolveImageSrc(src || '', currentFile);
            return (
              <img
                src={resolvedSrc}
                alt={alt || ''}
                className="max-w-full rounded-md my-4 border border-slate-200 dark:border-slate-700"
                loading="lazy"
              />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
