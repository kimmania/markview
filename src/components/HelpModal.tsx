import { useState } from 'react';
import { X, BookOpen, Table, Sigma, GitGraph, Keyboard } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabId = 'markdown' | 'tables' | 'math' | 'mermaid' | 'shortcuts';

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

const tabs: TabDef[] = [
  { id: 'markdown', label: 'Markdown', icon: BookOpen },
  { id: 'tables', label: 'Tables', icon: Table },
  { id: 'math', label: 'Math', icon: Sigma },
  { id: 'mermaid', label: 'Mermaid', icon: GitGraph },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
];

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="my-2 p-3 rounded-md text-sm bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono overflow-x-auto">
      {children}
    </pre>
  );
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 dark:text-blue-400 hover:underline"
    >
      {children}
    </a>
  );
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('markdown');

  if (!isOpen) return null;

  const renderContent = () => {
    switch (activeTab) {
      case 'markdown':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Markdown Basics</h3>
            
            <div>
              <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-1">Headings</h4>
              <CodeBlock>{`# Heading 1
## Heading 2
### Heading 3`}</CodeBlock>
            </div>

            <div>
              <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-1">Emphasis</h4>
              <CodeBlock>{`**Bold text**
*Italic text*
~~Strikethrough~~`}</CodeBlock>
            </div>

            <div>
              <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-1">Lists</h4>
              <CodeBlock>{`- Bullet item
- Another bullet
  - Nested bullet

1. Numbered item
2. Second item`}</CodeBlock>
            </div>

            <div>
              <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-1">Links & Images</h4>
              <CodeBlock>{`[Link text](https://example.com)
![Alt text](image.png)`}</CodeBlock>
            </div>

            <div>
              <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-1">Blockquotes</h4>
              <CodeBlock>{`> This is a blockquote
> Multiple lines`}</CodeBlock>
            </div>

            <div>
              <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-1">Code</h4>
              <CodeBlock>{`Inline \`code\` with backticks

\`\`\`python
def hello():
    return "world"
\`\`\``}</CodeBlock>
            </div>

            <div>
              <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-1">WikiLinks (Obsidian-style)</h4>
              <CodeBlock>{`[[Another Note]]
[[Another Note|Display text]]`}</CodeBlock>
            </div>
          </div>
        );

      case 'tables':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Tables</h3>
            
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Tables are created with pipes <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-sm">|</code> and hyphens. The second row with hyphens creates the header separator.
            </p>

            <CodeBlock>{`| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Row 1A   | Row 1B   | Row 1C   |
| Row 2A   | Row 2B   | Row 2C   |`}</CodeBlock>

            <div>
              <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-1">Alignment</h4>
              <CodeBlock>{`| Left | Center | Right |
|:-----|:------:|------:|
| L    |   C    |     R |`}</CodeBlock>
              <ul className="text-sm text-slate-600 dark:text-slate-400 mt-2 list-disc list-inside space-y-1">
                <li><code className="font-mono">|:-----|</code> — left aligned</li>
                <li><code className="font-mono">|:-----:|</code> — center aligned</li>
                <li><code className="font-mono">|------:|</code> — right aligned</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-1">Tips</h4>
              <ul className="text-sm text-slate-600 dark:text-slate-400 list-disc list-inside space-y-1">
                <li>Leading and trailing pipes are optional but recommended</li>
                <li>Cells don't need to align visually — Markdown parsers handle spacing</li>
                <li>You can use inline formatting (bold, italic, code) inside cells</li>
              </ul>
            </div>
          </div>
        );

      case 'math':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Math & Science (KaTeX)</h3>
            
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Markview uses <ExternalLink href="https://katex.org/">KaTeX</ExternalLink> for math rendering. Syntax is standard LaTeX math mode.
            </p>

            <div>
              <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-1">Inline Math</h4>
              <CodeBlock>{`The energy is $E = mc^2$ in relativistic physics.`}</CodeBlock>
            </div>

            <div>
              <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-1">Block Math</h4>
              <CodeBlock>{`$$
\\sum_{i=1}^{n} x_i = x_1 + x_2 + \\cdots + x_n
$$`}</CodeBlock>
            </div>

            <div>
              <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-1">Common Symbols</h4>
              <CodeBlock>{`$\\alpha \\beta \\gamma \\delta \\pi \\theta \\sigma$
$\\infty \\pm \\times \\div \\cdot \\approx \\neq \\leq \\geq$
$\\frac{a}{b} \\sqrt{x} \\sqrt[n]{x} x^{2} x_{i}$`}</CodeBlock>
            </div>

            <div>
              <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-1">Calculus</h4>
              <CodeBlock>{`$$
\\int_{a}^{b} f(x) \\, dx = F(b) - F(a)
\\qquad
\\frac{d}{dx} e^x = e^x
$$`}</CodeBlock>
            </div>

            <div>
              <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-1">Matrices</h4>
              <CodeBlock>{`$$
\\begin{pmatrix}
a & b \\\n
c & d
\\end{pmatrix}
$$`}</CodeBlock>
            </div>

            <div>
              <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-1">Useful Resources</h4>
              <ul className="text-sm space-y-1">
                <li><ExternalLink href="https://katex.org/docs/supported.html">KaTeX Supported Functions</ExternalLink></li>
                <li><ExternalLink href="https://en.wikibooks.org/wiki/LaTeX/Mathematics">LaTeX Mathematics (Wikibooks)</ExternalLink></li>
                <li><ExternalLink href="https://www.cmor-faculty.rice.edu/~heinken/latex/symbols.pdf">LaTeX Math Symbols (PDF)</ExternalLink></li>
              </ul>
            </div>
          </div>
        );

      case 'mermaid':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Mermaid Diagrams</h3>
            
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Markview uses <ExternalLink href="https://mermaid.js.org/">Mermaid</ExternalLink> for diagrams. Create a code block with language <code className="font-mono">mermaid</code>.
            </p>

            <div>
              <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-1">Flowchart</h4>
              <CodeBlock>{`\`\`\`mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
\`\`\``}</CodeBlock>
            </div>

            <div>
              <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-1">Sequence Diagram</h4>
              <CodeBlock>{`\`\`\`mermaid
sequenceDiagram
    participant A as Alice
    participant B as Bob
    A->>B: Hello Bob
    B-->>A: Hi Alice
    A->>B: How are you?
\`\`\``}</CodeBlock>
            </div>

            <div>
              <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-1">Class Diagram</h4>
              <CodeBlock>{`\`\`\`mermaid
classDiagram
    class Animal {
        +String name
        +makeSound()
    }
    class Dog {
        +fetch()
    }
    Animal <|-- Dog
\`\`\``}</CodeBlock>
            </div>

            <div>
              <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-1">State Diagram</h4>
              <CodeBlock>{`\`\`\`mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Running : start
    Running --> Idle : stop
    Running --> Error : fail
    Error --> Idle : reset
\`\`\``}</CodeBlock>
            </div>

            <div>
              <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-1">Useful Resources</h4>
              <ul className="text-sm space-y-1">
                <li><ExternalLink href="https://mermaid.js.org/intro/">Mermaid Getting Started</ExternalLink></li>
                <li><ExternalLink href="https://mermaid.js.org/syntax/flowchart.html">Flowchart Syntax</ExternalLink></li>
                <li><ExternalLink href="https://mermaid.js.org/syntax/sequenceDiagram.html">Sequence Diagram Syntax</ExternalLink></li>
                <li><ExternalLink href="https://mermaid.js.org/syntax/classDiagram.html">Class Diagram Syntax</ExternalLink></li>
                <li><ExternalLink href="https://mermaid.live/">Mermaid Live Editor</ExternalLink> — test diagrams online</li>
              </ul>
            </div>
          </div>
        );

      case 'shortcuts':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Keyboard Shortcuts</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-2">File</h4>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    <tr><td className="py-1.5 text-slate-600 dark:text-slate-400">New File</td><td className="py-1.5 text-right font-mono text-slate-500">⌘N</td></tr>
                    <tr><td className="py-1.5 text-slate-600 dark:text-slate-400">Open Vault</td><td className="py-1.5 text-right font-mono text-slate-500">⌘⇧O</td></tr>
                    <tr><td className="py-1.5 text-slate-600 dark:text-slate-400">Save</td><td className="py-1.5 text-right font-mono text-slate-500">⌘S</td></tr>
                    <tr><td className="py-1.5 text-slate-600 dark:text-slate-400">Save As</td><td className="py-1.5 text-right font-mono text-slate-500">⌘⇧S</td></tr>
                  </tbody>
                </table>
              </div>

              <div>
                <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-2">Edit</h4>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    <tr><td className="py-1.5 text-slate-600 dark:text-slate-400">Undo</td><td className="py-1.5 text-right font-mono text-slate-500">⌘Z</td></tr>
                    <tr><td className="py-1.5 text-slate-600 dark:text-slate-400">Redo</td><td className="py-1.5 text-right font-mono text-slate-500">⌘⇧Z</td></tr>
                    <tr><td className="py-1.5 text-slate-600 dark:text-slate-400">Find</td><td className="py-1.5 text-right font-mono text-slate-500">⌘F</td></tr>
                    <tr><td className="py-1.5 text-slate-600 dark:text-slate-400">Replace</td><td className="py-1.5 text-right font-mono text-slate-500">⌘H</td></tr>
                  </tbody>
                </table>
              </div>

              <div>
                <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-2">View</h4>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    <tr><td className="py-1.5 text-slate-600 dark:text-slate-400">Toggle Sidebar</td><td className="py-1.5 text-right font-mono text-slate-500">⌘B</td></tr>
                    <tr><td className="py-1.5 text-slate-600 dark:text-slate-400">Cycle View Mode</td><td className="py-1.5 text-right font-mono text-slate-500">⌘\</td></tr>
                    <tr><td className="py-1.5 text-slate-600 dark:text-slate-400">Toggle Dark Mode</td><td className="py-1.5 text-right font-mono text-slate-500">⌘⇧D</td></tr>
                    <tr><td className="py-1.5 text-slate-600 dark:text-slate-400">Quick Switcher</td><td className="py-1.5 text-right font-mono text-slate-500">⌘P</td></tr>
                  </tbody>
                </table>
              </div>

              <div>
                <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-2">Inline Edit</h4>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    <tr><td className="py-1.5 text-slate-600 dark:text-slate-400">Save Block</td><td className="py-1.5 text-right font-mono text-slate-500">⌘Enter</td></tr>
                    <tr><td className="py-1.5 text-slate-600 dark:text-slate-400">Cancel Edit</td><td className="py-1.5 text-right font-mono text-slate-500">Esc</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[640px] max-w-[90vw] h-[80vh] max-h-[600px] bg-white dark:bg-slate-800 rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Help</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar tabs */}
          <div className="w-40 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex flex-col p-2 gap-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left ${
                  activeTab === id
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
