import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen } from 'lucide-react';
import type { FileEntry } from '../types';

interface FolderTreeProps {
  vaultPath: string | null;
  currentFile: string | null;
  onFileOpen: (path: string) => void;
  onVaultScanned?: (entries: FileEntry[]) => void;
}

function TreeNode({
  entry,
  depth,
  currentFile,
  onFileOpen,
  expandedDirs,
  toggleDir,
}: {
  entry: FileEntry;
  depth: number;
  currentFile: string | null;
  onFileOpen: (path: string) => void;
  expandedDirs: Set<string>;
  toggleDir: (path: string) => void;
}) {
  const isExpanded = expandedDirs.has(entry.path);
  const isCurrent = currentFile === entry.path;

  if (entry.is_dir) {
    return (
      <div>
        <button
          onClick={() => toggleDir(entry.path)}
          className="w-full flex items-center gap-1 px-2 py-1 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          )}
          {isExpanded ? (
            <FolderOpen className="w-4 h-4 shrink-0 text-amber-500" />
          ) : (
            <Folder className="w-4 h-4 shrink-0 text-amber-500" />
          )}
          <span className="truncate">{entry.name}</span>
        </button>
        {isExpanded && (
          <div>
            {entry.children.map((child) => (
              <TreeNode
                key={child.path}
                entry={child}
                depth={depth + 1}
                currentFile={currentFile}
                onFileOpen={onFileOpen}
                expandedDirs={expandedDirs}
                toggleDir={toggleDir}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onFileOpen(entry.path)}
      className={`w-full flex items-center gap-2 px-2 py-1 text-sm rounded-md transition-colors ${
        isCurrent
          ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
      style={{ paddingLeft: `${depth * 12 + 24}px` }}
    >
      <FileText className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">{entry.name}</span>
    </button>
  );
}

export default function FolderTree({
  vaultPath,
  currentFile,
  onFileOpen,
  onVaultScanned,
}: FolderTreeProps) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (vaultPath) {
      scanVault();
    }
  }, [vaultPath]);

  const scanVault = async () => {
    if (!vaultPath) return;
    try {
      const scanned = await invoke<FileEntry[]>('scan_vault', { path: vaultPath });
      setEntries(scanned);
      if (onVaultScanned) {
        onVaultScanned(scanned);
      }
      // Auto-expand vault root
      setExpandedDirs(new Set([vaultPath]));
    } catch (e) {
      console.error('Failed to scan vault:', e);
    }
  };

  const toggleDir = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  if (!vaultPath) return null;

  return (
    <div className="overflow-y-auto flex-1 min-h-0">
      <div className="px-3 py-1 text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
        <span>Files</span>
        <button
          onClick={scanVault}
          className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400"
          title="Refresh"
        >
          Refresh
        </button>
      </div>
      <div className="px-1 space-y-0.5">
        {entries.map((entry) => (
          <TreeNode
            key={entry.path}
            entry={entry}
            depth={0}
            currentFile={currentFile}
            onFileOpen={onFileOpen}
            expandedDirs={expandedDirs}
            toggleDir={toggleDir}
          />
        ))}
        {entries.length === 0 && (
          <p className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500">
            No markdown files found
          </p>
        )}
      </div>
    </div>
  );
}
