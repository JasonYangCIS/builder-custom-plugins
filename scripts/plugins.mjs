// Shared helper: discover plugin entries by scanning src/plugins/.
// Every *.tsx file in that directory becomes a separate plugin bundle.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PLUGINS_DIR = path.join(__dirname, '../src/plugins');
export const DIST_DIR = path.join(__dirname, '../dist');

export function listPlugins() {
  return fs
    .readdirSync(PLUGINS_DIR)
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => f.replace(/\.tsx$/, ''))
    .sort();
}
