import { EditorView } from '@codemirror/view';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  List,
  ListOrdered,
  Link,
  Image,
} from 'lucide-react';

interface MarkdownToolbarProps {
  editorView: EditorView | null;
}

function insertAround(
  view: EditorView,
  before: string,
  after: string,
  placeholder?: string
) {
  const sel = view.state.selection.main;
  const selected = view.state.sliceDoc(sel.from, sel.to);
  const text = selected || placeholder || '';
  const newText = `${before}${text}${after}`;
  const cursorPos = sel.from + before.length + (selected ? text.length : 0);
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert: newText },
    selection: { anchor: selected ? sel.to + before.length + after.length : cursorPos, head: selected ? sel.to + before.length + after.length : cursorPos },
  });
  view.focus();
}

function insertAtLineStart(view: EditorView, prefix: string) {
  const sel = view.state.selection.main;
  const line = view.state.doc.lineAt(sel.from);
  const lineText = view.state.sliceDoc(line.from, line.to);
  const alreadyHas = lineText.startsWith(prefix);
  if (alreadyHas) {
    // Remove the prefix
    view.dispatch({
      changes: { from: line.from, to: line.from + prefix.length, insert: '' },
      selection: { anchor: sel.from - prefix.length, head: sel.to - prefix.length },
    });
  } else {
    // Add the prefix
    view.dispatch({
      changes: { from: line.from, to: line.from, insert: prefix },
      selection: { anchor: sel.from + prefix.length, head: sel.to + prefix.length },
    });
  }
  view.focus();
}

function insertBlock(view: EditorView, before: string, after: string, placeholder?: string) {
  const sel = view.state.selection.main;
  const selected = view.state.sliceDoc(sel.from, sel.to);
  const text = selected || placeholder || '';
  const newText = `${before}${text}${after}`;
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert: newText },
    selection: { anchor: sel.from + before.length + (selected ? text.length : 0), head: sel.from + before.length + (selected ? text.length : 0) },
  });
  view.focus();
}

export default function MarkdownToolbar({ editorView }: MarkdownToolbarProps) {
  if (!editorView) return null;

  const buttons = [
    { icon: Bold, label: 'Bold (⌘B)', action: () => insertAround(editorView, '**', '**') },
    { icon: Italic, label: 'Italic (⌘I)', action: () => insertAround(editorView, '*', '*') },
    { icon: Heading1, label: 'Heading 1', action: () => insertAtLineStart(editorView, '# ') },
    { icon: Heading2, label: 'Heading 2', action: () => insertAtLineStart(editorView, '## ') },
    { icon: Heading3, label: 'Heading 3', action: () => insertAtLineStart(editorView, '### ') },
    { icon: Quote, label: 'Blockquote', action: () => insertAtLineStart(editorView, '> ') },
    { icon: Code, label: 'Code Block', action: () => insertBlock(editorView, '```\n', '\n```') },
    { icon: List, label: 'Bullet List', action: () => insertAtLineStart(editorView, '- ') },
    { icon: ListOrdered, label: 'Numbered List', action: () => insertAtLineStart(editorView, '1. ') },
    { icon: Link, label: 'Link', action: () => insertAround(editorView, '[', '](url)', 'text') },
    { icon: Image, label: 'Image', action: () => insertAround(editorView, '![', '](path)', 'alt') },
  ];

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shrink-0 overflow-x-auto">
      {buttons.map(({ icon: Icon, label, action }) => (
        <button
          key={label}
          type="button"
          onClick={action}
          title={label}
          className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0"
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}
