import { X, FileText } from 'lucide-react';

export interface Tab {
  path: string;
  name: string;
  unsaved: boolean;
}

interface TabBarProps {
  tabs: Tab[];
  activePath: string | null;
  onTabClick: (path: string) => void;
  onTabClose: (path: string) => void;
}

export default function TabBar({ tabs, activePath, onTabClick, onTabClose }: TabBarProps) {
  if (tabs.length === 0) return null;

  return (
    <div className="flex items-center border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 overflow-x-auto shrink-0 h-9">
      {tabs.map((tab) => {
        const isActive = activePath === tab.path;
        return (
          <div
            key={tab.path}
            className={`group flex items-center gap-1.5 px-3 py-1.5 text-sm border-r border-slate-200 dark:border-slate-700 cursor-pointer select-none min-w-fit transition-colors ${
              isActive
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-t-2 border-t-blue-500'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            onClick={() => onTabClick(tab.path)}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate max-w-[140px]">{tab.name}</span>
            {tab.unsaved && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.path);
              }}
              className={`ml-1 p-0.5 rounded-full transition-colors ${
                isActive
                  ? 'hover:bg-slate-200 dark:hover:bg-slate-700'
                  : 'opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
