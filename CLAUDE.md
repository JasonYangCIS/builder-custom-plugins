# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Development server (hot reload at http://localhost:1268)
npm start

# Production build (outputs to dist/plugin.system.js)
npm run build
```

Node.js version: 24 (see `.nvmrc`).

## Architecture

This repo is a **Builder.io custom plugin** — a self-contained webpack bundle that registers custom editors into the Builder.io visual editor UI.

**Key concepts:**

- **Entry point:** `src/plugin.jsx` — all plugin logic lives here (or in files it imports).
- **Output format:** SystemJS (`libraryTarget: 'system'`), required by Builder.io's plugin loader. Output file is `dist/plugin.system.js`.
- **Externals:** `react`, `react-dom`, `@builder.io/react`, `@builder.io/app-context`, and `@emotion/core` are excluded from the bundle — they are provided by Builder.io at runtime.
- **Registration:** Plugins register custom UI components via `Builder.registerEditor({ name, component })` from `@builder.io/react`. The `name` becomes the field type used in Builder.io content models.
- **JSX pragma:** Files use `/** @jsx jsx */` with `@emotion/core`'s `jsx` instead of React's default pragma, enabling Emotion CSS-in-JS.
- **Dev server:** Runs on port 1268 with CORS headers (`Access-Control-Allow-Origin: *`) so Builder.io can load the plugin from localhost during development.

To add a new custom editor, define a React component in `src/plugin.jsx` (or a new file) and call `Builder.registerEditor` with a unique name. The plugin bundle is loaded into Builder.io by pointing a space's plugin URL to the hosted `plugin.system.js`.
