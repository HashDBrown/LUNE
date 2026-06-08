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
    <main className="editor">
      <CodeMirror
        className="editor-source"
        value={source}
        height="100vh"
        theme={isDark ? "dark" : "light"}
        basicSetup={{ lineNumbers: true, foldGutter: false }}
        extensions={[markdown({ codeLanguages: languages })]}
        onChange={(value) => setSource(value)}
      />
      <div className="editor-preview">
        <MilkdownEditor markdown={source} onChange={setSource} />
      </div>
    </main>
  );
}

export default App;