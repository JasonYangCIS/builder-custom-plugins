# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Development (auto-discovers every src/plugins/*.tsx, rebuilds each on save,
# serves each at http://localhost:1268/<name>.system.js)
npm run dev

# Production build (outputs dist/<name>.system.[hash].js for each plugin)
npm run build

# Type-check only, no emit
npm run typecheck
```

Node.js version: 24 (see `.nvmrc`).

## Architecture

This repo produces **multiple Builder.io custom plugin bundles** — each a self-contained SystemJS file that registers custom UI into the Builder.io visual editor. Builder.io loads each plugin URL independently, so bundles must not share chunks.

**Key concepts:**

- **Convention-based entries:** every `*.tsx` file in `src/plugins/` is an independent plugin. The filename (minus `.tsx`) becomes the bundle name and URL path. No registration anywhere — drop a file in and it builds.
- **One Vite build per plugin:** `vite.config.ts` reads `PLUGIN_ENTRY` and builds that single entry. `scripts/build-all.mjs` and `scripts/dev-all.mjs` discover entries via `scripts/plugins.mjs` and spawn one Vite invocation per plugin so each bundle is fully self-contained (no shared vendor chunks like `jsx-runtime`, which Builder.io's loader won't resolve).
- **Output format:** SystemJS (`formats: ['system']`). Each output is hashed: `dist/<name>.system.[hash].js`.
- **Externals:** `react`, `react-dom`, `@builder.io/react`, `@builder.io/app-context`, and `@emotion/core` are excluded from the bundle — provided by Builder.io at runtime.
- **Bundler:** Vite in lib mode (Rollup under the hood). Config is in `vite.config.ts`.
- **Type checking:** `tsc --noEmit` runs before every production build. Babel is not used — Vite handles TSX natively.
- **Dev server:** `scripts/dev-server.mjs` is a minimal Node HTTP server on port 1268. It serves any plugin at `/<name>.system.js` by scanning `dist/` for the matching hashed file on each request — the plugin list is re-read per request, so new plugins appear without restarting.
- **`appState`:** `@builder.io/app-context` ships as a stub (`module.exports = {}`); Builder.io replaces it at runtime with the real `ApplicationContext`. Import it as `(_appContext as unknown as { default: ApplicationContext }).default` — see `src/components/NotesTab.tsx` for the pattern.

## Registration APIs

Two Builder.io registration APIs are used:

```ts
// Custom field editor — appears as a field type in content models
Builder.registerEditor({ name: 'MyEditor', component: MyEditorComponent });

// Right-panel tab in the content editor
Builder.register('editor.mainTab', { name: 'Tab Label', component: MyTabComponent });
```

For `editor.mainTab` components, access the currently open content entry via `appState.designerState.editingContentModel`. Its `data` property is a MobX observable `Map` — use `.get(key)` / `.set(key, value)`. Persist changes with `appState.content.update(content)`.

## Adding new plugins

1. Add your component to `src/components/`.
2. Create `src/plugins/<your-plugin>.tsx` that imports the component and calls the appropriate registration API (`Builder.registerEditor` for field editors, `Builder.register('editor.mainTab', ...)` for editor tabs).

That's it. Build/dev scripts auto-discover the new entry. It'll be served at `http://localhost:1268/<your-plugin>.system.js` in dev and output to `dist/<your-plugin>.system.[hash].js` in prod.

Untyped externals (e.g. `@emotion/core`) are declared in `src/declarations.d.ts`.
