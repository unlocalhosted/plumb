/**
 * SASS · the style system for `.scss` files (docs/briefs/css-parity.md, layer 9).
 *
 * The browser only sees the compiled CSS, so a rule is found the way the browser sees it: the file is compiled with the
 * project's own `sass` (the one its build uses; plumber ships none), the compiled rule is found by selector through the
 * engine's lowering, and its declaration is mapped back to where it is written in the `.scss` source through the
 * compiler's source map. The value is changed there. A value that comes from a `$variable` offers the variable's
 * definition in the same file; one that comes from a mixin, an `@extend` or another file is said, not written.
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { lineStarts } from '../collect/source.js';
import { lowerStylesheet } from '../lower/stylesheets.js';
import type { Declaration } from '../report.js';
import { carriersOf } from './properties.js';
import { spelled } from './rules.js';
import type { Change, Edit, Evidence, Origin, StyleContext, StyleSystem } from './systems.js';

interface SassApi { compileString(source: string, options: Record<string, unknown>): { css: string; sourceMap?: { sources: string[]; mappings: string } } }
const loaded = new Map<string, SassApi | null>();
/** The project's own Sass compiler, or null when it has none. */
export function projectSass(root: string): SassApi | null {
  if (!loaded.has(root)) {
    let api: SassApi | null = null;
    for (const name of ['sass', 'sass-embedded']) { try { api = createRequire(join(root, 'package.json'))(name) as SassApi; break; } catch { /* not installed */ } }
    loaded.set(root, api);
  }
  return loaded.get(root)!;
}
/** Compile a `.scss` text as the build would; throws with the compiler's words when it doesn't compile. */
export function compileScss(root: string, file: string, text: string) {
  const sass = projectSass(root);
  if (!sass) throw new Error('This project has no sass package to read its .scss files with.');
  return sass.compileString(text, { url: pathToFileURL(file), sourceMap: true, loadPaths: [dirname(file), join(root, 'node_modules')], syntax: 'scss' });
}

const VLQ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
/** The original place of a generated (0-based line, column), from a v3 source map's mappings. */
function original(map: { sources: string[]; mappings: string }, line: number, column: number): { source: string; line: number; column: number } | null {
  let src = 0, oLine = 0, oCol = 0, best: { source: string; line: number; column: number } | null = null;
  const lines = map.mappings.split(';');
  for (let l = 0; l <= line && l < lines.length; l++) {
    let gCol = 0;
    for (const seg of lines[l]!.split(',')) {
      if (!seg) continue;
      const v: number[] = []; let n = 0, shift = 0;
      for (const ch of seg) { const d = VLQ.indexOf(ch); n += (d & 31) << shift; if (d & 32) shift += 5; else { v.push(n & 1 ? -(n >> 1) : n >> 1); n = 0; shift = 0; } }
      gCol += v[0] ?? 0;
      if (v.length >= 4) { src += v[1]!; oLine += v[2]!; oCol += v[3]!; }
      if (l === line && gCol <= column && v.length >= 4) best = { source: map.sources[src]!, line: oLine, column: oCol };
    }
  }
  return best;
}
/** A value's range from `start`: up to `;`, `}` or the line's end, without trailing space or `!important`. */
function valueFrom(text: string, start: number): { start: number; end: number } | null {
  let end = start, depth = 0;
  while (end < text.length) { const c = text[end]!; if (c === '(') depth++; else if (c === ')') depth--; else if (depth === 0 && (c === ';' || c === '}' || c === '\n')) break; end++; }
  let value = text.slice(start, end).replace(/\s*!\s*important\s*$/i, '');
  while (value.length && /\s/.test(value[value.length - 1]!)) value = value.slice(0, -1);
  return value ? { start, end: start + value.length } : null;
}
/** The value of the declaration that starts at `at` in SCSS text (its property name first). */
function scssValue(text: string, at: number): { start: number; end: number; prop: string } | null {
  const m = /^([\w-]+)\s*:\s*/.exec(text.slice(at, at + 200));
  const range = m ? valueFrom(text, at + m[0].length) : null;
  return m && range ? { ...range, prop: m[1]! } : null;
}

export const sass: StyleSystem = {
  id: 'sass',
  says: 'a Sass rule',
  async locate(evidence: Evidence, prop: string, ctx: StyleContext): Promise<Origin | null> {
    const { file, selector } = evidence;
    if (!file || !selector || !/\.scss$/.test(file) || /[/\\]node_modules[/\\]/.test(file) || !ctx.root) return null;
    const { text, hash } = await ctx.read(file);
    const name = file.split(/[/\\]/).pop()!, want = spelled(selector), carriers = carriersOf(prop);
    const said = `${want} in ${name}`;
    const no = (why: string): Origin => ({ system: 'sass', file, start: 0, end: 0, value: null, prop, hash, said, conditions: { important: false }, writable: why });
    let compiled;
    try { compiled = compileScss(ctx.root, file, text); } catch (error) { return no(error instanceof Error ? error.message : 'This .scss file does not compile.'); }
    if (!compiled.sourceMap) return no("The sass compiler gave no source map, so the place in the .scss file can't be found.");
    let lowered: Declaration[];
    try { lowered = lowerStylesheet(compiled.css, file); } catch { return null; }
    const mine = lowered.filter(d => d.when.find(c => c.kind === 'selector')?.text === want && !!d.when.find(c => c.kind === 'media') === !!evidence.media);
    const setting = mine.filter(d => carriers.includes(d.prop)).at(-1);
    if (!setting) return no(`${said} doesn't set ${prop} in a way plumber can add to yet; add it in the file.`);
    const at = original(compiled.sourceMap, setting.site.line - 1, setting.site.column - 1);
    if (!at || fileURLToPath(at.source.startsWith('file:') ? at.source : pathToFileURL(at.source)) !== file) return no(`${said} gets ${prop} from a mixin, an @extend or another file; change it there.`);
    const starts = lineStarts(text), offset = (starts[at.line] ?? 0) + at.column;
    const range = scssValue(text, offset);
    if (!range) return no(`${said} writes ${prop} in a way plumber can't read yet.`);
    const value = text.slice(range.start, range.end);
    // a value that is one $variable: the variable's definition in this file is where it is written
    const variable = /^\$([\w-]+)$/.exec(value)?.[1];
    if (variable) {
      const def = new RegExp(`(^|\\n)\\s*\\$${variable}\\s*:\\s*`).exec(text);
      const vRange = def ? valueFrom(text, def.index + def[0].length) : null;
      if (!vRange) return no(`${said} takes ${prop} from $${variable}, defined in another file; change it there.`);
      const s0 = vRange.start, e0 = vRange.end;
      return { system: 'sass', file, start: s0, end: e0, value: text.slice(s0, e0), prop, hash, said: `$${variable} in ${name} (used by ${want})`, conditions: { important: false }, writable: true };
    }
    if (/[$#]\{|\$[\w-]|@/.test(value)) return no(`${said} computes ${prop} from Sass (${value}); change it in the file.`);
    if (range.prop !== setting.prop) return no(`${said} sets ${prop} through ${range.prop}; change it in the file.`);
    return { system: 'sass', file, start: range.start, end: range.end, value, prop, hash, said, conditions: { important: /!\s*important/i.test(text.slice(range.end, range.end + 20)) }, writable: true };
  },
  encode(token: string): string | null { return /^--[\w-]+$/.test(token) ? `var(${token})` : null; },
  edit(origin: Origin, change: Change): Edit[] {
    const value = (change.token && this.encode(change.token, change.prop)) || change.value;
    return [{ file: origin.file, start: origin.start, end: origin.end, replacement: value }];
  },
};
