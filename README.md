# Builder.io Custom Plugins

A starter template for building custom editor plugins for [Builder.io](https://www.builder.io/). Includes three examples out of the box:

- **`MyCustomRichTextEditorWithVite`** — a custom field editor using [React Quill](https://github.com/zenoamaro/react-quill)
- **Notes tab** — a right-panel tab in the content editor that lets users save freeform notes on any content entry
- **App-state inspector** — a toolbar button that opens a modal showing a snapshot of Builder.io's runtime `appState`, with collapsible tree, copyable dot-paths, and automatic redaction of tokens, API keys, auth headers, and PII. Educational tool for plugin authors.

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

The three example plugins in this repo are served at:
- `http://localhost:1268/rich-text-editor.system.js`
- `http://localhost:1268/notes.system.js`
- `http://localhost:1268/app-state-inspector.system.js`

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

### Notes tab
Open any content entry in the visual editor. A **Notes** tab appears in the right panel. Type a note and click **Save** — it's stored in the content entry's data (under the `_pluginNotes` key) and persists across sessions.

### App-state inspector
Click the **Inspect state** button in the editor's top toolbar. A modal opens showing a snapshot of `appState` as a collapsible tree. Hover any row to reveal a **⧉ path** button that copies the dot-path (e.g. `appState.designerState.editingContentModel.data`) to your clipboard. Use **Expand all** / **Collapse all** in the toolbar to toggle the whole tree.

Sensitive fields (`apiKey`, `authHeaders`, `authorization`, `*Token*`, `*Secret*`, `password`, `email`, `phone`, etc.) are shown as `<redacted>`. String values that look like JWTs, opaque tokens (40+ base64url chars), or HTTP auth-scheme values (`Bearer …`, `Basic …`, `Digest …`) are also masked wherever they appear.

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
    rich-text-editor.tsx
    notes.tsx
    app-state-inspector.tsx
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
