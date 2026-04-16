// Builds every plugin in src/plugins/ into its own self-contained bundle.
// Builder.io loads each plugin URL independently, so bundles must NOT share
// chunks — that's why we spawn one Vite build per entry. We run them in
// parallel since the table rendering keeps output clean regardless.
import { spawn } from 'child_process';
import fs from 'fs';
import { DIST_DIR, listPlugins } from './plugins.mjs';
import {
  bold,
  dim,
  red,
  createStatusTable,
  parseViteLine,
} from './status-table.mjs';

const plugins = listPlugins();
if (plugins.length === 0) {
  console.error('No plugins found in src/plugins/');
  process.exit(1);
}

fs.rmSync(DIST_DIR, { recursive: true, force: true });

process.stdout.write(`\n  ${bold('Building plugins')}\n\n`);

const table = createStatusTable(plugins);
table.render();

const started = Date.now();

const results = await Promise.all(
  plugins.map(
    (name) =>
      new Promise((resolve) => {
        const child = spawn('vite', ['build'], {
          stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env, PLUGIN_ENTRY: name },
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
        child.on('exit', (code) => {
          if (code !== 0) table.update(name, { status: 'error' });
          resolve({ name, code: code ?? 1 });
        });
      }),
  ),
);

const elapsed = ((Date.now() - started) / 1000).toFixed(2);
const failed = results.filter((r) => r.code !== 0);

process.stdout.write('\n');
if (failed.length === 0) {
  process.stdout.write(`  ${dim(`Built ${plugins.length} plugin(s) in ${elapsed}s`)}\n\n`);
  process.exit(0);
} else {
  process.stdout.write(
    `  ${red(`${failed.length} plugin(s) failed: ${failed.map((f) => f.name).join(', ')}`)}\n\n`,
  );
  process.exit(1);
}
