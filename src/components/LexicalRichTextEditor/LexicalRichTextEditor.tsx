import { useMemo, useRef } from 'react';
import { LexicalComposer, type InitialConfigType } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { $generateNodesFromDOM } from '@lexical/html';
import { $getRoot, $insertNodes, type LexicalEditor } from 'lexical';
import styles from './LexicalRichTextEditor.module.scss';
import { theme } from './theme';
import { nodes } from './nodes';
import { Toolbar } from './Toolbar';
import { HtmlSyncPlugin } from './htmlSyncPlugin';

interface LexicalRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

function seedFromHtml(editor: LexicalEditor, html: string) {
  const dom = new DOMParser().parseFromString(html, 'text/html');
  const parsed = $generateNodesFromDOM(editor, dom);
  $getRoot().select();
  $insertNodes(parsed);
}

// Seed-once strategy: the editor reads `value` only on mount via
// initialConfig.editorState. After that, the editor is the source of truth and
// Builder's echoed value prop is ignored — re-seeding on every echo would call
// editor.update() on every keystroke and steal focus from the ContentEditable.
// Content switches (different content entry / block) go through Builder's own
// unmount/remount, which triggers a fresh seed.
export function LexicalRichTextEditor({ value, onChange }: LexicalRichTextEditorProps) {
  const initialValueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const lastEmittedHtmlRef = useRef<string>('');

  const initialConfig: InitialConfigType = useMemo(
    () => ({
      namespace: 'builder-lexical-rte',
      theme,
      nodes,
      onError(error: Error) {
        console.error('[LexicalRichTextEditor]', error);
        throw error;
      },
      editorState: initialValueRef.current
        ? (editor: LexicalEditor) => seedFromHtml(editor, initialValueRef.current)
        : undefined,
    }),
    [],
  );

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={styles.container}>
        <Toolbar />
        <div className={styles.editorShell}>
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className={styles.contentEditable}
                aria-placeholder="Start typing…"
                placeholder={<div className={styles.placeholder}>Start typing…</div>}
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <ListPlugin />
          <LinkPlugin />
          <TabIndentationPlugin />
          <HtmlSyncPlugin onChangeRef={onChangeRef} lastEmittedHtmlRef={lastEmittedHtmlRef} />
        </div>
      </div>
    </LexicalComposer>
  );
}
