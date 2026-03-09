import { Builder } from '@builder.io/react';
import ReactQuill from 'react-quill';
import { NotesTab } from './components/NotesTab';

/** Props injected by Builder.io into every custom field editor component. */
interface EditorProps {
  /** The current field value. */
  value: string;
  /** Callback to update the field value. */
  onChange: (value: string) => void;
}

/**
 * Custom rich-text field editor using React Quill.
 *
 * Registered as the `MyCustomRichTextEditorWithVite` field type in Builder.io.
 * Select this type on any field in a content model to replace the default
 * text input with a full Quill toolbar.
 */
function MyCustomRichTextEditor(props: EditorProps) {
  return (
    <ReactQuill
      value={props.value}
      onChange={props.onChange}
    />
  );
}

Builder.registerEditor({
  name: 'MyCustomRichTextEditorWithVite',
  component: MyCustomRichTextEditor,
});

Builder.register('editor.mainTab', {
  name: 'Notes',
  component: NotesTab,
});
