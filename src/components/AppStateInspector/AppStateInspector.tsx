import { useCallback, useState } from 'react';
import * as _appContext from '@builder.io/app-context';
import type { ApplicationContext } from '@builder.io/app-context';
import { snapshotAppState, type SnapshotNode } from './appStateSnapshot';
import styles from './AppStateInspector.module.scss';

const appState = (_appContext as unknown as { default: ApplicationContext })
  .default;

function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

function typeClass(type: string): string {
  if (type === 'string') return styles.tString;
  if (type === 'number' || type === 'bigint') return styles.tNumber;
  if (type === 'boolean') return styles.tBoolean;
  if (type === 'null' || type === 'undefined') return styles.tNullish;
  if (type === 'function') return styles.tFunction;
  if (type === 'circular') return styles.tCircular;
  if (type === 'redacted') return styles.tRedacted;
  if (type === 'error') return styles.tError;
  return styles.tObject;
}

// Walks a snapshot subtree and adds every path with children to `out`.
// `maxDepth` null = unbounded.
function collectExpandablePaths(
  node: SnapshotNode,
  depth: number,
  maxDepth: number | null,
  out: Set<string>,
): void {
  if (!node.children?.length) return;
  out.add(node.path);
  if (maxDepth !== null && depth >= maxDepth) return;
  for (const child of node.children) {
    collectExpandablePaths(child, depth + 1, maxDepth, out);
  }
}

interface TreeNodeProps {
  node: SnapshotNode;
  depth: number;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
}

function TreeNode({ node, depth, expandedPaths, onToggle }: TreeNodeProps) {
  const [copied, setCopied] = useState(false);
  const hasChildren = !!node.children && node.children.length > 0;
  const expanded = expandedPaths.has(node.path);

  const toggle = () => {
    if (hasChildren) onToggle(node.path);
  };

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(node.path);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard may be blocked — silently ignore */
    }
  };

  return (
    <div className={styles.node}>
      <div
        className={cx(styles.row, hasChildren && styles.clickable)}
        onClick={toggle}
        style={{ paddingLeft: depth * 14 + 8 }}
      >
        <span className={styles.toggle}>
          {hasChildren ? (expanded ? '▾' : '▸') : '·'}
        </span>
        <span className={styles.label}>{node.label}</span>
        <span className={styles.colon}>:</span>
        <span className={cx(styles.type, typeClass(node.type))}>
          {node.type}
        </span>
        <span className={styles.preview}>{node.preview}</span>
        <button
          type="button"
          className={cx(styles.copy, copied && styles.copied)}
          onClick={copy}
          title={`Copy path: ${node.path}`}
        >
          {copied ? '✓ copied' : '⧉ path'}
        </button>
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children!.map((child, i) => (
            <TreeNode
              key={`${child.label}-${i}`}
              node={child}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
            />
          ))}
          {node.truncated && (
            <div
              className={styles.truncated}
              style={{ paddingLeft: (depth + 1) * 14 + 8 }}
            >
              …some entries omitted (truncated for display)
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Toolbar button that opens a modal showing a snapshot of Builder.io's
 * runtime `appState` object. Educational: lets plugin authors discover
 * what data and methods are reachable from inside the editor.
 *
 * Registered via `Builder.register('editor.toolbarButton', ...)`. Snapshot
 * is captured fresh each time the modal is opened.
 */
export function AppStateInspector() {
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<SnapshotNode | null>(null);
  const [takenAt, setTakenAt] = useState<Date | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const openInspector = () => {
    const snap = appState
      ? snapshotAppState(appState, 'appState')
      : ({
          label: 'appState',
          path: 'appState',
          type: 'undefined',
          preview: 'appState is not available in this context',
        } satisfies SnapshotNode);
    setSnapshot(snap);
    setTakenAt(new Date());
    // Match the previous default: root + first level expanded.
    const initial = new Set<string>();
    collectExpandablePaths(snap, 0, 1, initial);
    setExpandedPaths(initial);
    setOpen(true);
  };

  const close = () => setOpen(false);

  const togglePath = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const expandAll = () => {
    if (!snapshot) return;
    const all = new Set<string>();
    collectExpandablePaths(snapshot, 0, null, all);
    setExpandedPaths(all);
  };

  const collapseAll = () => {
    // Keep only root expanded so the tree remains visible.
    if (snapshot) setExpandedPaths(new Set([snapshot.path]));
  };

  return (
    <>
      <button
        type="button"
        className={styles.toolbarButton}
        onClick={openInspector}
        title="Inspect Builder.io app state"
      >
        <span className={styles.icon} aria-hidden="true">
          ⚙
        </span>
        <span>Inspect state</span>
      </button>
      {open && snapshot && (
        <div className={styles.overlay} onClick={close}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <header className={styles.header}>
              <h2>Builder.io app state snapshot</h2>
              <button type="button" className={styles.close} onClick={close}>
                ✕
              </button>
            </header>
            <p className={styles.hint}>
              Snapshot taken at {takenAt?.toLocaleTimeString()}. Click a row
              to expand, or the <code>⧉ path</code> button to copy the
              dot-path for use in your plugin code. Sensitive fields —
              API keys, auth headers, tokens, secrets, credentials, cookies,
              signatures, email, phone — are shown as <code>&lt;redacted&gt;</code>,
              and JWT/opaque token values are masked wherever they appear.
            </p>
            <div className={styles.toolbar}>
              <button
                type="button"
                className={styles.toolbarAction}
                onClick={expandAll}
              >
                Expand all
              </button>
              <button
                type="button"
                className={styles.toolbarAction}
                onClick={collapseAll}
              >
                Collapse all
              </button>
            </div>
            <div className={styles.tree}>
              <TreeNode
                node={snapshot}
                depth={0}
                expandedPaths={expandedPaths}
                onToggle={togglePath}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
