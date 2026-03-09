# Builder.io Custom Plugins

A starter template for building custom editor plugins for [Builder.io](https://www.builder.io/). This example registers a custom rich text editor using [React Quill](https://github.com/zenoamaro/react-quill).

## Prerequisites

- Node.js 24 (use `nvm use` to switch automatically)
- A Builder.io account and space

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm start
```

The plugin will be served at `http://localhost:1268/plugin.system.js`.

## Loading the Plugin in Builder.io

1. Go to your Builder.io space settings → **Plugins**.
2. Add the plugin URL:
   - **Development:** `http://localhost:1268/plugin.system.js`
   - **Production:** your hosted URL
3. Save and reload the Builder.io editor — your custom editors will appear as field type options in content models.

## Adding a Custom Editor

Open `src/plugin.jsx` and register a new editor component:

```jsx
/** @jsx jsx */
import { jsx } from '@emotion/core';
import { Builder } from '@builder.io/react';

function MyCustomEditor(props) {
  return (
    <input
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
    />
  );
}

Builder.registerEditor({
  name: 'MyCustomEditor',
  component: MyCustomEditor,
});
```

The `name` you provide becomes the field type identifier in Builder.io content models.

## Building for Production

```bash
npm run build
```

Output is written to `dist/plugin.system.js`. Host this file on any static file server or CDN, then point your Builder.io plugin URL to it.

## Project Structure

```
src/
  plugin.jsx       # Entry point — register all custom editors here
dist/
  plugin.system.js # Production bundle (SystemJS format)
webpack.config.js  # Build configuration
```
