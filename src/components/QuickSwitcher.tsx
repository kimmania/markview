import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, FileText } from 'lucide-react';
import type { FileEntry } from '../types';

interface QuickSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  entries: FileEntry[];
  onFileOpen: (path: string) => void;
}

function flattenFiles(entries: FileEntry[]): FileEntry[] {
  const result: FileEntry[] = [];
  for (const entry of entries) {
    if (!entry.is_dir) {
      result.push(entry);
    }
    if (entry.children) {
      result.push(...flattenFiles(entry.children));
    }
  }
  return result;
}

export default function QuickSwitcher({
  isOpen,
  onClose,
  entries,
  onFileOpen,
}: QuickSwitcherProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const flatFiles = useMemo(() => flattenFiles(entries), [entries]);

  const filtered = useMemo(() => {
    if (!query.trim()) return flatFiles;
    const q = query.toLowerCase();
    return flatFiles.filter((f) => f.name.toLowerCase().includes(q));
  }, [query, flatFiles]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (path: string) => {
    onFileOpen(path);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered.length > 0) {
      e.preventDefault();
      handleSelect(filtered[selectedIndex].path);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/30"
      onClick={onClose}
    >
      <div
        className="w-[600px] max-w-[90vw] bg-white dark:bg-slate-800 rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to search files..."
            className="flex-1 bg-transparent outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400"
          />
          <kbd className="px-1.5 py-0.5 text-xs rounded bg-slate-100 dark:bg-slate-700 text-slate-500">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-slate-400 text-sm">
              No files found
            </div>
          ) : (
            filtered.map((file, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={file.path}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                  onClick={() => handleSelect(file.path)}
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span className="truncate">{file.name}</span>
                  <span className="ml-auto text-xs text-slate-400 truncate max-w-[200px]">
                    {file.path.substring(
                      file.path.lastIndexOf('/') > 0
                        ? file.path.lastIndexOf('/', file.path.lastIndexOf('/') - 1) + 1
                        : 0
                    )}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-400 flex items-center gap-3">
          <span>↑↓ to navigate</span>
          <span>↵ to open</span>
        </div>
      </div>
    </div>
  );
}
