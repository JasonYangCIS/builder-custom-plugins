import { useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isRootOrShadowRoot,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  SELECTION_CHANGE_COMMAND,
  type ElementFormatType,
} from 'lexical';
import { $isHeadingNode } from '@lexical/rich-text';
import { $isListNode, ListNode } from '@lexical/list';
import { $findMatchingParent, $getNearestNodeOfType, mergeRegister } from '@lexical/utils';

export type BlockType = 'paragraph' | 'h1' | 'h2' | 'h3' | 'ul' | 'ol' | 'quote';

export interface ToolbarState {
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  blockType: BlockType;
  elementFormat: ElementFormatType;
  canUndo: boolean;
  canRedo: boolean;
}

const DEFAULT: ToolbarState = {
  isBold: false,
  isItalic: false,
  isUnderline: false,
  blockType: 'paragraph',
  elementFormat: '',
  canUndo: false,
  canRedo: false,
};

export function useToolbarState(): ToolbarState {
  const [editor] = useLexicalComposerContext();
  const [state, setState] = useState<ToolbarState>(DEFAULT);

  useEffect(() => {
    const read = () => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      const anchorNode = selection.anchor.getNode();
      const topElement =
        anchorNode.getKey() === 'root'
          ? anchorNode
          : $findMatchingParent(anchorNode, (e) => {
              const parent = e.getParent();
              return parent !== null && $isRootOrShadowRoot(parent);
            }) ?? anchorNode.getTopLevelElementOrThrow();

      let blockType: BlockType = 'paragraph';
      if ($isListNode(topElement)) {
        const parentList = $getNearestNodeOfType(anchorNode, ListNode);
        const listType = parentList ? parentList.getListType() : topElement.getListType();
        blockType = listType === 'bullet' ? 'ul' : 'ol';
      } else if ($isHeadingNode(topElement)) {
        const tag = topElement.getTag();
        if (tag === 'h1' || tag === 'h2' || tag === 'h3') blockType = tag;
      } else {
        const type = topElement.getType();
        if (type === 'quote') blockType = 'quote';
      }

      const elementFormat: ElementFormatType = $isElementNode(topElement)
        ? topElement.getFormatType()
        : '';

      setState((prev) => ({
        ...prev,
        isBold: selection.hasFormat('bold'),
        isItalic: selection.hasFormat('italic'),
        isUnderline: selection.hasFormat('underline'),
        blockType,
        elementFormat,
      }));
    };

    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(read);
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          read();
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setState((prev) => (prev.canUndo === payload ? prev : { ...prev, canUndo: payload }));
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setState((prev) => (prev.canRedo === payload ? prev : { ...prev, canRedo: payload }));
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    );
  }, [editor]);

  return state;
}
