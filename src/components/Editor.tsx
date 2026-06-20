import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';

interface EditorProps {
  content: string;
  onChange: (value: string) => void;
  darkMode: boolean;
  fontSize?: number;
}

export default function Editor({ content, onChange, darkMode, fontSize = 14 }: EditorProps) {
  return (
    <div className="h-full" style={{ fontSize: `${fontSize}px` }}>
      <CodeMirror
        value={content}
        height="100%"
        extensions={[markdown()]}
        theme={darkMode ? oneDark : 'light'}
        onChange={onChange}
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
