// contents of plugin.jsx
/** @jsx jsx */
import { jsx } from '@emotion/core';
import { Builder } from '@builder.io/react';
import ReactQuill from 'react-quill';

function MyCustomRichTextEditor(props) {
  return (
    <ReactQuill
      value={props.value}
      onChange={props.onChange}
    />
  );
}

Builder.registerEditor({
  name: 'MyCustomRichTextEditor',
  component: MyCustomRichTextEditor
});