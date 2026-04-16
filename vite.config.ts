import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cssInjectedByJs from 'vite-plugin-css-injected-by-js';

const PLUGINS_DIR = path.resolve(__dirname, 'src/plugins');

export default defineConfig(() => {
  const name = process.env.PLUGIN_ENTRY;
  if (!name) {
    throw new Error('PLUGIN_ENTRY is not set — use npm run build or npm run dev');
  }
  const entry = path.join(PLUGINS_DIR, `${name}.tsx`);
  if (!fs.existsSync(entry)) {
    throw new Error(`Plugin entry not found: ${entry}`);
  }

  return {
    // cssInjectedByJs: bakes compiled CSS into the JS bundle and injects it
    // into the page via a <style> tag at runtime. Needed because Builder.io's
    // plugin loader only fetches the JS URL — it won't load a sibling .css file.
    plugins: [react(), cssInjectedByJs()],
    build: {
      emptyOutDir: false,
      lib: {
        entry,
        formats: ['system'] as const,
      },
      rollupOptions: {
        external: [
          'react',
          'react-dom',
          '@builder.io/react',
          '@builder.io/app-context',
          '@emotion/core',
        ],
        output: {
          // Dev mode: stable filename (no hash) so the dev server always
          // finds the latest build and dist/ doesn't accumulate stale files.
          // Production: content-hashed filename for safe CDN caching.
          entryFileNames:
            process.env.VITE_DEV_WATCH === '1'
              ? `${name}.system.js`
              : `${name}.system.[hash].js`,
        },
      },
    },
    server: {
      port: 1268,
      headers: {
        'Access-Control-Allow-Private-Network': 'true',
        'Access-Control-Allow-Origin': '*',
      },
    },
  };
});
