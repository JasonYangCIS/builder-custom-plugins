import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
  type ElementFormatType,
} from 'lexical';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { $patchStyleText, $setBlocksType } from '@lexical/selection';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from '@lexical/list';
import { TOGGLE_LINK_COMMAND } from '@lexical/link';
import styles from './LexicalRichTextEditor.module.scss';
import { useToolbarState, type BlockType } from './useToolbarState';

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const BLOCK_OPTIONS: Array<{ value: Exclude<BlockType, 'ul' | 'ol'>; label: string }> = [
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
  { value: 'quote', label: 'Quote' },
];

const ALIGN_OPTIONS: Array<{ value: Extract<ElementFormatType, 'left' | 'center' | 'right' | 'justify'>; label: string; title: string }> = [
  { value: 'left', label: '⇤', title: 'Align left' },
  { value: 'center', label: '↔', title: 'Align center' },
  { value: 'right', label: '⇥', title: 'Align right' },
  { value: 'justify', label: '≡', title: 'Justify' },
];

export function Toolbar() {
  const [editor] = useLexicalComposerContext();
  const { isBold, isItalic, isUnderline, blockType, elementFormat, canUndo, canRedo } =
    useToolbarState();

  const isList = blockType === 'ul' || blockType === 'ol';

  const applyBlockType = (next: Exclude<BlockType, 'ul' | 'ol'>) => {
    if (isList) editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      if (next === 'paragraph') {
        $setBlocksType(selection, () => $createParagraphNode());
      } else if (next === 'quote') {
        $setBlocksType(selection, () => $createQuoteNode());
      } else {
        $setBlocksType(selection, () => $createHeadingNode(next));
      }
    });
  };

  const toggleList = (listType: 'ul' | 'ol') => {
    if (blockType === listType) {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(
        listType === 'ul' ? INSERT_UNORDERED_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND,
        undefined,
      );
    }
  };

  const handleLink = () => {
    const url = window.prompt('Link URL (leave blank to remove):');
    if (url === null) return;
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, url === '' ? null : url);
  };

  const applyColor = (color: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { color });
      }
    });
  };

  return (
    <div className={styles.toolbar}>
      <button
        type="button"
        className={cx(styles.toolbarButton, !canUndo && styles.disabled)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        disabled={!canUndo}
        aria-label="Undo"
        title="Undo (Cmd/Ctrl+Z)"
      >
        ↶
      </button>
      <button
        type="button"
        className={cx(styles.toolbarButton, !canRedo && styles.disabled)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        disabled={!canRedo}
        aria-label="Redo"
        title="Redo (Cmd/Ctrl+Shift+Z)"
      >
        ↷
      </button>

      <span className={styles.divider} />

      <button
        type="button"
        className={cx(styles.toolbarButton, isBold && styles.active)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        aria-label="Bold"
        title="Bold (Cmd/Ctrl+B)"
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        className={cx(styles.toolbarButton, isItalic && styles.active)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        aria-label="Italic"
        title="Italic (Cmd/Ctrl+I)"
      >
        <em>I</em>
      </button>
      <button
        type="button"
        className={cx(styles.toolbarButton, isUnderline && styles.active)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
        aria-label="Underline"
        title="Underline (Cmd/Ctrl+U)"
      >
        <span style={{ textDecoration: 'underline' }}>U</span>
      </button>

      <label
        className={styles.colorWrapper}
        onMouseDown={(e) => e.preventDefault()}
        aria-label="Text color"
        title="Text color"
      >
        <span className={styles.colorSwatchLabel}>A</span>
        <input
          type="color"
          className={styles.colorInput}
          onChange={(e) => applyColor(e.target.value)}
        />
      </label>

      <span className={styles.divider} />

      <select
        className={styles.blockSelect}
        value={isList ? 'paragraph' : blockType}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => applyBlockType(e.target.value as Exclude<BlockType, 'ul' | 'ol'>)}
        aria-label="Block type"
      >
        {BLOCK_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <span className={styles.divider} />

      {ALIGN_OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          className={cx(styles.toolbarButton, elementFormat === o.value && styles.active)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, o.value)}
          aria-label={o.title}
          title={o.title}
        >
          {o.label}
        </button>
      ))}

      <span className={styles.divider} />

      <button
        type="button"
        className={cx(styles.toolbarButton, blockType === 'ul' && styles.active)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => toggleList('ul')}
        aria-label="Bullet list"
        title="Bullet list"
      >
        • List
      </button>
      <button
        type="button"
        className={cx(styles.toolbarButton, blockType === 'ol' && styles.active)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => toggleList('ol')}
        aria-label="Numbered list"
        title="Numbered list"
      >
        1. List
      </button>

      <span className={styles.divider} />

      <button
        type="button"
        className={styles.toolbarButton}
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleLink}
        aria-label="Insert link"
        title="Insert link"
      >
        Link
      </button>
    </div>
  );
}
