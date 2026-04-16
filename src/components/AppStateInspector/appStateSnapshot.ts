// Traverses an arbitrary object graph (typically Builder.io's `appState`)
// and returns a serializable tree that's safe to render. MobX observables
// de-reference on property access, so this produces a point-in-time snapshot.

const MAX_DEPTH = 5;
const MAX_ARRAY_ITEMS = 30;
const MAX_OBJECT_KEYS = 100;

// Normalizes camelCase and dashes to underscored lower-case so patterns can
// match consistently. `authHeaders` → `auth_headers`, `apiKey` → `api_key`.
function normalizeKey(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase().replace(/-/g, '_');
}

// Exact-match denylist of normalized key names. Most are Builder.io-specific
// (apiKey is the private server key; authHeaders carries bearer tokens).
const REDACT_EXACT = new Set<string>([
  'api_key', 'private_key', 'write_key', 'client_secret', 'app_secret',
  'auth_headers', 'auth_header', 'authorization', 'authentication',
  'access_token', 'refresh_token', 'id_token', 'csrf_token',
  'session_id', 'session_token', 'session_key',
  'email', 'email_address', 'phone', 'phone_number', 'ssn',
]);

// Word-bounded substring patterns. Boundary = start/end of the normalized
// (underscored) string or an underscore. Prevents false positives like
// `author` (contains "auth" but not a standalone word).
const REDACT_CONTAINS: RegExp[] = [
  /(^|_)token(_|$)/,
  /(^|_)secret(_|$)/,
  /(^|_)password(_|$)|(^|_)passwd(_|$)/,
  /(^|_)credential(s)?(_|$)/,
  /(^|_)signature(_|$)|(^|_)sig(_|$)/,
  /(^|_)bearer(_|$)/,
  /(^|_)jwt(_|$)/,
  /(^|_)cookie(_|$)/,
  /(^|_)auth(_|$)/,  // standalone "auth", not "author"/"authorize"/etc.
];

function shouldRedactKey(key: string): boolean {
  const normalized = normalizeKey(key);
  if (REDACT_EXACT.has(normalized)) return true;
  return REDACT_CONTAINS.some((re) => re.test(normalized));
}

// JWT shape: three base64url segments separated by dots. Catches access
// tokens even if they end up under a key our name-based rules missed.
const JWT_PATTERN = /^[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}$/;

// Opaque high-entropy tokens (40+ chars of base64url/hex without whitespace
// or punctuation beyond `-_`) — catches API-key-looking strings. We lean
// toward the conservative side: only redact if the string is ≥40 chars AND
// lacks spaces, to avoid flagging legitimate long content.
const OPAQUE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,}$/;

// HTTP Authorization header values — `Bearer xyz`, `Basic dXNlcjpwYXNz`, etc.
// Redact if we see one regardless of the surrounding key name.
const AUTH_HEADER_PATTERN = /^(Bearer|Basic|Digest|Token|Bot|APIKey|Key)\s+\S+/i;

export interface SnapshotNode {
  label: string;
  path: string;
  type: string;
  preview: string;
  children?: SnapshotNode[];
  truncated?: boolean;
}

function isMapLike(v: unknown): v is Map<unknown, unknown> {
  if (v instanceof Map) return true;
  if (!v || typeof v !== 'object') return false;
  const o = v as { get?: unknown; set?: unknown; has?: unknown; entries?: unknown };
  return (
    typeof o.get === 'function' &&
    typeof o.set === 'function' &&
    typeof o.has === 'function' &&
    typeof o.entries === 'function' &&
    Symbol.iterator in (v as object)
  );
}

function isSetLike(v: unknown): v is Set<unknown> {
  if (v instanceof Set) return true;
  return false;
}

function constructorName(v: object): string {
  try {
    return Object.getPrototypeOf(v)?.constructor?.name ?? 'Object';
  } catch {
    return 'Object';
  }
}

function stringPreview(s: string): string {
  const max = 80;
  const trimmed = s.length > max ? s.slice(0, max) + '…' : s;
  return JSON.stringify(trimmed);
}

function appendPath(parentPath: string, key: string | number): string {
  if (typeof key === 'number') return `${parentPath}[${key}]`;
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) return `${parentPath}.${key}`;
  return `${parentPath}[${JSON.stringify(key)}]`;
}

export function snapshotAppState(
  root: unknown,
  rootPath = 'appState',
): SnapshotNode {
  const visited = new WeakMap<object, string>();

  function walk(
    value: unknown,
    label: string,
    path: string,
    depth: number,
  ): SnapshotNode {
    // Key-based redaction runs first so it covers primitive values too
    // (e.g. `user.email: string`, `user.apiKey: string`).
    if (shouldRedactKey(label)) {
      return { label, path, type: 'redacted', preview: '<redacted>' };
    }

    // Primitives
    if (value === null) {
      return { label, path, type: 'null', preview: 'null' };
    }
    const t = typeof value;
    if (t === 'undefined') {
      return { label, path, type: 'undefined', preview: 'undefined' };
    }
    if (t === 'string') {
      const s = value as string;
      if (AUTH_HEADER_PATTERN.test(s)) {
        const scheme = s.match(AUTH_HEADER_PATTERN)![1];
        return {
          label,
          path,
          type: 'string',
          preview: `<redacted: ${scheme} …>`,
        };
      }
      if (JWT_PATTERN.test(s)) {
        return { label, path, type: 'string', preview: '<redacted: jwt>' };
      }
      if (OPAQUE_TOKEN_PATTERN.test(s)) {
        return { label, path, type: 'string', preview: '<redacted: opaque token>' };
      }
      return { label, path, type: 'string', preview: stringPreview(s) };
    }
    if (t === 'number' || t === 'bigint') {
      return { label, path, type: t, preview: String(value) };
    }
    if (t === 'boolean') {
      return { label, path, type: 'boolean', preview: String(value) };
    }
    if (t === 'symbol') {
      return { label, path, type: 'symbol', preview: String(value) };
    }

    // Functions
    if (t === 'function') {
      const fn = value as (...args: unknown[]) => unknown;
      const argCount = fn.length;
      const name = fn.name || '(anonymous)';
      return {
        label,
        path,
        type: 'function',
        preview: `ƒ ${name}(${argCount} arg${argCount === 1 ? '' : 's'})`,
      };
    }

    // Non-primitive: object-like
    const obj = value as object;

    // Circular reference
    const prior = visited.get(obj);
    if (prior !== undefined) {
      return { label, path, type: 'circular', preview: `↻ ${prior}` };
    }
    visited.set(obj, path);

    // Max depth
    if (depth >= MAX_DEPTH) {
      return {
        label,
        path,
        type: constructorName(obj),
        preview: `{…} max depth ${MAX_DEPTH}`,
      };
    }

    // Array
    if (Array.isArray(obj)) {
      const items = obj
        .slice(0, MAX_ARRAY_ITEMS)
        .map((v, i) => walk(v, String(i), `${path}[${i}]`, depth + 1));
      return {
        label,
        path,
        type: `Array(${obj.length})`,
        preview: obj.length === 0 ? '[]' : `[…${obj.length}]`,
        children: items,
        truncated: obj.length > MAX_ARRAY_ITEMS,
      };
    }

    // Map-like (standard Map + MobX ObservableMap)
    if (isMapLike(obj)) {
      const entries: SnapshotNode[] = [];
      let total = 0;
      try {
        for (const [k, v] of obj as Iterable<[unknown, unknown]>) {
          total++;
          if (entries.length < MAX_OBJECT_KEYS) {
            const keyStr = typeof k === 'string' ? k : String(k);
            entries.push(walk(v, keyStr, appendPath(path, keyStr), depth + 1));
          }
        }
      } catch {
        /* ignore iteration errors */
      }
      return {
        label,
        path,
        type: `${constructorName(obj)}(${total})`,
        preview: total === 0 ? '{}' : `{…${total} entries}`,
        children: entries,
        truncated: total > MAX_OBJECT_KEYS,
      };
    }

    // Set
    if (isSetLike(obj)) {
      const items: SnapshotNode[] = [];
      let total = 0;
      for (const v of obj) {
        total++;
        if (items.length < MAX_ARRAY_ITEMS) {
          items.push(walk(v, String(total - 1), `${path}[${total - 1}]`, depth + 1));
        }
      }
      return {
        label,
        path,
        type: `Set(${total})`,
        preview: total === 0 ? '{}' : `{…${total}}`,
        children: items,
        truncated: total > MAX_ARRAY_ITEMS,
      };
    }

    // Plain(-ish) object — iterate own enumerable keys. Wrap each property
    // access in try/catch because some appState getters may throw if the
    // underlying model isn't loaded yet.
    let keys: string[];
    try {
      keys = Object.keys(obj);
    } catch {
      keys = [];
    }

    const children: SnapshotNode[] = [];
    for (const key of keys.slice(0, MAX_OBJECT_KEYS)) {
      try {
        const childVal = (obj as Record<string, unknown>)[key];
        children.push(walk(childVal, key, appendPath(path, key), depth + 1));
      } catch (e) {
        children.push({
          label: key,
          path: appendPath(path, key),
          type: 'error',
          preview: `⚠ ${(e as Error)?.message ?? 'access threw'}`,
        });
      }
    }

    return {
      label,
      path,
      type: constructorName(obj),
      preview: keys.length === 0 ? '{}' : `{…${keys.length} keys}`,
      children,
      truncated: keys.length > MAX_OBJECT_KEYS,
    };
  }

  return walk(root, 'appState', rootPath, 0);
}
