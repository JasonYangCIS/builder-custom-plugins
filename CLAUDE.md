# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Development (rebuilds on save + serves at http://localhost:1268/plugin.system.js)
npm start

# Production build (outputs to dist/plugin.system.[hash].js)
npm run build

# Type-check only, no emit
npm run typecheck
```

Node.js version: 24 (see `.nvmrc`).

## Architecture

This repo is a **Builder.io custom plugin** — a self-contained bundle that registers custom UI into the Builder.io visual editor.

**Key concepts:**

- **Entry point:** `src/plugin.tsx` — imports and registers all plugin components.
- **Output format:** SystemJS (`formats: ['system']`), required by Builder.io's plugin loader. Output filename includes a content hash: `dist/plugin.system.[hash].js`.
- **Externals:** `react`, `react-dom`, `@builder.io/react`, `@builder.io/app-context`, and `@emotion/core` are excluded from the bundle — provided by Builder.io at runtime.
- **Bundler:** Vite in lib mode (Rollup under the hood). Config is in `vite.config.ts`.
- **Type checking:** `tsc --noEmit` runs before every production build. Babel is not used — Vite handles TSX natively.
- **Dev server:** `scripts/dev-server.mjs` is a minimal Node HTTP server on port 1268. It scans `dist/` for the hashed file on each request, so the URL (`/plugin.system.js`) stays stable across rebuilds during `npm start`.
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

- **Custom field editor:** add a component to `src/components/`, call `Builder.registerEditor` in `src/plugin.tsx`.
- **Editor tab:** add a component to `src/components/`, call `Builder.register('editor.mainTab', ...)` in `src/plugin.tsx`.
- **Types:** `@emotion/core` and any other untyped externals are declared in `src/declarations.d.ts`.
