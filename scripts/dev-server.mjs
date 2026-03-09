// Simple static file server for the built plugin bundle during development.
// Serves the hashed dist/plugin.system.[hash].js at a stable URL:
//   http://localhost:1268/plugin.system.js
// The file is resolved on each request so hot rebuilds are picked up automatically.
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, '../dist');
const PORT = 1268;

function findPluginFile() {
  try {
    const file = fs.readdirSync(DIST_DIR).find(f => /^plugin\.system\.[a-f0-9]+\.js$/.test(f));
    return file ? path.join(DIST_DIR, file) : null;
  } catch {
    return null;
  }
}

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');

  if (req.url === '/plugin.system.js') {
    const pluginFile = findPluginFile();
    if (pluginFile) {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      fs.createReadStream(pluginFile).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Plugin not built yet — waiting for vite build...');
    }
  } else {
    res.writeHead(404);
    res.end();
  }
}).listen(PORT, () => {
  console.log(`Plugin served at http://localhost:${PORT}/plugin.system.js`);
});
