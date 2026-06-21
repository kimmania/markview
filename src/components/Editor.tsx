import { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { search, replaceNext } from '@codemirror/search';
import { ViewPlugin, EditorView } from '@codemirror/view';

/**
 * CodeMirror 6's built-in replaceNext only replaces the current selection
 * if it matches the search query. If the cursor isn't on a match, the first
 * click just selects the next match without replacing it. This plugin
 * intercepts clicks on the Replace button and automatically does the
 * replacement in one gesture.
 */
const smartReplaceExtension = ViewPlugin.fromClass(
  class {
    private view: EditorView;
    private handleClick: (e: MouseEvent) => void;

    constructor(view: EditorView) {
      this.view = view;
      this.handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target?.closest?.('.cm-button[name="replace"]')) return;

        // Prevent the default CodeMirror replaceNext handler
        e.stopImmediatePropagation();
        e.preventDefault();

        const selBefore = view.state.selection.main;
        const docBefore = view.state.doc.toString();

        // Standard replaceNext: if selection doesn't match, it only selects the next match
        replaceNext(view);

        const selAfter = view.state.selection.main;
        const docAfter = view.state.doc.toString();

        const selectionChanged =
          selBefore.from !== selAfter.from || selBefore.to !== selAfter.to;
        const docChanged = docBefore !== docAfter;

        if (selectionChanged && !docChanged) {
          // First click only selected a match — run replaceNext again to actually replace
          replaceNext(view);
        }
      };
      view.dom.addEventListener('click', this.handleClick, true);
    }

    update() {}

    destroy() {
      this.view.dom.removeEventListener('click', this.handleClick, true);
    }
  }
);

interface EditorProps {
  content: string;
  onChange: (value: string) => void;
  darkMode: boolean;
  fontSize?: number;
  onCreateEditor?: (view: any) => void;
}

export default function Editor({
  content,
  onChange,
  darkMode,
  fontSize = 14,
  onCreateEditor,
}: EditorProps) {
  const extensions = useMemo(
    () => [markdown(), search(), smartReplaceExtension],
    []
  );

  return (
    <div className="h-full" style={{ fontSize: `${fontSize}px` }}>
      <CodeMirror
        value={content}
        height="100%"
        extensions={extensions}
        theme={darkMode ? oneDark : 'light'}
        onChange={onChange}
        onCreateEditor={onCreateEditor}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightActiveLine: true,
          foldGutter: false,
        }}
      />
    </div>
  );
}
