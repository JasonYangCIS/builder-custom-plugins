// Simple static file server for the built plugin bundle during development.
// Serves dist/plugin.system.js at http://localhost:1268/plugin.system.js
// with the CORS headers required by Builder.io.
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 1268;
const PLUGIN_FILE = path.join(__dirname, '../dist/plugin.system.js');

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');

  if (req.url === '/plugin.system.js') {
    if (fs.existsSync(PLUGIN_FILE)) {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      fs.createReadStream(PLUGIN_FILE).pipe(res);
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
