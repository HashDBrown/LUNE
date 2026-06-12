import { useCallback, useEffect, useRef, useState } from "react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { ask, message, open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { gutters } from "@codemirror/view";
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

// File pickers and native fs are unavailable when the frontend runs in a plain browser
const isTauri = "__TAURI_INTERNALS__" in window;

const RECENT_KEY = "hikma.recent-files";
const MAX_RECENT = 10;

const markdownFilters = [{ name: "Markdown", extensions: ["md", "markdown", "txt"] }];

function loadRecentFiles(): string[] {
  try {
    const stored = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(stored) ? stored.filter((p) => typeof p === "string") : [];
  } catch {
    return [];
  }
}

function baseName(path: string) {
  return path.split(/[/\\]/).pop() ?? path;
}

function App() {
  const [source, setSource] = useState(initialSource);
  const [savedSource, setSavedSource] = useState(initialSource);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [recentFiles, setRecentFiles] = useState<string[]>(loadRecentFiles);
  const [recentOpen, setRecentOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [systemPrefersDark, setSystemPrefersDark] = useState(prefersDark.matches);

  const editorViewRef = useRef<EditorView | null>(null);

  const dirty = source !== savedSource;
  const fileName = filePath ? baseName(filePath) : "Untitled";

  // Latest state for the stable window/keyboard listeners registered once below
  const stateRef = useRef({ source, filePath, dirty });
  useEffect(() => {
    stateRef.current = { source, filePath, dirty };
  });

  useEffect(() => {
    const onChange = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    prefersDark.addEventListener("change", onChange);
    return () => prefersDark.removeEventListener("change", onChange);
  }, []);

  const isDark = theme === "system" ? systemPrefersDark : theme === "dark";

  const updateRecentFiles = useCallback((update: (prev: string[]) => string[]) => {
    setRecentFiles((prev) => {
      const next = update(prev);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const addRecentFile = useCallback(
    (path: string) => {
      updateRecentFiles((prev) => [path, ...prev.filter((p) => p !== path)].slice(0, MAX_RECENT));
    },
    [updateRecentFiles],
  );

  const confirmDiscard = useCallback(async () => {
    if (!stateRef.current.dirty) return true;
    return ask("You have unsaved changes that will be lost.", {
      title: "Discard changes?",
      kind: "warning",
      okLabel: "Discard",
      cancelLabel: "Cancel",
    });
  }, []);

  const openFile = useCallback(
    async (path?: string) => {
      if (!isTauri) {
        window.alert("File open/save needs the desktop app — run `npm run tauri dev`.");
        return;
      }
      setRecentOpen(false);
      if (!(await confirmDiscard())) return;
      const target =
        path ?? (await openDialog({ multiple: false, directory: false, filters: markdownFilters }));
      if (!target) return;
      try {
        const text = await readTextFile(target);
        setSource(text);
        setSavedSource(text);
        setFilePath(target);
        addRecentFile(target);
      } catch (err) {
        updateRecentFiles((prev) => prev.filter((p) => p !== target));
        await message(`Could not open ${target}:\n${err}`, { title: "Open failed", kind: "error" });
      }
    },
    [addRecentFile, confirmDiscard, updateRecentFiles],
  );

  const newFile = useCallback(async () => {
    if (!(await confirmDiscard())) return;
    setSource(initialSource);
    setSavedSource(initialSource);
    setFilePath(null);
  }, [confirmDiscard]);

  const saveFileAs = useCallback(async () => {
    if (!isTauri) {
      window.alert("File open/save needs the desktop app — run `npm run tauri dev`.");
      return false;
    }
    const target = await saveDialog({
      defaultPath: stateRef.current.filePath ?? "Untitled.md",
      filters: markdownFilters,
    });
    if (!target) return false;
    try {
      await writeTextFile(target, stateRef.current.source);
      setSavedSource(stateRef.current.source);
      setFilePath(target);
      addRecentFile(target);
      return true;
    } catch (err) {
      await message(`Could not save ${target}:\n${err}`, { title: "Save failed", kind: "error" });
      return false;
    }
  }, [addRecentFile]);

  const saveFile = useCallback(async () => {
    const { filePath: path, source: text } = stateRef.current;
    if (!path) return saveFileAs();
    try {
      await writeTextFile(path, text);
      setSavedSource(text);
      return true;
    } catch (err) {
      await message(`Could not save ${path}:\n${err}`, { title: "Save failed", kind: "error" });
      return false;
    }
  }, [saveFileAs]);

  const insertText = useCallback((type: string) => {
    if (!editorViewRef.current) return;

    let snippet = "";
    switch (type) {
      case "code":
        snippet = "\n```js\n// Code block\n\n```\n";
        break;
      case "table":
        snippet = "\n| Header | Header |\n| ------ | ------ |\n| Cell   | Cell   |\n";
        break;
      case "image":
        snippet = "![Alt text](https://via.placeholder.com/150)";
        break;
      case "link":
        snippet = "[Link text](https://example.com)";
        break;
      case "rule":
        snippet = "\n---\n";
        break;
      case "task":
        snippet = "\n- [ ] New task\n";
        break;
      case "quote":
        snippet = "\n> Blockquote\n";
        break;
    }

    const { state, dispatch } = editorViewRef.current;
    const { from, to } = state.selection.main;
    dispatch({
      changes: { from, to, insert: snippet },
      selection: { anchor: from + snippet.length },
      scrollIntoView: true,
    });
  }, []);

  useEffect(() => {
    if (!isTauri) return;

    const unlistens = [
      listen("menu-new", () => void newFile()),
      listen("menu-open", () => void openFile()),
      listen("menu-save", () => void saveFile()),
      listen("menu-save-as", () => void saveFileAs()),
      listen("menu-theme", (event) => {
        setTheme(event.payload as "light" | "dark" | "system");
      }),
      listen("menu-insert", (event) => {
        insertText(event.payload as string);
      }),
      listen("menu-learn-more", () => {
        window.open("https://github.com/HashDBrown/HIKMA", "_blank");
      }),
      listen("menu-github", () => {
        window.open("https://github.com/HashDBrown/HIKMA", "_blank");
      }),
      listen("menu-report-issue", () => {
        window.open("https://github.com/HashDBrown/HIKMA/issues", "_blank");
      }),
    ];

    return () => {
      void Promise.all(unlistens).then((fns) => fns.forEach((fn) => fn()));
    };
  }, [insertText, newFile, openFile, saveFile, saveFileAs]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === "o") {
        e.preventDefault();
        void openFile();
      } else if (key === "s") {
        e.preventDefault();
        void (e.shiftKey ? saveFileAs() : saveFile());
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openFile, saveFile, saveFileAs]);

  useEffect(() => {
    if (!isTauri) return;
    void getCurrentWindow().setTitle(`${dirty ? "• " : ""}${fileName} — HIKMA`);
  }, [dirty, fileName]);

  useEffect(() => {
    if (!isTauri) return;
    const win = getCurrentWindow();
    const unlisten = win.onCloseRequested(async (event) => {
      if (!stateRef.current.dirty) return;
      event.preventDefault();
      const discard = await ask(`${baseName(stateRef.current.filePath ?? "Untitled")} has unsaved changes. Close without saving?`, {
        title: "Unsaved changes",
        kind: "warning",
        okLabel: "Discard & Close",
        cancelLabel: "Cancel",
      });
      if (discard) await win.destroy();
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    if (!recentOpen) return;
    const onClick = () => setRecentOpen(false);
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [recentOpen]);

  return (
    <div className="app">
      <header className="toolbar">
        <span className="toolbar-brand">HIKMA <span className="toolbar-brand-ar">حكمة</span></span>
        <span className="toolbar-file" title={filePath ?? undefined}>
          {fileName}
          {dirty && <span className="toolbar-dirty">●</span>}
        </span>
        <div className="toolbar-actions">
          <button className="toolbar-btn" onClick={() => void openFile()}>Open</button>
          <div className="toolbar-recent" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="toolbar-btn"
              aria-haspopup="menu"
              aria-expanded={recentOpen}
              aria-controls="recent-menu"
              disabled={recentFiles.length === 0}
              onClick={() => setRecentOpen((open) => !open)}
            >
              Recent ▾
            </button>
            {recentOpen && (
              <ul id="recent-menu" role="menu" className="toolbar-recent-menu">
                {recentFiles.map((path) => (
                  <li key={path}>
                    <button title={path} onClick={() => void openFile(path)}>
                      {baseName(path)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button className="toolbar-btn" onClick={() => void saveFile()}>Save</button>
          <button className="toolbar-btn" onClick={() => void saveFileAs()}>Save As</button>
        </div>
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
            extensions={[markdown({ codeLanguages: languages }), gutters({ fixed: false })]}
            onChange={(value) => setSource(value)}
            onCreateEditor={(view) => {
              editorViewRef.current = view;
            }}
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
