import { Builder } from '@builder.io/react';
import { AppStateInspector } from '../components/AppStateInspector';

Builder.register('editor.toolbarButton', {
  component: AppStateInspector,
});
