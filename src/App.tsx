import { useEffect, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { MilkdownEditor } from "./MilkdownEditor";
import "./App.css";

const initialSource = `# Welcome to HIKMA حكمة

Start typing **Markdown** on the left — the preview updates on the right.

- Supports GitHub-flavored Markdown
- Tables, task lists, strikethrough, and more

\`\`\`js
// Fenced code blocks get syntax-highlighted too
const greet = (name) => \`Hello, \${name}!\`;
\`\`\`
`;

const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

function App() {
  const [source, setSource] = useState(initialSource);
  const [isDark, setIsDark] = useState(prefersDark.matches);

  useEffect(() => {
    const onChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
    prefersDark.addEventListener("change", onChange);
    return () => prefersDark.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="app">
      <header className="toolbar">
        <span className="toolbar-brand">HIKMA <span className="toolbar-brand-ar">حكمة</span></span>
        <span className="toolbar-mode">Markdown</span>
      </header>
      <main className="editor grow min-h-0">
        <div className="editor-whole grid h-full grid-rows-2 md:grid-cols-2 md:grid-rows-1 border-gray-300 dark:border-gray-600">
          <CodeMirror
            className="editor-source min-h-0 overflow-auto"
            value={source}
            height="100%"
            theme={isDark ? "dark" : "light"}
            basicSetup={{ lineNumbers: true, foldGutter: false }}
            extensions={[markdown({ codeLanguages: languages })]}
            onChange={(value) => setSource(value)}
          />
          <div className="editor-preview min-h-0 overflow-auto border-l border-gray-300 dark:border-gray-600">
            <MilkdownEditor markdown={source} onChange={setSource} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;