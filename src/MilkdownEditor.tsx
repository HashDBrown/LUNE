import { useEffect, useRef } from "react";
import { Crepe } from "@milkdown/crepe";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { replaceAll } from "@milkdown/kit/utils";

// 1. Base prose styles
import '@milkdown/crepe/theme/common/style.css';
// 2. THE MISSING PIECE: UI Structure (menus, toolbars, handles)
import '@milkdown/crepe/theme/frame.css'; 
// 3. Your custom colors (system dark/light mode is auto-selected via prefers-color-scheme)
import './crepe-dark.css';
import './crepe-light.css';

interface MilkdownEditorProps {
  markdown: string;
  onChange: (markdown: string) => void;
}

function Editor({ markdown, onChange }: MilkdownEditorProps) {
  const focused = useRef(false);          // is the user editing in THIS pane?
  const lastSynced = useRef(markdown);
  const crepeRef = useRef<Crepe | null>(null);

  useEditor((root) => {
    const crepe = new Crepe({ root, defaultValue: markdown });
    crepeRef.current = crepe;
    crepe.on((listener) => {
      listener.markdownUpdated((_ctx, updatedMarkdown) => {
        if (!focused.current) return;     // ← swallows the replaceAll echo
        if (updatedMarkdown === lastSynced.current) return;
        lastSynced.current = updatedMarkdown;
        onChange(updatedMarkdown);
      });
    });
    return crepe;
  }, []);

  useEffect(() => {
    if (focused.current) return;          // ← don't clobber while typing here
    if (markdown === lastSynced.current) return;
    lastSynced.current = markdown;
    crepeRef.current?.editor.action(replaceAll(markdown));
  }, [markdown]);

  return (
    <div
      className="milkdown-host"
      onFocusCapture={() => (focused.current = true)}
      onBlurCapture={() => (focused.current = false)}
    >
      <Milkdown />
    </div>
  );
}

export function MilkdownEditor(props: MilkdownEditorProps) {
  return (
    <MilkdownProvider>
      <Editor {...props} />
    </MilkdownProvider>
  );
}