import { useState, useCallback, useMemo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import mermaid from 'mermaid';
import { Pencil } from 'lucide-react';

function MermaidBlock({ chart }: { chart: string }) {
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
      className="rounded-md overflow-auto my-4 p-3 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

interface InlinePreviewProps {
  content: string;
  onChange: (value: string) => void;
  darkMode: boolean;
  currentFile?: string | null;
}

function splitIntoBlocks(content: string): string[] {
  const lines = content.split('\n');
  const blocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      i++;
      continue;
    }

    // Fenced code block
    if (line.trim().startsWith('```')) {
      const fenceMatch = line.trim().match(/^( `{3,})/);
      const fence = fenceMatch ? fenceMatch[1] : '```';
      const block = [line];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence)) {
        block.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        block.push(lines[i]);
        i++;
      }
      blocks.push(block.join('\n'));
      continue;
    }

    // Heading
    if (/^#{1,6}\s/.test(line)) {
      blocks.push(line);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(---|\*\*\*|___)\s*$/.test(line)) {
      blocks.push(line);
      i++;
      continue;
    }

    // Collect until blank line, heading, code fence, or hr
    const block = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('```') &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !/^(---|\*\*\*|___)\s*$/.test(lines[i])
    ) {
      block.push(lines[i]);
      i++;
    }
    blocks.push(block.join('\n'));
  }

  return blocks;
}

function joinBlocks(blocks: string[]): string {
  return blocks.join('\n\n');
}

export default function InlinePreview({ content, onChange, darkMode }: InlinePreviewProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const blocks = useMemo(() => splitIntoBlocks(content), [content]);

  const startEdit = useCallback(
    (index: number) => {
      setEditingIndex(index);
      setEditValue(blocks[index]);
    },
    [blocks]
  );

  const saveEdit = useCallback(() => {
    if (editingIndex === null) return;
    const newBlocks = [...blocks];
    newBlocks[editingIndex] = editValue;
    onChange(joinBlocks(newBlocks));
    setEditingIndex(null);
  }, [editingIndex, editValue, blocks, onChange]);

  const cancelEdit = useCallback(() => {
    setEditingIndex(null);
  }, []);

  return (
    <div className={`h-full overflow-auto ${darkMode ? 'dark' : ''}`}>
      <div className="prose prose-slate dark:prose-invert max-w-none p-6">
        {blocks.map((block, i) => (
          <div key={i} className="group relative my-1">
            {editingIndex === i ? (
              <div className="my-2">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full p-3 rounded-md border border-blue-400 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                  rows={Math.max(3, editValue.split('\n').length)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      saveEdit();
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      cancelEdit();
                    }
                  }}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={saveEdit}
                    className="px-3 py-1 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Save (⌘Enter)
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-3 py-1 text-xs rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300"
                  >
                    Cancel (Esc)
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => startEdit(i)}
                className="relative cursor-text hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded px-2 -mx-2 py-1 transition-colors"
                title="Click to edit"
              >
                <span className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Pencil className="w-3 h-3 text-slate-400" />
                </span>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex, rehypeHighlight]}
                  components={{
                    code: ({ inline, className, children }: any) => {
                      const match = /language-(\w+)/.exec(className || '');
                      const lang = match ? match[1] : '';
                      if (!inline && lang === 'mermaid') {
                        return <MermaidBlock chart={String(children || '').trim()} />;
                      }
                      if (!inline) {
                        return (
                          <pre className="rounded-md overflow-auto my-4 p-4 text-sm bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                            <code className={className}>{children}</code>
                          </pre>
                        );
                      }
                      return (
                        <code className="px-1.5 py-0.5 rounded text-sm font-mono bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {block}
                </ReactMarkdown>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
