import { useState } from 'react';
import { X } from 'lucide-react';

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  editorFontSize: number;
  autoSave: boolean;
  lastVaultPath?: string;
  openTabs?: string[];
  showPdfHelp?: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  editorFontSize: 14,
  autoSave: false,
  showPdfHelp: true,
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSave: (s: Settings) => void;
}

export function loadSettings(raw: string): Settings {
  try {
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
}: SettingsModalProps) {
  const [draft, setDraft] = useState<Settings>(settings);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[480px] max-w-[90vw] bg-white dark:bg-slate-800 rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-5">
          {/* Theme */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Theme
            </label>
            <select
              value={draft.theme}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  theme: e.target.value as Settings['theme'],
                }))
              }
              className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          {/* Editor Font Size */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Editor Font Size ({draft.editorFontSize}px)
            </label>
            <input
              type="range"
              min={10}
              max={24}
              value={draft.editorFontSize}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  editorFontSize: parseInt(e.target.value, 10),
                }))
              }
              className="w-full accent-blue-600"
            />
          </div>

          {/* Auto Save */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Auto Save
            </label>
            <button
              onClick={() => setDraft((d) => ({ ...d, autoSave: !d.autoSave }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                draft.autoSave
                  ? 'bg-blue-600'
                  : 'bg-slate-200 dark:bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  draft.autoSave ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
