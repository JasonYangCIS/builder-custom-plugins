import { Builder } from '@builder.io/react';
import { NotesTab } from '../components/NotesTab';

Builder.register('editor.mainTab', {
  name: 'Notes',
  component: NotesTab,
});
