# Builder.io Custom Plugins

A starter template for building custom editor plugins for [Builder.io](https://www.builder.io/). Includes five examples out of the box:

- **`LexicalRichTextEditor`** — a custom field editor built on [Lexical](https://lexical.dev/) (Meta's extensible editor framework). Preferred for new work.
- **`MyCustomRichTextEditorWithVite`** — a legacy custom field editor using [React Quill](https://github.com/zenoamaro/react-quill). Kept for reference; prefer the Lexical editor above.
- **Notes tab** — a right-panel tab in the content editor that lets users save freeform notes on any content entry
- **App-state inspector** — a toolbar button that opens a modal showing a snapshot of Builder.io's runtime `appState`, with collapsible tree, copyable dot-paths, and automatic redaction of tokens, API keys, auth headers, and PII. Educational tool for plugin authors.
- **Plugin setting alert** — a left admin-sidebar tab that alerts the value saved in the plugin's own settings form. Minimal example of `Builder.register('plugin', ...)` (settings UI) plus `Builder.register('appTab', ...)` (sidebar icon + page).

## Prerequisites

- Node.js 24 (use `nvm use` to switch automatically; also pinned via `engines.node` in `package.json`)
- A Builder.io account and space

## Getting Started

```bash
npm install
npm run dev
```

`npm run dev` auto-discovers every `src/plugins/*.tsx` file and runs, in parallel:
- One `vite build --watch` per plugin, each emitting `dist/<name>.system.js` on save
- A static file server on port **1268** that serves each plugin at a stable URL
- A live status table across all plugins (one row each, updating as builds progress)

The example plugins in this repo are served at:
- `http://localhost:1268/lexical-rich-text-editor.system.js`
- `http://localhost:1268/rich-text-editor.system.js`
- `http://localhost:1268/notes.system.js`
- `http://localhost:1268/app-state-inspector.system.js`
- `http://localhost:1268/plugin-setting-alert.system.js`

The dev server sends `Cache-Control: no-store` so Builder.io's loader picks up rebuilds without a hard-reload.

## Loading Plugins in Builder.io

Each plugin is loaded independently — repeat these steps for every bundle you want to install.

1. Go to your Builder.io space settings → **Plugins**
2. Click **+ Add Plugin** and enter the URL for one plugin:
   - **Development:** `http://localhost:1268/<name>.system.js`
   - **Production:** your hosted URL (e.g. `https://your-cdn.com/<name>.system.abc123.js`)
3. Save and reload the Builder.io editor
4. Repeat for each additional plugin

> **Mixed-content note:** Builder.io's editor is served over `https://`, so browsers may block loading a plugin from `http://localhost`. Use the Builder.io desktop app, or launch Chrome with `--disable-web-security` for local dev only.

## Using the Included Plugins

### Lexical rich-text editor
Register a field of type **`LexicalRichTextEditor`** on any content model. The editor renders with a formatting toolbar (bold, italic, underline, headings, lists, links) and persists its output as HTML via Builder's `value` / `onChange` contract.

Two things worth knowing if you hack on it:

- **Seed-once input:** Builder echoes `value` back on every `onChange`. The component captures the initial `value` in a ref on mount and feeds it to Lexical's initial-state API, then treats the editor as the source of truth — a naive controlled setup would re-seed on every keystroke and steal focus. When Builder switches entries, its unmount/remount naturally triggers a fresh seed.
- **Clean HTML on save:** before handing HTML back to Builder, the editor strips this plugin's SCSS-module class names (e.g. `_ul_5e59f_156`), Lexical's default `white-space: pre-wrap` inline style, and attribute-less `<span>` wrappers. Those class names only exist in this plugin's compiled CSS, so persisting them would leave dead references on any site rendering the stored content. See `src/components/LexicalRichTextEditor/htmlSyncPlugin.tsx` for the implementation.

> **Migrating from the Quill editor:** `$generateHtmlFromNodes` ↔ `$generateNodesFromDOM` is not a lossless round-trip — whitespace and nested inline formatting can shift — so content originally authored in Quill may visibly change on its first save through the Lexical editor.

### Notes tab
Open any content entry in the visual editor. A **Notes** tab appears in the right panel. Type a note and click **Save** — it's stored in the content entry's data (under the `_pluginNotes` key) and persists across sessions.

### App-state inspector
Click the **Inspect state** button in the editor's top toolbar. A modal opens showing a snapshot of `appState` as a collapsible tree. Hover any row to reveal a **⧉ path** button that copies the dot-path (e.g. `appState.designerState.editingContentModel.data`) to your clipboard. Use **Expand all** / **Collapse all** in the toolbar to toggle the whole tree.

Sensitive fields (`apiKey`, `authHeaders`, `authorization`, `*Token*`, `*Secret*`, `password`, `email`, `phone`, etc.) are shown as `<redacted>`. String values that look like JWTs, opaque tokens (40+ base64url chars), or HTTP auth-scheme values (`Bearer …`, `Basic …`, `Digest …`) are also masked wherever they appear.

### Plugin setting alert

This plugin has its own settings form (via `Builder.register('plugin', ...)`) *and* a left-sidebar tab (via `Builder.register('appTab', ...)`), so it needs one extra step beyond the generic "Loading Plugins" instructions above:

1. Go to your Builder.io space settings → **Plugins** → **Edit** → **Add Plugin**.
2. Enter the plugin URL **with a `pluginId` query param appended** — this is required for the settings button to show up:
   - **Development:** `http://localhost:1268/plugin-setting-alert.system.js?pluginId=plugin-setting-alert`
   - **Production:** `https://your-cdn.com/plugin-setting-alert.system.[hash].js?pluginId=plugin-setting-alert`
3. Click **Save**, then reload the Builder.io app.
4. Back in **Space Settings → Plugins**, an **Edit Plugin Settings** button now appears next to this plugin's entry. Click it, enter any text in **Saved Value**, and click **Save Changes**.
5. Look for a new icon in Builder's left admin sidebar (a circled dot, alongside Content/Data/Account). Click it — it opens the plugin's tab and immediately alerts the value you saved. If you haven't saved a value yet, it alerts a reminder to do so.

## Adding a New Plugin

Each file in `src/plugins/` becomes an independent bundle. The filename (minus `.tsx`) becomes the URL path and output filename. No registration anywhere — drop a file in and the build/dev scripts pick it up.

For anything beyond a trivial component, put the component in its own folder under `src/components/<ComponentName>/` with its TSX, SCSS module, and an `index.ts` that re-exports it. The plugin entry stays small and focused on registration.

### Custom field editor

```tsx
// src/plugins/my-editor.tsx
import { Builder } from '@builder.io/react';

function MyEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} />;
}

Builder.registerEditor({ name: 'MyEditor', component: MyEditor });
```

The registered `name` becomes the field type identifier in Builder.io content models. Served at `http://localhost:1268/my-editor.system.js`.

Note on the `value` / `onChange` contract: Builder holds the stored value and echoes it back on every `onChange` call. A naive controlled editor that re-initializes from `value` on each render will re-seed on every keystroke and steal focus. For anything stateful — rich text, code editors, anything with its own cursor — use a **seed-once** pattern: capture `value` in a ref on mount, feed it to the inner editor's initial-state API, then treat the editor as the source of truth. See `src/components/LexicalRichTextEditor/LexicalRichTextEditor.tsx` for an example. If your editor emits HTML with component-scoped class names (SCSS modules, emotion, etc.), strip them before calling `onChange` so the saved markup doesn't depend on CSS that only exists inside your plugin bundle.

### Editor main tab

```tsx
// src/plugins/my-tab.tsx
import { Builder } from '@builder.io/react';
import { MyTab } from '../components/MyTab';

Builder.register('editor.mainTab', { name: 'My Tab', component: MyTab });
```

Inside `MyTab.tsx`, reach Builder's runtime state via `@builder.io/app-context`:

```tsx
import * as _appContext from '@builder.io/app-context';
import type { ApplicationContext } from '@builder.io/app-context';
const appState = (_appContext as unknown as { default: ApplicationContext }).default;

export function MyTab() {
  const content = appState?.designerState?.editingContentModel;
  return <div>Editing: {(content as any)?.id}</div>;
}
```

### Editor toolbar button

```tsx
// src/plugins/my-toolbar.tsx
import { Builder } from '@builder.io/react';
import { MyToolbarButton } from '../components/MyToolbarButton';

Builder.register('editor.toolbarButton', { component: MyToolbarButton });
```

Toolbar button components receive no props. Use `@builder.io/app-context` or `window.builder.selectedElements[0]` to reach editor state.

### Plugin settings + left sidebar tab

```tsx
// src/plugins/my-app-tab.tsx
import { Builder } from '@builder.io/react';
import { MyAppTab } from '../components/MyAppTab';

const PLUGIN_ID = 'my-app-tab';

// Adds a settings form under Space Settings → Plugins → Edit Plugin Settings
Builder.register('plugin', {
  id: PLUGIN_ID,
  name: 'My App Tab',
  settings: [{ name: 'someValue', type: 'string' }],
  ctaText: 'Save Changes',
});

// Adds an icon + page to Builder's left admin sidebar
Builder.register('appTab', {
  name: 'My App Tab',
  path: 'my-app-tab',
  icon: 'https://cdn.example.com/icon.svg', // or a data: URI
  component: MyAppTab,
});
```

Read a saved setting back via `appState.user.organization.value.settings.plugins.get(PLUGIN_ID).get('someValue')` (that `organization` property isn't in the shipped `ApplicationContext` stub type — see the `appState` note above — so cast through `any`).

For the settings button to appear in Builder.io's UI, the plugin URL registered in Space Settings → Plugins must include a `?pluginId=<id>` query param matching the `id` above (e.g. `http://localhost:1268/my-app-tab.system.js?pluginId=my-app-tab`) — otherwise Builder never associates the URL with the registered settings schema.

**If a plugin needs to call a privileged/third-party API with a real secret, don't put that secret in browser-side plugin code at all** (a plugin `settings` field, even `type: 'password'`, is just client-visible org data — no encryption, no isolation between plugins in the browser). Route the call through a backend you control instead, and authenticate the plugin → backend leg with a token your backend can independently verify against the org's existing SSO identity provider — the exact mechanics depend on their IdP/protocol, and are worth working out with whoever owns that integration. See [`src/components/PluginSettingAlert/README.md`](src/components/PluginSettingAlert/README.md#security-notes) for the full writeup, including the weaker fallback (forwarding Builder's own session credentials) and PII-handling notes.

## Styling with SCSS modules

Styles live in `*.module.scss` files next to their component. Import as:

```tsx
import styles from './MyComponent.module.scss';
// ...
<div className={styles.container}>…</div>
```

Vite's lib mode normally emits CSS to a sibling `.css` file, but Builder.io's loader only fetches the JS URL — so [vite-plugin-css-injected-by-js](https://www.npmjs.com/package/vite-plugin-css-injected-by-js) bakes the compiled CSS into each bundle and injects it at runtime via a `<style>` tag. You don't need to do anything to opt in.

## Building for Production

```bash
npm run build
```

One file is written per plugin: `dist/<name>.system.[hash].js`. The hash is content-derived, so it only changes when you ship new code — safe to cache indefinitely on a CDN. Host each file and point the corresponding plugin entry in Builder.io settings at its URL.

Each bundle is built in its own Vite invocation so that nothing is shared between plugins — Builder.io's loader expects each URL to resolve to a fully self-contained SystemJS module.

## Project Structure

```
src/
  plugins/                        # One .tsx file per plugin → one bundle per file
    lexical-rich-text-editor.tsx
    rich-text-editor.tsx
    notes.tsx
    app-state-inspector.tsx
    plugin-setting-alert.tsx
  components/                     # One folder per component
    NotesTab/
      NotesTab.tsx
      NotesTab.module.scss
      index.ts
    AppStateInspector/
      AppStateInspector.tsx
      AppStateInspector.module.scss
      appStateSnapshot.ts         # Component-local helper
      index.ts
    PluginSettingAlert/
      PluginSettingAlert.tsx
      PluginSettingAlert.module.scss
      index.ts
    LexicalRichTextEditor/
      LexicalRichTextEditor.tsx   # Composer + seed-once wiring
      Toolbar.tsx                 # Formatting controls
      useToolbarState.ts          # Selection-driven toolbar state
      htmlSyncPlugin.tsx          # Editor → onChange(html) with cleanup
      nodes.ts                    # Registered Lexical node classes
      theme.ts                    # EditorThemeClasses → SCSS module classes
      LexicalRichTextEditor.module.scss
      index.ts
  declarations.d.ts               # Ambient types (untyped externals + *.module.scss)
scripts/
  plugins.mjs                     # listPlugins() — scans src/plugins/
  build-all.mjs                   # Parallel `vite build` per plugin, live table
  dev-all.mjs                     # Parallel `vite build --watch` + dev server
  dev-server.mjs                  # HTTP server on port 1268 serving /<name>.system.js
  status-table.mjs                # Shared live-updating status table renderer
vite.config.ts                    # Reads PLUGIN_ENTRY to pick which entry to build
tsconfig.json                     # TypeScript config (noEmit — Vite handles transpilation)
```
