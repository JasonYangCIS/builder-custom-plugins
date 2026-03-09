/** @jsx jsx */
import { jsx } from '@emotion/core';
import { Builder } from '@builder.io/react';
import ReactQuill from 'react-quill';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
}

function MyCustomRichTextEditor(props: EditorProps) {
  return (
    <ReactQuill
      value={props.value}
      onChange={props.onChange}
    />
  );
}

Builder.registerEditor({
  name: 'MyCustomRichTextEditor',
  component: MyCustomRichTextEditor,
});
