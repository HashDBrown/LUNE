import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./App.css";

const initialSource = `# Welcome to HIKMA حكمة

Start typing **Markdown** on the left — the preview updates on the right.

- Supports GitHub-flavored Markdown
- Tables, task lists, strikethrough, and more
`;

function App() {
  const [source, setSource] = useState(initialSource);

  return (
    <main className="editor">
      <textarea
        className="editor-source"
        value={source}
        onChange={(e) => setSource(e.currentTarget.value)}
        spellCheck={false}
      />
      <div className="editor-preview">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
      </div>
    </main>
  );
}

export default App;
