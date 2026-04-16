// Watches every plugin in src/plugins/ and serves each build at a stable URL.
// Spawns one `vite build --watch` per entry (so bundles stay self-contained),
// captures each child's output, and renders a live-updating status table
// instead of interleaving raw vite logs.
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DIST_DIR, listPlugins } from './plugins.mjs';
import {
  bold,
  dim,
  createStatusTable,
  parseViteLine,
} from './status-table.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 1268;

const plugins = listPlugins();
if (plugins.length === 0) {
  console.error('No plugins found in src/plugins/');
  process.exit(1);
}

fs.rmSync(DIST_DIR, { recursive: true, force: true });

// Fixed header — printed once above the live table.
process.stdout.write('\n');
process.stdout.write(`  ${bold('Plugin dev server')}\n\n`);
for (const name of plugins) {
  process.stdout.write(
    dim(`    · http://localhost:${PORT}/${name}.system.js\n`),
  );
}
process.stdout.write('\n');

const table = createStatusTable(plugins);
table.render();

const children = plugins.map((name) => {
  const child = spawn('vite', ['build', '--watch'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PLUGIN_ENTRY: name, VITE_DEV_WATCH: '1' },
  });
  const handle = (buf) =>
    buf
      .toString()
      .split('\n')
      .forEach((line) => {
        const patch = parseViteLine(line);
        if (patch) table.update(name, patch);
      });
  child.stdout.on('data', handle);
  child.stderr.on('data', handle);
  return child;
});

// Dev server runs silently — URLs are already shown in the header.
// stderr stays attached so a real error (e.g. EADDRINUSE) still surfaces.
children.push(
  spawn('node', [path.join(__dirname, 'dev-server.mjs')], {
    stdio: ['ignore', 'ignore', 'inherit'],
  }),
);

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  process.stdout.write('\n');
  for (const child of children) child.kill();
  process.exit(code);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
for (const child of children) {
  child.on('exit', (code) => shutdown(code ?? 0));
}
