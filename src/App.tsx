import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  Group,
  Panel,
  Separator,
} from 'react-resizable-panels';
import { Folder, FileText, FolderOpen, Settings, Search, BookOpen } from 'lucide-react';
import mermaid from 'mermaid';
import Editor from './components/Editor';
import MarkdownPreview from './components/MarkdownPreview';
import InlinePreview from './components/InlinePreview';
import MarkdownToolbar from './components/MarkdownToolbar';
import FolderTree from './components/FolderTree';
import TabBar from './components/TabBar';
import QuickSwitcher from './components/QuickSwitcher';
import type { FileEntry, Tab } from './types';
import SettingsModal, { loadSettings, type Settings as AppSettings } from './components/SettingsModal';
import HelpModal from './components/HelpModal';
import { save } from '@tauri-apps/plugin-dialog';
import { openSearchPanel } from '@codemirror/search';
import { EditorView } from '@codemirror/view';
import './index.css';

function App() {
  // ---- State ----
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [vaultEntries, setVaultEntries] = useState<FileEntry[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [viewMode, setViewMode] = useState<'source' | 'split' | 'preview'>('split');

  const cycleViewMode = () => {
    setViewMode((m) => (m === 'source' ? 'split' : m === 'split' ? 'preview' : 'source'));
  };

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
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    invoke<string>('get_settings').then((raw) => {
      const s = loadSettings(raw);
      setSettings(s);
      // Apply theme immediately
      if (s.theme === 'dark') setDarkMode(true);
      else if (s.theme === 'light') setDarkMode(false);
      else {
        setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
      }
      // Restore last vault
      if (s.lastVaultPath) {
        setVaultPath(s.lastVaultPath);
        invoke<FileEntry[]>('scan_vault', { path: s.lastVaultPath }).then((entries) => {
          setVaultEntries(entries);
        });
      }
      // Restore open tabs
      if (s.openTabs && s.openTabs.length > 0) {
        const paths = s.openTabs.filter((p) => p.endsWith('.md'));
        Promise.all(
          paths.map((path) =>
            invoke<string>('read_file', { path }).then((text) => ({
              path,
              name: path.split('/').pop() || path,
              content: text,
              unsaved: false,
            }))
          )
        ).then((newTabs) => {
          setTabs(newTabs);
          if (newTabs.length > 0) setActivePath(newTabs[0].path);
        });
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

  // ---- Persist workspace state ----
  useEffect(() => {
    if (!vaultPath && tabs.length === 0) return;
    const timer = setTimeout(() => {
      const updated = {
        ...settings,
        lastVaultPath: vaultPath ?? undefined,
        openTabs: tabs.map((t) => t.path),
      };
      invoke('set_settings', { settings_json: JSON.stringify(updated) });
    }, 500);
    return () => clearTimeout(timer);
  }, [vaultPath, tabs.length, activePath]);

  // ---- Editor ref for menu-driven Find ----
  const [editorView, setEditorView] = useState<EditorView | null>(null);

  // ---- Menu event listener ----
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen('menu_click', (event) => {
      const id = event.payload as string;
      switch (id) {
        case 'open_vault':
          openVault();
          break;
        case 'new_file':
          createFile();
          break;
        case 'save':
          saveFile();
          break;
        case 'save_as':
          saveAsFile();
          break;
        case 'toggle_sidebar':
          setSidebarVisible((v) => !v);
          break;
        case 'toggle_dark':
          setDarkMode((v) => !v);
          break;
        case 'cycle_view':
          cycleViewMode();
          break;
        case 'find':
        case 'replace':
          if (editorView) {
            openSearchPanel(editorView);
          }
          break;
      }
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

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
      // Cmd+\ -> Cycle view mode
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        cycleViewMode();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTab]);

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

          <div className="mt-auto p-2 border-t border-slate-200 dark:border-slate-700 space-y-1">
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button
              onClick={() => setHelpOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Help
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

      <HelpModal
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
      />

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
              <div className="flex items-center rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  onClick={() => setViewMode('source')}
                  type="button"
                  className={`px-2.5 py-1 transition-colors ${
                    viewMode === 'source'
                      ? 'bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100'
                      : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  Source
                </button>
                <button
                  onClick={() => setViewMode('split')}
                  type="button"
                  className={`px-2.5 py-1 transition-colors border-l border-slate-200 dark:border-slate-700 ${
                    viewMode === 'split'
                      ? 'bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100'
                      : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  Split
                </button>
                <button
                  onClick={() => setViewMode('preview')}
                  type="button"
                  className={`px-2.5 py-1 transition-colors border-l border-slate-200 dark:border-slate-700 ${
                    viewMode === 'preview'
                      ? 'bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100'
                      : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  Preview
                </button>
              </div>
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
                onClick={async () => {
                  if (settings.showPdfHelp) {
                    const msg = `To save as PDF on macOS:\n\n1. In the print dialog, click the PDF dropdown in the bottom-left corner.\n2. Select Save as PDF.\n\n(This hint won't show again.)`;
                    alert(msg);
                    const updated = { ...settings, showPdfHelp: false };
                    setSettings(updated);
                    await invoke('set_settings', { settings_json: JSON.stringify(updated) });
                  }
                  await invoke('print_window');
                }}
                type="button"
                className="relative z-10 px-3 py-1 text-sm rounded-md transition-colors bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Export PDF
              </button>
              <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                {content.trim() ? content.trim().split(/\s+/).length : 0} words
              </span>
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

        {/* Editor Area */}
        {activeTab ? (
          viewMode === 'split' ? (
            <Group
              orientation="horizontal"
              className="flex-1 min-h-0"
            >
              <Panel defaultSize={50} minSize={20}>
                <div className="h-full flex flex-col border-r border-slate-200 dark:border-slate-700">
                  <MarkdownToolbar editorView={editorView} />
                  <div className="flex-1 overflow-auto min-h-0">
                    <Editor
                      content={content}
                      onChange={handleContentChange}
                      darkMode={darkMode}
                      fontSize={settings.editorFontSize}
                      onCreateEditor={(view) => { setEditorView(view); }}
                    />
                  </div>
                </div>
              </Panel>
              <Separator className="w-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-blue-400 dark:hover:bg-blue-500 transition-colors cursor-col-resize" />
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
          ) : viewMode === 'source' ? (
            <div className="flex-1 min-h-0 flex flex-col">
              <MarkdownToolbar editorView={editorView} />
              <div className="flex-1 overflow-auto min-h-0">
                <Editor
                  content={content}
                  onChange={handleContentChange}
                  darkMode={darkMode}
                  fontSize={settings.editorFontSize}
                  onCreateEditor={(view) => { setEditorView(view); }}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0">
              <InlinePreview
                content={content}
                onChange={handleContentChange}
                darkMode={darkMode}
                currentFile={activePath}
              />
            </div>
          )
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

      {/* Hidden print container */}
      {activeTab && (
        <div
          className="print-only"
          style={{ position: 'fixed', left: '-9999px', top: 0, width: '100%' }}
        >
          <div className="prose prose-slate max-w-none p-8 bg-white text-black">
            <MarkdownPreview
              content={content}
              darkMode={false}
              currentFile={activePath}
            />
          </div>
        </div>
      )}

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
