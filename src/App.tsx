import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Group,
  Panel,
  Separator,
} from 'react-resizable-panels';
import { Folder, FileText, FolderOpen, Settings } from 'lucide-react';
import Editor from './components/Editor';
import MarkdownPreview from './components/MarkdownPreview';
import './index.css';

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

function App() {
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [unsaved, setUnsaved] = useState(false);

  const openVault = async () => {
    const path = await invoke<string | null>('pick_folder');
    if (path) {
      setVaultPath(path);
      await refreshFiles(path);
    }
  };

  const refreshFiles = async (path: string) => {
    const entries = await invoke<string[]>('read_dir', { path });
    const parsed = entries.map((p) => ({
      name: p.split('/').pop() || p,
      path: p,
      isDirectory: !p.endsWith('.md'),
    }));
    setFiles(parsed);
  };

  const openFile = async (path: string) => {
    if (!path.endsWith('.md')) return;
    // Ask before switching if unsaved
    if (unsaved && currentFile) {
      const ok = confirm('You have unsaved changes. Discard them?');
      if (!ok) return;
    }
    const text = await invoke<string>('read_file', { path });
    setCurrentFile(path);
    setContent(text);
    setUnsaved(false);
  };

  const saveFile = async () => {
    if (currentFile) {
      await invoke('write_file', { path: currentFile, content });
      setUnsaved(false);
    }
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    setUnsaved(true);
  };

  const createFile = async () => {
    const name = prompt('New file name:', 'untitled.md');
    if (name && vaultPath) {
      const path = `${vaultPath}/${name}`;
      await invoke('write_file', { path, content: '' });
      setCurrentFile(path);
      setContent('');
      setUnsaved(false);
      await refreshFiles(vaultPath);
    }
  };

  const markdownFiles = files.filter((f) => f.path.endsWith('.md'));

  return (
    <div
      className={`flex h-screen w-screen overflow-hidden ${darkMode ? 'dark' : ''}`}
    >
      {/* Sidebar */}
      {sidebarVisible && (
        <div className="w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Markview
            </h1>
          </div>

          <div className="p-2 space-y-1">
            {!vaultPath ? (
              <button
                onClick={openVault}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <FolderOpen className="w-4 h-4" />
                Open Vault
              </button>
            ) : (
              <>
                <button
                  onClick={createFile}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  New Note
                </button>
                <div className="mt-4">
                  <div className="px-3 py-1 text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Files
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {markdownFiles.map((file) => (
                      <button
                        key={file.path}
                        onClick={() => openFile(file.path)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                          currentFile === file.path
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{file.name}</span>
                        {currentFile === file.path && unsaved && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="mt-auto p-2 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Settings className="w-4 h-4" />
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-950 min-w-0">
        {/* Toolbar */}
        <div className="h-11 border-b border-slate-200 dark:border-slate-700 flex items-center px-4 gap-3 bg-slate-50 dark:bg-slate-900 shrink-0">
          <button
            onClick={() => setSidebarVisible(!sidebarVisible)}
            className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
          >
            <Folder className="w-4 h-4" />
          </button>
          <div className="flex-1 text-sm text-slate-500 dark:text-slate-400 truncate">
            {currentFile ? (
              <span className="flex items-center gap-2">
                {currentFile}
                {unsaved && <span className="text-amber-500 text-xs">(unsaved)</span>}
              </span>
            ) : (
              'No file open'
            )}
          </div>
          {currentFile && (
            <button
              onClick={saveFile}
              disabled={!unsaved}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                unsaved
                  ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
              }`}
            >
              Save
            </button>
          )}
        </div>

        {/* Split Pane Editor */}
        {currentFile ? (
          <Group
            orientation="horizontal"
            className="flex-1 min-h-0"
          >
            <Panel defaultSize={50} minSize={20}>
              <div className="h-full border-r border-slate-200 dark:border-slate-700">
                <Editor
                  content={content}
                  onChange={handleContentChange}
                  darkMode={darkMode}
                />
              </div>
            </Panel>
            <Separator className="w-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-blue-400 dark:hover:bg-blue-500 transition-colors cursor-col-resize" />
            <Panel defaultSize={50} minSize={20}>
              <MarkdownPreview
                content={content}
                darkMode={darkMode}
              />
            </Panel>
          </Group>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Welcome to Markview</p>
              <p className="text-sm mt-2">
                {vaultPath
                  ? 'Select a file from the sidebar or create a new note'
                  : 'Open a vault folder to get started'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
