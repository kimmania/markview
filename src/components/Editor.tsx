import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { search } from '@codemirror/search';

interface EditorProps {
  content: string;
  onChange: (value: string) => void;
  darkMode: boolean;
  fontSize?: number;
  onCreateEditor?: (view: any) => void;
}

export default function Editor({ content, onChange, darkMode, fontSize = 14, onCreateEditor }: EditorProps) {
  return (
    <div className="h-full" style={{ fontSize: `${fontSize}px` }}>
      <CodeMirror
        value={content}
        height="100%"
        extensions={[markdown(), search()]}
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
