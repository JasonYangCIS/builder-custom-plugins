# Plugin Setting Alert

A minimal reference implementation showing how a Builder.io plugin can:

1. Expose its own configuration field in Builder's admin UI (**Space Settings → Plugins**)
2. Add a custom icon + page to Builder's left admin sidebar
3. Read the saved configuration value back out at runtime from the browser

It's intentionally small — the goal is to demonstrate the mechanism cleanly, not to ship a finished feature.

## What it does

- Adds a **Setting Alert** entry to Space Settings → Plugins, with one field: **Saved Value**.
- Adds a new icon to Builder's left admin sidebar. Clicking it opens a page that reads the saved value back out and shows it in a browser `alert()`.
- Also demonstrates (as a mock — no network call is made) how the plugin could forward the admin's existing Builder session credentials to a backend proxy, as a template for calling privileged third-party APIs safely. See **Security notes** below.

## How it's wired up

Two Builder registration calls, in [`src/plugins/plugin-setting-alert.tsx`](../../plugins/plugin-setting-alert.tsx):

```tsx
// Gives the plugin a settings form in Space Settings → Plugins
Builder.register('plugin', {
  id: PLUGIN_ID,
  name: 'Plugin Setting Alert',
  settings: [{ name: 'savedValue', type: 'string', helperText: '...' }],
  ctaText: 'Save Changes',
});

// Adds the icon + page to the left admin sidebar
Builder.register('appTab', {
  name: 'Setting Alert',
  path: 'plugin-setting-alert',
  icon: ICON,
  component: PluginSettingAlert,
});
```

The component ([`PluginSettingAlert.tsx`](./PluginSettingAlert.tsx)) reads the saved value from `appState.user.organization.value.settings.plugins.get(PLUGIN_ID)` — the same store Builder's settings form writes to.

## Setting it up in Builder.io

1. Build/serve the plugin (see the repo root [README](../../../README.md) for `npm run dev` / `npm run build`).
2. In Builder.io, go to **Space Settings → Plugins → Edit → Add Plugin**, and enter the plugin URL **with a `pluginId` query param appended** — this is required for the settings button to appear:
   - Dev: `http://localhost:1268/plugin-setting-alert.system.js?pluginId=plugin-setting-alert`
   - Prod: `https://your-cdn.com/plugin-setting-alert.system.[hash].js?pluginId=plugin-setting-alert`
3. Save, then reload the Builder.io app.
4. Back in **Space Settings → Plugins**, click **Edit Plugin Settings** next to the new entry, enter a value in **Saved Value**, and click **Save Changes**.
5. Look for the new icon in the left admin sidebar. Clicking it alerts the saved value.

## Security notes

This is a **reference pattern**, not a hardened secrets solution. Worth calling out explicitly, since the settings field here is stored in plain client-visible org settings:

- **`type: 'password'` (used on similar fields elsewhere in this repo) only masks the input box** — it does not encrypt storage. Any value saved this way is readable by anyone with access to that value in the browser (devtools, any other plugin loaded in the same admin session, general org-settings payloads).
- **There's no isolation between plugins in the browser.** Every plugin bundle Builder loads runs in the same page, sharing the same `appState`. A value saved by one plugin's settings form is technically readable by any other plugin's code running in that session.
- **If a value needs real confidentiality** (a third-party API key with write/billing/elevated privileges), don't store or use it directly in browser-side plugin code at all. Route the actual privileged call through a backend you control:
  - The plugin sends an authenticated request to your proxy, forwarding Builder's own session credentials (`appState.user.apiKey`, `appState.user.authHeaders`) — see the mock request built in `PluginSettingAlert.tsx` for the shape of this.
  - Your proxy validates those credentials against Builder's own API before doing anything.
  - Only your proxy — never the browser — holds the real privileged secret, and it attaches that secret server-side when calling the actual upstream API.
- Builder also has a dedicated **Private Keys** feature (`appState.globalState.getPluginPrivateKey(pluginId)`), which is better administered (org-admin-gated, not bundled into general settings) but still hands the raw value to browser JS once called — so it doesn't remove the need for a proxy if the key must never touch the browser.

## Files

```
src/components/PluginSettingAlert/
  PluginSettingAlert.tsx          # Sidebar-tab component: reads the saved setting, alerts it,
                                   # and renders a mock (no-network) authenticated-proxy request
  PluginSettingAlert.module.scss
  index.ts
src/plugins/
  plugin-setting-alert.tsx        # Builder.register('plugin', ...) + Builder.register('appTab', ...)
```
