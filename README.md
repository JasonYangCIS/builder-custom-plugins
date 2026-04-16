# Builder.io Custom Plugins

A starter template for building custom editor plugins for [Builder.io](https://www.builder.io/). Includes two examples out of the box:

- **`MyCustomRichTextEditorWithVite`** — a custom field editor using [React Quill](https://github.com/zenoamaro/react-quill)
- **Notes tab** — a right-panel tab in the content editor that lets users save freeform notes on any content entry

## Prerequisites

- Node.js 24 (use `nvm use` to switch automatically)
- A Builder.io account and space

## Getting Started

```bash
npm install
npm run dev
```

`npm run dev` auto-discovers every `src/plugins/*.tsx` file and runs, in parallel:
- One `vite build --watch` per plugin — each rebuilds its own `dist/<name>.system.[hash].js` on save
- A static file server on port **1268** that serves each plugin at a stable URL

The two example plugins in this repo are served at:
- `http://localhost:1268/rich-text-editor.system.js`
- `http://localhost:1268/notes.system.js`

## Loading Plugins in Builder.io

Each plugin is loaded independently — repeat these steps for every bundle you want to install.

1. Go to your Builder.io space settings → **Plugins**
2. Click **+ Add Plugin** and enter the URL for one plugin:
   - **Development:** `http://localhost:1268/<name>.system.js`
   - **Production:** your hosted URL (e.g. `https://your-cdn.com/<name>.system.abc123.js`)
3. Save and reload the Builder.io editor
4. Repeat for each additional plugin

> **Mixed-content note:** Builder.io's editor is served over `https://`, so browsers may block loading a plugin from `http://localhost`. Use the Builder.io desktop app, or launch Chrome with `--disable-web-security` for local dev only.

## Using the Notes Tab

Open any content entry in the visual editor. A **Notes** tab appears in the right panel. Type a note and click **Save** — it's stored in the content entry's data and persists across sessions.

## Adding a New Plugin

Each file in `src/plugins/` becomes an independent bundle. The filename (minus `.tsx`) becomes the URL path and output filename. No registration anywhere — just drop a file in and the build/dev scripts pick it up.

### Custom Field Editor

Create `src/plugins/my-editor.tsx`:

```tsx
import { Builder } from '@builder.io/react';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
}

function MyEditor({ value, onChange }: EditorProps) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} />;
}

Builder.registerEditor({ name: 'MyEditor', component: MyEditor });
```

The registered `name` becomes the field type identifier in Builder.io content models. The plugin URL becomes `http://localhost:1268/my-editor.system.js`.

### Custom Editor Tab

Create `src/plugins/my-tab.tsx`:

```tsx
import { Builder } from '@builder.io/react';
import * as _appContext from '@builder.io/app-context';
import type { ApplicationContext } from '@builder.io/app-context';

const appState = (_appContext as unknown as { default: ApplicationContext }).default;

function MyTab() {
  const content = appState?.designerState?.editingContentModel;
  return <div>Editing: {(content as any)?.id}</div>;
}

Builder.register('editor.mainTab', { name: 'My Tab', component: MyTab });
```

For larger components, keep the JSX in `src/components/` and import it from your `src/plugins/<name>.tsx` entry — the entry file should stay small and focused on registration.

## Building for Production

```bash
npm run build
```

One file is written per plugin: `dist/<name>.system.[hash].js`. The hash is content-derived, so it only changes when you ship new code — safe to cache indefinitely on a CDN. Host each file and point the corresponding plugin entry in Builder.io settings at its URL.

Each bundle is built in its own Vite invocation so that nothing is shared between plugins — Builder.io's loader expects each URL to resolve to a fully self-contained SystemJS module.

## Project Structure

```
src/
  plugins/                # One .tsx file per plugin → one bundle per file
    rich-text-editor.tsx  # Custom field editor (React Quill)
    notes.tsx             # editor.mainTab registration
  components/             # Shared components imported by plugin entries
    NotesTab.tsx
  declarations.d.ts       # Ambient types for untyped externals
scripts/
  plugins.mjs             # listPlugins() — scans src/plugins/
  build-all.mjs           # Spawns one `vite build` per plugin
  dev-all.mjs             # Spawns one `vite build --watch` per plugin + dev server
  dev-server.mjs          # HTTP server on port 1268 serving /<name>.system.js
vite.config.ts            # Reads PLUGIN_ENTRY env var to pick which entry to build
tsconfig.json             # TypeScript config (noEmit — Vite handles transpilation)
```
