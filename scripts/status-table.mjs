// Shared status-table renderer used by build-all.mjs and dev-all.mjs.
// Renders a live-updating table of plugin build state to the terminal,
// using ANSI cursor controls to redraw in place on a TTY and appending
// rows when piped to a file/CI log.

const isTTY = Boolean(process.stdout.isTTY);
const wrap = (code) => (s) => (isTTY ? `\x1b[${code}m${s}\x1b[0m` : s);

export const dim = wrap('2');
export const bold = wrap('1');
export const green = wrap('32');
export const yellow = wrap('33');
export const red = wrap('31');

export const STATUS = {
  starting: { text: '○ starting', color: dim },
  building: { text: '● building', color: yellow },
  ready: { text: '✓ ready', color: green },
  error: { text: '✗ error', color: red },
};

export function createStatusTable(names) {
  const state = new Map(
    names.map((n) => [n, { status: 'starting', size: '—', time: '—' }]),
  );

  const wName = Math.max('plugin'.length, ...names.map((n) => n.length));
  const wStatus = Math.max(...Object.values(STATUS).map((s) => s.text.length));
  const wSize = 10;
  const wTime = 8;

  let lastLines = 0;

  function renderStatusCell(status) {
    const st = STATUS[status] ?? STATUS.starting;
    return st.color(st.text) + ' '.repeat(wStatus - st.text.length);
  }

  function render() {
    const rows = [];
    rows.push(
      dim(
        `  ${'plugin'.padEnd(wName)}  ${'status'.padEnd(wStatus)}  ${'size'.padStart(wSize)}  ${'time'.padStart(wTime)}`,
      ),
    );
    rows.push(
      dim(
        `  ${'─'.repeat(wName)}  ${'─'.repeat(wStatus)}  ${'─'.repeat(wSize)}  ${'─'.repeat(wTime)}`,
      ),
    );
    for (const name of names) {
      const s = state.get(name);
      rows.push(
        `  ${name.padEnd(wName)}  ${renderStatusCell(s.status)}  ${s.size.padStart(wSize)}  ${s.time.padStart(wTime)}`,
      );
    }

    if (isTTY && lastLines > 0) {
      process.stdout.write(`\x1b[${lastLines}A\x1b[0J`);
    }
    for (const row of rows) process.stdout.write(row + '\n');
    lastLines = rows.length;
  }

  function update(name, patch) {
    Object.assign(state.get(name), patch);
    render();
  }

  return { render, update, state };
}

// Parses a line of vite output and returns a state patch (or null).
// Handles: `build started`, `dist/<file>  <size>`, `built in <time>`, errors.
export function parseViteLine(raw) {
  const line = raw.trim();
  if (!line) return null;
  const patch = {};

  // Watch mode prints "build started..."; one-shot prod mode jumps straight
  // from "building client environment..." to the transform output.
  if (/build started/i.test(line) || /building client environment/i.test(line)) {
    patch.status = 'building';
  }
  const sizeMatch = line.match(/^dist\/\S+\.js\s+([\d.]+\s*[kM]?B)/);
  if (sizeMatch) {
    patch.size = sizeMatch[1].replace(/\s+/g, '');
  }
  const timeMatch = line.match(/built in\s+([\d.]+\s*m?s)/i);
  if (timeMatch) {
    patch.time = timeMatch[1].replace(/\s+/g, '');
    patch.status = 'ready';
  }
  if (/^error[: ]/i.test(line) || /Transform failed/.test(line)) {
    patch.status = 'error';
  }

  return Object.keys(patch).length ? patch : null;
}
