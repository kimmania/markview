import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import mermaid from 'mermaid';
import { convertFileSrc } from '@tauri-apps/api/core';

// Initialize Mermaid globally once
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'strict',
});

// Lazy-loaded wiki-link plugin (UMD, avoid SSR issues)
let wikiLinkPlugin: any = null;
async function getWikiLinkPlugin() {
  if (!wikiLinkPlugin) {
    const mod = await import('remark-wiki-link');
    wikiLinkPlugin = mod.default || mod.wikiLinkPlugin;
  }
  return wikiLinkPlugin;
}

interface MarkdownPreviewProps {
  content: string;
  darkMode: boolean;
  currentFile: string | null;
}

function MermaidBlock({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');

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
      <div className="rounded-md overflow-auto my-3 p-3 text-sm bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
        <p className="font-semibold">Mermaid Error</p>
        <pre className="mt-1 whitespace-pre-wrap">{error}</pre>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="rounded-md overflow-auto my-3 p-3 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function resolveImageSrc(src: string, currentFile: string | null): string {
  if (!src) return '';
  // Web URLs pass through
  if (/^https?:\/\//.test(src)) return src;
  // Absolute paths → convertFileSrc
  if (src.startsWith('/')) {
    return convertFileSrc(src);
  }
  // Relative paths → resolve against current file's directory
  if (currentFile) {
    const dir = currentFile.substring(0, currentFile.lastIndexOf('/'));
    const resolved = `${dir}/${src}`;
    return convertFileSrc(resolved);
  }
  return src;
}

export default function MarkdownPreview({ content, darkMode, currentFile }: MarkdownPreviewProps) {
  const [wikiPlugin, setWikiPlugin] = useState<any>(null);

  useEffect(() => {
    getWikiLinkPlugin().then(setWikiPlugin);
  }, []);

  const remarkPlugins = [remarkGfm, remarkMath];
  if (wikiPlugin) {
    remarkPlugins.push(wikiPlugin);
  }

  return (
    <div
      className={`h-full overflow-auto px-6 py-4 prose max-w-none ${
        darkMode ? 'prose-invert' : ''
      }`}
    >
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={[rehypeRaw, rehypeKatex, rehypeHighlight]}
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
          pre: ({ children }) => {
            // Intercept mermaid code blocks
            const codeEl = children as any;
            if (codeEl?.props?.className?.includes('language-mermaid')) {
              const chart = String(codeEl.props.children || '').trim();
              return <MermaidBlock chart={chart} />;
            }
            // Default pre rendering (handled by code component above)
            return <pre>{children}</pre>;
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
          a: ({ children, href, className }) => {
            // Wiki-links get special styling
            const isWiki = className?.includes('internal');
            return (
              <a
                href={href}
                target={isWiki ? undefined : '_blank'}
                rel={isWiki ? undefined : 'noopener noreferrer'}
                className={`${
                  isWiki
                    ? 'text-amber-600 dark:text-amber-400 hover:underline'
                    : 'text-blue-600 dark:text-blue-400 hover:underline'
                }`}
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
                className="max-w-full rounded-md my-3 border border-slate-200 dark:border-slate-700"
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
