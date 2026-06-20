import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Group,
  Panel,
  Separator,
} from 'react-resizable-panels';
import { Folder, FileText, FolderOpen, Settings, Search } from 'lucide-react';
import mermaid from 'mermaid';
import Editor from './components/Editor';
import MarkdownPreview from './components/MarkdownPreview';
import FolderTree from './components/FolderTree';
import TabBar from './components/TabBar';
import QuickSwitcher from './components/QuickSwitcher';
import type { FileEntry, Tab } from './types';
import SettingsModal, { loadSettings, type Settings as AppSettings } from './components/SettingsModal';
import { save } from '@tauri-apps/plugin-dialog';
import './index.css';

function App() {
  // ---- State ----
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [vaultEntries, setVaultEntries] = useState<FileEntry[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Sync Mermaid theme with dark mode
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: darkMode ? 'dark' : 'default',
      securityLevel: 'strict',
    });
  }, [darkMode]);
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false);

  // ---- Settings ----
  const [settings, setSettings] = useState<AppSettings>(loadSettings('{}'));
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    invoke<string>('get_settings').then((raw) => {
      const s = loadSettings(raw);
      setSettings(s);
      // Apply theme immediately
      if (s.theme === 'dark') setDarkMode(true);
      else if (s.theme === 'light') setDarkMode(false);
      else {
        // system
        setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
      }
    });
  }, []);

  useEffect(() => {
    // Listen for system theme changes when theme is "system"
    if (settings.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => setDarkMode(e.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, [settings.theme]);

  // ---- Derived ----
  const activeTab = useMemo(
    () => tabs.find((t) => t.path === activePath) || null,
    [tabs, activePath]
  );

  const content = activeTab?.content ?? '';

  // ---- Vault ----
  const openVault = async () => {
    const path = await invoke<string | null>('pick_folder');
    if (path) {
      setVaultPath(path);
      setTabs([]);
      setActivePath(null);
    }
  };

  // ---- Tabs ----
  const openFile = useCallback(
    async (path: string) => {
      if (!path.endsWith('.md')) return;

      // Switch to existing tab if open
      const existing = tabs.find((t) => t.path === path);
      if (existing) {
        setActivePath(path);
        return;
      }

      // Ask before switching if current tab unsaved
      const currentTab = tabs.find((t) => t.path === activePath);
      if (currentTab?.unsaved) {
        const ok = confirm('You have unsaved changes. Discard them?');
        if (!ok) return;
      }

      const text = await invoke<string>('read_file', { path });
      const name = path.split('/').pop() || path;
      const newTab = { path, name, content: text, unsaved: false };
      setTabs((prev) => [...prev, newTab]);
      setActivePath(path);
    },
    [tabs, activePath]
  );

  const switchTab = (path: string) => {
    setActivePath(path);
  };

  const closeTab = (path: string) => {
    const tab = tabs.find((t) => t.path === path);
    if (tab?.unsaved) {
      const ok = confirm(`Discard unsaved changes to "${tab.name}"?`);
      if (!ok) return;
    }

    setTabs((prev) => {
      const filtered = prev.filter((t) => t.path !== path);
      return filtered;
    });

    // If closing active tab, switch to nearest tab
    if (activePath === path) {
      const idx = tabs.findIndex((t) => t.path === path);
      const next = tabs[idx - 1] || tabs[idx + 1];
      setActivePath(next?.path ?? null);
    }
  };

  const handleContentChange = (value: string) => {
    if (!activePath) return;
    setTabs((prev) =>
      prev.map((t) =>
        t.path === activePath ? { ...t, content: value, unsaved: true } : t
      )
    );
  };

  const saveFile = async () => {
    if (!activeTab) return;
    await invoke('write_file', {
      path: activeTab.path,
      content: activeTab.content,
    });
    setTabs((prev) =>
      prev.map((t) => (t.path === activeTab.path ? { ...t, unsaved: false } : t))
    );
  };

  // ---- Auto-save ----
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  useEffect(() => {
    if (!settings.autoSave || !activeTab?.unsaved) return;
    const timer = setTimeout(() => {
      const tab = activeTabRef.current;
      if (!tab || !tab.unsaved) return;
      invoke('write_file', { path: tab.path, content: tab.content }).then(() => {
        setTabs((prev) => prev.map((t) => (t.path === tab.path ? { ...t, unsaved: false } : t)));
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [activeTab?.content, settings.autoSave]);

  const saveAsFile = async () => {
    if (!activeTab) return;
    const newPath = await save({
      defaultPath: activeTab.name,
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    });
    if (newPath) {
      await invoke('write_file', {
        path: newPath,
        content: activeTab.content,
      });
      // Update the active tab to point to the new file
      const newName = newPath.split('/').pop() || newPath;
      setTabs((prev) =>
        prev.map((t) =>
          t.path === activeTab.path
            ? { ...t, path: newPath, name: newName, unsaved: false }
            : t
        )
      );
      setActivePath(newPath);
      // Refresh vault tree if the new file lives in the current vault
      if (vaultPath && newPath.startsWith(vaultPath)) {
        const scanned = await invoke<FileEntry[]>('scan_vault', { path: vaultPath });
        setVaultEntries(scanned);
      }
    }
  };

  const createFile = async () => {
    const name = prompt('New file name:', 'untitled.md');
    if (name && vaultPath) {
      const path = `${vaultPath}/${name}`;
      await invoke('write_file', { path, content: '' });
      // Scan vault
      const scanned = await invoke<FileEntry[]>('scan_vault', { path: vaultPath });
      setVaultEntries(scanned);
      // Open in new tab
      openFile(path);
    }
  };

  const handleVaultScanned = (entries: FileEntry[]) => {
    setVaultEntries(entries);
  };

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd+P / Ctrl+P -> Quick Switcher
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        setQuickSwitcherOpen((open) => !open);
      }
      // Cmd+S / Ctrl+S -> Save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (e.shiftKey) {
          saveAsFile();
        } else {
          saveFile();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTab]);

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${darkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      {sidebarVisible && (
        <div className="w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex flex-col no-print">
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
                <button
                  onClick={() => setQuickSwitcherOpen(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Search className="w-4 h-4" />
                  Quick Switcher
                  <kbd className="ml-auto text-xs px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500">
                    ⌘P
                  </kbd>
                </button>
              </>
            )}
          </div>

          <FolderTree
            vaultPath={vaultPath}
            currentFile={activePath}
            onFileOpen={openFile}
            onVaultScanned={handleVaultScanned}
          />

          <div className="mt-auto p-2 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSave={(s) => {
          setSettings(s);
          invoke('set_settings', { settings_json: JSON.stringify(s) });
          // Apply theme
          if (s.theme === 'dark') setDarkMode(true);
          else if (s.theme === 'light') setDarkMode(false);
          else setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
        }}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-950 min-w-0">
        {/* Toolbar */}
        <div className="h-11 border-b border-slate-200 dark:border-slate-700 flex items-center px-4 gap-3 bg-slate-50 dark:bg-slate-900 shrink-0 no-print">
          <button
            onClick={() => setSidebarVisible(!sidebarVisible)}
            className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
          >
            <Folder className="w-4 h-4" />
          </button>
          <div className="flex-1 text-sm text-slate-500 dark:text-slate-400 truncate">
            {activeTab ? (
              <span className="flex items-center gap-2">
                {activeTab.path}
                {activeTab.unsaved && (
                  <span className="text-amber-500 text-xs">(unsaved)</span>
                )}
              </span>
            ) : (
              'No file open'
            )}
          </div>
          {activeTab && (
            <>
              <button
                onClick={saveFile}
                disabled={!activeTab.unsaved}
                type="button"
                className={`relative z-10 px-3 py-1 text-sm rounded-md transition-colors ${
                  activeTab.unsaved
                    ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                }`}
              >
                Save
              </button>
              <button
                onClick={saveAsFile}
                type="button"
                className="relative z-10 px-3 py-1 text-sm rounded-md transition-colors bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Save As
              </button>
              <button
                onClick={async () => { await invoke('print_window'); }}
                className="relative z-10 px-3 py-1 text-sm rounded-md transition-colors bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Export PDF
              </button>
            </>
          )}
        </div>

        {/* Tab Bar */}
        <TabBar
          tabs={tabs.map((t) => ({
            path: t.path,
            name: t.name,
            unsaved: t.unsaved,
          }))}
          activePath={activePath}
          onTabClick={switchTab}
          onTabClose={closeTab}
        />

        {/* Split Pane Editor */}
        {activeTab ? (
          <Group
            orientation="horizontal"
            className="flex-1 min-h-0"
          >
            <Panel defaultSize={50} minSize={20} className="no-print">
              <div className="h-full overflow-auto border-r border-slate-200 dark:border-slate-700">
                <Editor
                  content={content}
                  onChange={handleContentChange}
                  darkMode={darkMode}
                  fontSize={settings.editorFontSize}
                />
              </div>
            </Panel>
            <Separator className="w-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-blue-400 dark:hover:bg-blue-500 transition-colors cursor-col-resize no-print" />
            <Panel defaultSize={50} minSize={20}>
              <div className="h-full overflow-auto" id="printarea">
                <MarkdownPreview
                  content={content}
                  darkMode={darkMode}
                  currentFile={activePath}
                />
              </div>
            </Panel>
          </Group>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Welcome to Markview</p>
              <p className="text-sm mt-2">
                {vaultPath
                  ? 'Select a file from the sidebar or press ⌘P'
                  : 'Open a vault folder to get started'}
              </p>
              {vaultPath && (
                <p className="text-xs mt-3 text-slate-500">
                  Keyboard: ⌘S save · ⌘P quick open
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Switcher */}
      <QuickSwitcher
        isOpen={quickSwitcherOpen}
        onClose={() => setQuickSwitcherOpen(false)}
        entries={vaultEntries}
        onFileOpen={openFile}
      />
    </div>
  );
}

export default App;
