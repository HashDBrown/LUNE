import { useEffect, useRef } from "react";
import { Crepe } from "@milkdown/crepe";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { replaceAll } from "@milkdown/kit/utils"; // ← Updated to the v7 kit package!

// Import base styles first
import '@milkdown/crepe/theme/common/style.css'
// Then import your chosen theme
import '@milkdown/crepe/theme/frame-dark.css'

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
      style={{ width: "100%", height: "100%" }}
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