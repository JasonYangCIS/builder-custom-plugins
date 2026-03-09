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
npm start
```

`npm start` runs two processes in parallel:
- `vite build --watch` — rebuilds `dist/plugin.system.[hash].js` on every file save
- A static file server at **`http://localhost:1268/plugin.system.js`** that always serves the latest build

## Loading the Plugin in Builder.io

1. Go to your Builder.io space settings → **Plugins**
2. Click **+ Add Plugin** and enter the URL:
   - **Development:** `http://localhost:1268/plugin.system.js`
   - **Production:** your hosted URL (e.g. `https://your-cdn.com/plugin.system.abc123.js`)
3. Save and reload the Builder.io editor

> **Mixed-content note:** Builder.io's editor is served over `https://`, so browsers may block loading a plugin from `http://localhost`. Use the Builder.io desktop app, or launch Chrome with `--disable-web-security` for local dev only.

## Using the Notes Tab

Open any content entry in the visual editor. A **Notes** tab appears in the right panel. Type a note and click **Save** — it's stored in the content entry's data and persists across sessions.

## Adding a Custom Field Editor

Create a component in `src/components/` and register it in `src/plugin.tsx`:

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

The `name` becomes the field type identifier in Builder.io content models.

## Adding a Custom Editor Tab

Register a React component as a right-panel tab in the content editor:

```tsx
import * as _appContext from '@builder.io/app-context';
import type { ApplicationContext } from '@builder.io/app-context';

const appState = (_appContext as unknown as { default: ApplicationContext }).default;

function MyTab() {
  const content = appState?.designerState?.editingContentModel;
  return <div>Editing: {(content as any)?.id}</div>;
}

Builder.register('editor.mainTab', { name: 'My Tab', component: MyTab });
```

## Building for Production

```bash
npm run build
```

Output is written to `dist/plugin.system.[hash].js`. The hash is derived from the file content, so it only changes when you ship new code — safe to cache indefinitely on a CDN. Host the file and update the plugin URL in Builder.io settings.

## Project Structure

```
src/
  plugin.tsx              # Entry point — all registrations go here
  components/
    NotesTab.tsx          # editor.mainTab example
  declarations.d.ts       # Ambient types for untyped externals
scripts/
  dev-server.mjs          # Dev static file server (port 1268)
vite.config.ts            # Build configuration
tsconfig.json             # TypeScript config (noEmit — Vite handles transpilation)
```
