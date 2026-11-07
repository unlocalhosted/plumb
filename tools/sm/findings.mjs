// @ts-check
// Finding construction, stable keys (spec 6.2) and ordering (spec 5.1).
import { span } from './parse.mjs';

/**
 * @typedef {{ rule: string, level: 'error' | 'advice', file: string, line: number, column: number, endLine: number, endColumn: number,
 *   machine: string | null, key: string, message: string, fix: string }} Finding
 */

/**
 * A finding before its key ordinal is known.
 * @param {object} o
 * @param {string} o.rule @param {'error' | 'advice'} [o.level] @param {string} o.file @param {number[]} o.lines
 * @param {{ start: number, end: number }} o.node @param {string | null} o.machine @param {string} o.scope @param {string} o.detail
 * @param {string} o.message @param {string} o.fix
 */
export function finding({ rule, level = 'error', file, lines, node, machine, scope, detail, message, fix }) {
  return { rule, level, file, ...span(lines, node), machine, key: `${rule}|${file}|${scope}|${detail}|`, message, fix, _start: node.start };
}

/** Fills in the key ordinal and sorts: by file, line, column, rule, key. @param {ReturnType<typeof finding>[]} list @returns {Finding[]} */
export function finish(list) {
  const bySource = [...list].sort((a, b) => a._start - b._start || a.rule.localeCompare(b.rule));
  /** @type {Map<string, number>} */
  const counts = new Map();
  for (const f of bySource) {
    const n = (counts.get(f.key) ?? 0) + 1;
    counts.set(f.key, n);
    f.key += n;
  }
  return sortFindings(bySource.map(({ _start, ...f }) => f));
}

/** @param {Finding[]} list */
export function sortFindings(list) {
  return [...list].sort((a, b) => cmp(a.file, b.file) || a.line - b.line || a.column - b.column || cmp(a.rule, b.rule) || cmp(a.key, b.key));
}

/** @param {string} a @param {string} b */
export function cmp(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Levenshtein distance. @param {string} a @param {string} b */
export function distance(a, b) {
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

/** The three names nearest to `name`, ties by name. @param {string} name @param {string[]} names */
export function nearest(name, names) {
  return [...names].sort((a, b) => distance(name, a) - distance(name, b) || cmp(a, b)).slice(0, 3);
}

/** Lower camel case of a name: `Escape` → `escape`, `no-census` → `noCensus`, `SERVER_RESTART` → `serverRestart`. @param {string} name */
export function camel(name) {
  const parts = name.replace(/[^A-Za-z0-9]+/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'name';
  const out = parts.map((p, i) => (i === 0 ? p.toLowerCase() : p[0].toUpperCase() + p.slice(1).toLowerCase())).join('');
  return /^[a-z]/.test(out) ? out : 'x' + out;
}

/** Kebab case of a name: `FixPanel` → `fix-panel`, `fix_panel` → `fix-panel`. @param {string} name */
export function kebab(name) {
  const parts = name.replace(/[^A-Za-z0-9]+/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim().split(/\s+/).filter(Boolean);
  const out = parts.map(p => p.toLowerCase()).join('-');
  return /^[a-z]/.test(out) ? out : 'm-' + out;
}

/** @param {string[]} names */
export function listed(names) {
  return names.map(n => '`' + n + '`').join(', ');
}
