// Simple static file server for the built plugin bundles during development.
// Serves each hashed dist/<name>.system.[hash].js at a stable URL:
//   http://localhost:1268/<name>.system.js
// Files are resolved on each request so hot rebuilds are picked up automatically.
import http from 'http';
import fs from 'fs';
import path from 'path';
import { DIST_DIR, listPlugins } from './plugins.mjs';

const PORT = 1268;

function findPluginFile(name) {
  try {
    // Matches both `<name>.system.js` (dev) and `<name>.system.[hash].js` (prod).
    const pattern = new RegExp(`^${name}\\.system(?:\\.[A-Za-z0-9_-]+)?\\.js$`);
    const matches = fs
      .readdirSync(DIST_DIR)
      .filter((f) => pattern.test(f))
      .map((f) => {
        const full = path.join(DIST_DIR, f);
        return { full, mtimeMs: fs.statSync(full).mtimeMs };
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs);
    return matches[0]?.full ?? null;
  } catch {
    return null;
  }
}

http
  .createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    // Dev URLs are stable, so prevent the browser / Builder.io loader
    // from caching stale plugin bundles after a rebuild.
    res.setHeader('Cache-Control', 'no-store, must-revalidate');

    const match = req.url && req.url.match(/^\/([A-Za-z0-9_-]+)\.system\.js$/);
    // Re-read the plugin list on each request so newly added plugins appear
    // without restarting the server.
    if (match && listPlugins().includes(match[1])) {
      const pluginFile = findPluginFile(match[1]);
      if (pluginFile) {
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        fs.createReadStream(pluginFile).pipe(res);
      } else {
        res.writeHead(404);
        res.end(`${match[1]} plugin not built yet — waiting for vite build...`);
      }
    } else {
      res.writeHead(404);
      res.end();
    }
  })
  .listen(PORT, () => {
    console.log(`Plugin dev server listening on http://localhost:${PORT}`);
    for (const name of listPlugins()) {
      console.log(`  http://localhost:${PORT}/${name}.system.js`);
    }
  });
