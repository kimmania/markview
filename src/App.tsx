import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Folder, FileText, FolderOpen, Settings } from 'lucide-react';
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

  const openVault = async () => {
    const path = await invoke<string | null>('pick_folder');
    if (path) {
      setVaultPath(path);
      const entries = await invoke<string[]>('read_dir', { path });
      const parsed = entries.map(p => ({
        name: p.split('/').pop() || p,
        path: p,
        isDirectory: !p.endsWith('.md'),
      }));
      setFiles(parsed);
    }
  };

  const openFile = async (path: string) => {
    if (!path.endsWith('.md')) return;
    const text = await invoke<string>('read_file', { path });
    setCurrentFile(path);
    setContent(text);
  };

  const saveFile = async () => {
    if (currentFile) {
      await invoke('write_file', { path: currentFile, content });
    }
  };

  const createFile = async () => {
    const name = prompt('New file name:', 'untitled.md');
    if (name && vaultPath) {
      const path = `${vaultPath}/${name}`;
      await invoke('write_file', { path, content: '' });
      setCurrentFile(path);
      setContent('');
      // Refresh file list
      const entries = await invoke<string[]>('read_dir', { path: vaultPath });
      const parsed = entries.map(p => ({
        name: p.split('/').pop() || p,
        path: p,
        isDirectory: !p.endsWith('.md'),
      }));
      setFiles(parsed);
    }
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${darkMode ? 'dark' : ''}`}>
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
                    {files.filter(f => f.path.endsWith('.md')).map(file => (
                      <button
                        key={file.path}
                        onClick={() => openFile(file.path)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                          currentFile === file.path
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span className="truncate">{file.name}</span>
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
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-950">
        {/* Toolbar */}
        <div className="h-12 border-b border-slate-200 dark:border-slate-700 flex items-center px-4 gap-2 bg-slate-50 dark:bg-slate-900">
          <button
            onClick={() => setSidebarVisible(!sidebarVisible)}
            className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
          >
            <Folder className="w-4 h-4" />
          </button>
          <div className="flex-1 text-sm text-slate-500 dark:text-slate-400 truncate">
            {currentFile || 'No file open'}
          </div>
          {currentFile && (
            <button
              onClick={saveFile}
              className="px-3 py-1.5 text-sm bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors"
            >
              Save
            </button>
          )}
        </div>

        {/* Editor */}
        <div className="flex-1 p-4 overflow-auto">
          {currentFile ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full resize-none outline-none bg-transparent text-slate-800 dark:text-slate-200 font-mono text-sm leading-relaxed"
              placeholder="Start writing..."
              spellCheck={false}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">
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
    </div>
  );
}

export default App;
