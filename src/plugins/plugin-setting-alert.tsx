import { Builder } from '@builder.io/react';
import { PluginSettingAlert, PLUGIN_ID } from '../components/PluginSettingAlert';

const ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='9'/%3E%3Cline x1='12' y1='8' x2='12' y2='13'/%3E%3Ccircle cx='12' cy='16.5' r='0.75' fill='white' stroke='none'/%3E%3C/svg%3E";

// Settings page: Space Settings → Plugins → Edit Plugin Settings.
// The plugin URL registered there must include `?pluginId=plugin-setting-alert`
// for the "Edit Plugin Settings" button to appear.
Builder.register('plugin', {
  id: PLUGIN_ID,
  name: 'Plugin Setting Alert',
  settings: [
    {
      name: 'savedValue',
      type: 'string',
      helperText: 'Shown in an alert when the sidebar icon is opened',
    },
  ],
  ctaText: 'Save Changes',
});

// Left admin sidebar icon + page.
Builder.register('appTab', {
  name: 'Setting Alert',
  path: 'plugin-setting-alert',
  icon: ICON,
  component: PluginSettingAlert,
});
