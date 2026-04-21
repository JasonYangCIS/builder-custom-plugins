# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Development — auto-discovers every src/plugins/*.tsx, rebuilds each on save,
# serves each at http://localhost:1268/<name>.system.js, renders a live
# status table across plugins.
npm run dev

# Production build — outputs dist/<name>.system.[hash].js for each plugin.
npm run build

# Type-check only, no emit.
npm run typecheck
```

Node.js version: 24 (see `.nvmrc`, pinned via `engines.node` in `package.json`).

## Architecture

This repo produces **multiple Builder.io custom plugin bundles** — each a self-contained SystemJS file that registers custom UI into the Builder.io visual editor. Builder.io loads each plugin URL independently, so bundles must not share chunks.

**Key concepts:**

- **Convention-based entries:** every `*.tsx` file in `src/plugins/` is an independent plugin. The filename (minus `.tsx`) becomes the bundle name and URL path. No registration in configs or scripts — drop a file in and it builds.
- **One Vite build per plugin:** `vite.config.ts` reads `PLUGIN_ENTRY` and builds that single entry. `scripts/build-all.mjs` and `scripts/dev-all.mjs` discover entries via `scripts/plugins.mjs` and spawn one Vite invocation per plugin so each bundle is fully self-contained (no shared vendor chunks like `jsx-runtime`, which Builder.io's loader won't resolve).
- **Dev vs prod filenames:** dev uses `<name>.system.js` (stable — Vite overwrites in place, set via `VITE_DEV_WATCH=1`); prod uses `<name>.system.[hash].js` for CDN caching.
- **Output format:** SystemJS (`formats: ['system']`).
- **Externals:** `react`, `react-dom`, `@builder.io/react`, `@builder.io/app-context`, and `@emotion/core` are excluded from the bundle — provided by Builder.io at runtime.
- **Bundler:** Vite in lib mode (Rollup under the hood). Config is in `vite.config.ts`.
- **Type checking:** `tsc --noEmit` runs before every production build. Babel is not used — Vite handles TSX natively.
- **Styles:** SCSS modules (`*.module.scss`). Vite's lib mode normally emits CSS to a sibling `.css` file, but Builder.io's loader only fetches the JS URL, so `vite-plugin-css-injected-by-js` bakes compiled CSS into each bundle and injects it at runtime via a `<style>` tag.
- **Dev server:** `scripts/dev-server.mjs` is a minimal Node HTTP server on port 1268. It serves any plugin at `/<name>.system.js`, picks the newest-by-mtime matching file in `dist/`, and sends `Cache-Control: no-store` so rebuilds are always picked up.
- **Build/dev orchestration:** `scripts/status-table.mjs` provides a shared live-updating status table (one row per plugin, states: starting / building / ready / error, with size + time). Both `build-all.mjs` and `dev-all.mjs` spawn Vite children with piped stdout and render into it via `parseViteLine()`.
- **`appState`:** `@builder.io/app-context` ships as a stub (`module.exports = {}`); Builder.io replaces it at runtime with the real `ApplicationContext`. Import it as `(_appContext as unknown as { default: ApplicationContext }).default` — see `src/components/NotesTab/NotesTab.tsx` for the pattern.

## Registration APIs

Three Builder.io registration APIs are used in this repo:

```ts
// Custom field editor — appears as a field type in content models
Builder.registerEditor({ name: 'MyEditor', component: MyEditorComponent });

// Right-panel tab in the content editor
Builder.register('editor.mainTab', { name: 'Tab Label', component: MyTabComponent });

// Button in the top toolbar of the visual editor (no `name`, no props)
Builder.register('editor.toolbarButton', { component: MyToolbarButtonComponent });
```

For `editor.mainTab` components, access the currently open content entry via `appState.designerState.editingContentModel`. Its `data` property is a MobX observable `Map` — use `.get(key)` / `.set(key, value)`. Persist changes with `appState.content.update(content)`.

`editor.toolbarButton` components receive no props. To reach editor state, either use `@builder.io/app-context` (preferred, same pattern as mainTab) or `window.builder.selectedElements[0]` for the currently selected block.

### Field editors: `value` / `onChange` contract

Components registered via `Builder.registerEditor` receive `{ value, onChange }`. Builder holds the stored value and **echoes it back on every `onChange` call**, so a naive controlled editor that re-initializes from `value` on each render will re-seed on every keystroke and steal focus. Follow the **seed-once** pattern used by `LexicalRichTextEditor`: capture `value` in a ref on mount, feed it to the editor's own initial-state API, then treat the editor as the source of truth. Content switches (different entry/block) go through Builder's unmount/remount, which naturally triggers a fresh seed.

For HTML-emitting field editors, **strip SCSS-module class names from the output before calling `onChange`**. Theme classes like `_ul_5e59f_156` only exist in *this* plugin's compiled CSS — if persisted, they become dead references on any site rendering the stored content. See `src/components/LexicalRichTextEditor/htmlSyncPlugin.tsx` (`cleanOutputHtml`) for the pattern (also strips Lexical's default `white-space: pre-wrap` and unwraps attribute-less `<span>`s).

Two rich-text field editors coexist in the repo: `rich-text-editor.tsx` (legacy `react-quill` wrapper, registered as `MyCustomRichTextEditorWithVite`) and `lexical-rich-text-editor.tsx` (Lexical-based replacement, registered as `LexicalRichTextEditor`). Prefer Lexical for new work. Note that `$generateHtmlFromNodes` ↔ `$generateNodesFromDOM` is not a lossless round-trip — whitespace and nested inline formatting can shift, so content originally authored in Quill may visibly change on its first save through the Lexical editor.

## Component layout

Each component lives in its own folder under `src/components/` with its TSX, its SCSS module, and an `index.ts` that re-exports the component. Helpers used by a single component (e.g. `appStateSnapshot.ts` for the inspector, or the per-concern files inside `LexicalRichTextEditor/`) live inside the same folder — split by responsibility once a component grows beyond a single file.

```
src/components/
  NotesTab/
    NotesTab.tsx
    NotesTab.module.scss
    index.ts
  AppStateInspector/
    AppStateInspector.tsx
    AppStateInspector.module.scss
    appStateSnapshot.ts
    index.ts
  LexicalRichTextEditor/
    LexicalRichTextEditor.tsx   # composer + seed-once wiring
    Toolbar.tsx                 # formatting controls
    useToolbarState.ts          # selection-driven toolbar state
    htmlSyncPlugin.tsx          # editor → onChange(html) with cleanup
    nodes.ts                    # registered Lexical node classes
    theme.ts                    # EditorThemeClasses → SCSS module classes
    LexicalRichTextEditor.module.scss
    index.ts
```

Plugin entries import via the folder: `import { NotesTab } from '../components/NotesTab'`.

## Adding new plugins

1. Create `src/components/<YourComponent>/` with `YourComponent.tsx`, `YourComponent.module.scss`, and `index.ts`.
2. Create `src/plugins/<your-plugin>.tsx` that imports the component and calls the appropriate registration API.

That's it. Build/dev scripts auto-discover the new entry. It'll be served at `http://localhost:1268/<your-plugin>.system.js` in dev and output to `dist/<your-plugin>.system.[hash].js` in prod.

Untyped externals (e.g. `@emotion/core`) and CSS-module declarations live in `src/declarations.d.ts`.
