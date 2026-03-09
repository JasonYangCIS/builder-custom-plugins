import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/plugin.tsx',
      formats: ['system'],
      fileName: () => 'plugin.system.js',
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        '@builder.io/react',
        '@builder.io/app-context',
        '@emotion/core',
      ],
    },
  },
  server: {
    port: 1268,
    headers: {
      'Access-Control-Allow-Private-Network': 'true',
      'Access-Control-Allow-Origin': '*',
    },
  },
});
