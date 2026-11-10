#!/usr/bin/env node
// Checks every allowed colour pairing (overlay/src/pairs.js) against WCAG 2 contrast, in the light and the dark scheme,
// from the token file as it is (overlay/src/tokens.css). Exit 1 when a pair can't be seen well enough for its use.
//
//   node scripts/contrast.mjs            the table, failures first
//   node scripts/contrast.mjs --json     the same as data
import { readFileSync } from 'node:fs';
import { PAIRS, NEED } from '../overlay/src/pairs.js';

const css = readFileSync(new URL('../overlay/src/tokens.css', import.meta.url), 'utf8');
const block = (open) => {
  const at = css.indexOf(open); if (at < 0) return '';
  let depth = 0, i = css.indexOf('{', at); const start = i + 1;
  for (; i < css.length; i++) { if (css[i] === '{') depth++; else if (css[i] === '}' && --depth === 0) break; }
  return css.slice(start, i);
};
const read = (body) => new Map([...body.matchAll(/--pl-([a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const light = read(block(':host {'));
const dark = new Map([...light, ...read(block(':host([data-scheme="dark"])'))]);

const hex = (v) => { const m = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i); if (!m) return null; const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1]; return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); };
// a token's colour: follows var() to a hex; anything else (a mix, an alpha) can't be judged here and says so
const resolve = (map, name, seen = new Set()) => {
  const v = map.get(name);
  if (!v || seen.has(name)) return null;
  const ref = v.match(/^var\(--pl-([a-z0-9-]+)\)$/);
  return ref ? resolve(map, ref[1], seen.add(name)) : hex(v);
};
const lum = ([r, g, b]) => { const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const rows = [];
for (const [scheme, map] of [['light', light], ['dark', dark]]) for (const pair of PAIRS) {
  const fg = resolve(map, pair.fg), bg = resolve(map, pair.bg);
  const got = fg && bg ? ratio(fg, bg) : null;
  rows.push({ scheme, ...pair, ratio: got === null ? null : Math.round(got * 100) / 100, wants: NEED[pair.need], ok: got === null ? null : got >= NEED[pair.need] });
}
const failed = rows.filter((r) => r.ok === false), unknown = rows.filter((r) => r.ok === null);
if (process.argv.includes('--json')) console.log(JSON.stringify({ pairs: rows, failed: failed.length, unknown: unknown.length }, null, 2));
else {
  const line = (r) => `${r.ok === false ? 'FAIL' : r.ok ? ' ok ' : ' ?? '}  ${r.scheme.padEnd(5)}  ${(`--pl-${r.fg}`).padEnd(20)} on ${(`--pl-${r.bg}`).padEnd(20)} ${r.ratio === null ? '  n/a' : String(r.ratio.toFixed(2)).padStart(5)} : 1  (needs ${r.wants})  ${r.use}`;
  for (const r of [...failed, ...unknown, ...rows.filter((r) => r.ok)]) console.log(line(r));
  console.log(`\n${rows.length} pairs: ${rows.length - failed.length - unknown.length} ok, ${failed.length} fail, ${unknown.length} not judged`);
}
process.exit(failed.length ? 1 : 0);
