import { useState } from "react";

/** Mirrors the `FileNode` struct returned by the `read_dir_tree` Rust command. */
export type FileNode = {
  name: string;
  path: string;
  is_dir: boolean;
  children: FileNode[] | null;
};

/** Extensions HIKMA can open in the editor. Everything else (images, etc.)
 *  is shown in the tree for orientation but rendered inert. */
const EDITABLE = new Set(["md", "markdown", "txt"]);

function isEditable(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return EDITABLE.has(ext);
}

type FileTreeProps = {
  root: FileNode;
  activePath: string | null;
  onOpenFile: (path: string) => void;
};

/**
 * Renders the workspace root's children directly (the root folder itself is
 * shown in the sidebar header, not as a clickable row).
 */
export function FileTree({ root, activePath, onOpenFile }: FileTreeProps) {
  return (
    <ul className="tree-root">
      {root.children?.map((child) => (
        <TreeNode
          key={child.path}
          node={child}
          depth={1}
          activePath={activePath}
          onOpenFile={onOpenFile}
        />
      ))}
    </ul>
  );
}

type TreeNodeProps = {
  node: FileNode;
  depth: number;
  activePath: string | null;
  onOpenFile: (path: string) => void;
};

function TreeNode({ node, depth, activePath, onOpenFile }: TreeNodeProps) {
  // Top-level folders start expanded; deeper ones start collapsed.
  const [open, setOpen] = useState(depth <= 1);
  const indent = { paddingLeft: `${(depth - 1) * 0.85 + 0.5}rem` };

  if (!node.is_dir) {
    const editable = isEditable(node.name);
    const active = node.path === activePath;
    return (
      <li
        className={`tree-row tree-file${active ? " active" : ""}${editable ? "" : " inert"}`}
        style={indent}
        title={editable ? node.name : `${node.name} — preview only`}
        onClick={editable ? () => onOpenFile(node.path) : undefined}
      >
        <span className="tree-twist" />
        <span className="tree-label">{node.name}</span>
      </li>
    );
  }

  const hasChildren = !!node.children && node.children.length > 0;

  return (
    <li className="tree-branch">
      <div
        className="tree-row tree-dir"
        style={indent}
        title={node.name}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="tree-twist">{hasChildren ? (open ? "▾" : "▸") : ""}</span>
        <span className="tree-label">{node.name}</span>
      </div>
      {open && hasChildren && (
        <ul className="tree-children">
          {node.children!.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              activePath={activePath}
              onOpenFile={onOpenFile}
            />
          ))}
        </ul>
      )}
    </li>
  );
}