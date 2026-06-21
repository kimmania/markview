import { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Search, FileText, X } from 'lucide-react';
import type { SearchMatch } from '../types';

interface VaultSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultPath: string | null;
  onFileOpen: (path: string) => void;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightMatch(snippet: string, query: string): React.ReactNode {
  if (!query.trim()) return snippet;
  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
  const parts = snippet.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark
        key={i}
        className="bg-yellow-300 dark:bg-yellow-600 text-slate-900 dark:text-slate-100 rounded-sm px-0.5"
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function VaultSearchModal({
  isOpen,
  onClose,
  vaultPath,
  onFileOpen,
}: VaultSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const performSearch = useCallback(
    async (q: string) => {
      if (!vaultPath || !q.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const matches = await invoke<SearchMatch[]>('search_vault', {
          path: vaultPath,
          query: q.trim(),
        });
        setResults(matches);
        setSelectedIndex(0);
      } catch (e) {
        console.warn('Vault search failed:', e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [vaultPath]
  );

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, performSearch]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setLoading(false);
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

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
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault();
      handleSelect(results[selectedIndex].path);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-[700px] max-w-[92vw] bg-white dark:bg-slate-800 rounded-lg shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              vaultPath
                ? 'Search vault contents...'
                : 'Open a vault to search'
            }
            disabled={!vaultPath}
            className="flex-1 bg-transparent outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 disabled:opacity-50"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                inputRef.current?.focus();
              }}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="px-1.5 py-0.5 text-xs rounded bg-slate-100 dark:bg-slate-700 text-slate-500 shrink-0">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[55vh] overflow-y-auto">
          {!vaultPath ? (
            <div className="px-4 py-8 text-center text-slate-400 text-sm">
              Open a vault folder to enable search
            </div>
          ) : loading && query.trim() ? (
            <div className="px-4 py-6 text-center text-slate-400 text-sm">
              Searching…
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-center text-slate-400 text-sm">
              {query.trim() ? 'No matches found' : 'Type to search vault contents'}
            </div>
          ) : (
            results.map((match, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={`${match.path}:${match.line}:${index}`}
                  className={`w-full text-left px-4 py-3 transition-colors border-b border-slate-100 dark:border-slate-700/50 last:border-0 ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                  onClick={() => handleSelect(match.path)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                      {match.name}
                    </span>
                    <span className="text-xs text-slate-400 ml-auto shrink-0">
                      Line {match.line}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 pl-[22px] truncate">
                    {highlightMatch(match.snippet, query)}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-400 flex items-center gap-3">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          {results.length > 0 && (
            <span className="ml-auto">{results.length} match{results.length !== 1 ? 'es' : ''}</span>
          )}
        </div>
      </div>
    </div>
  );
}
