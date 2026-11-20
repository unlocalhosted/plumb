/**
 * RULES · the style system for plain stylesheets: a value lives in a declaration of a rule in one of your `.css` files.
 *
 * Read through the engine's own lowering (src/lower/stylesheets.ts: nesting and `&` resolved, media, layers and
 * pseudo-classes as conditions, exact sites), never a second parser. A rule is found by the selector the page saw,
 * spelled the way the lowering spells it, so `.a>.b` from the browser meets `.a > .b` in the file.
 */
import { lineStarts } from '../collect/source.js';
import { lowerStylesheet } from '../lower/stylesheets.js';
import { parseCss, selectorText } from '../lower/css.js';
import type { Declaration } from '../report.js';
import type { Change, Edit, Evidence, Origin, ReadFile, StyleSystem } from './systems.js';

/** A selector in the lowering's spelling; the text itself when it doesn't parse. */
export function spelled(selector: string): string {
  try {
    const rule = parseCss(`${selector}{}`, 'selector.css').rules[0];
    if (rule?.type === 'style' && rule.value.selectors.length === 1) return selectorText(rule.value.selectors[0]!);
  } catch { /* fall through */ }
  return selector.replace(/\s+/g, ' ').trim();
}

const selectorOf = (d: Declaration) => d.when.find(c => c.kind === 'selector')?.text;
const conditionsOf = (d: Declaration): Origin['conditions'] => {
  const at = (kind: string) => d.when.filter(c => c.kind === kind).map(c => c.text).join(' and ') || undefined;
  const media = [at('media'), at('supports'), at('container')].filter(Boolean).join(' and ') || undefined;
  const layer = at('layer'), state = at('pseudo');
  return { ...(media ? { media } : {}), ...(layer ? { layer } : {}), ...(state ? { state } : {}), important: /!\s*important\s*$/i.test(d.site.text) };
};
/** The offset of a site in its text, checked against what the site says is there. */
function offsetOf(text: string, starts: number[], d: Declaration): number | null {
  const at = (starts[d.site.line - 1] ?? -1) + d.site.column - 1;
  if (at >= 0 && text.startsWith(d.site.text, at)) return at;
  const found = text.indexOf(d.site.text);
  return found >= 0 && text.indexOf(d.site.text, found + 1) < 0 ? found : null;
}
/** The value's range inside a declaration's text: after the colon, without surrounding space or `!important`. */
function valueRange(declaration: string): [number, number] | null {
  const colon = declaration.indexOf(':');
  if (colon < 0) return null;
  const value = declaration.slice(colon + 1).replace(/\s*!\s*important\s*$/i, '');
  const lead = value.length - value.trimStart().length, end = value.trimEnd().length;
  return end > lead ? [colon + 1 + lead, colon + 1 + end] : null;
}

export const rules: StyleSystem = {
  id: 'rule',
  says: 'a CSS rule',
  async locate(evidence: Evidence, prop: string, read: ReadFile): Promise<Origin | null> {
    const { file, selector } = evidence;
    if (!file || !selector || !/\.css$/.test(file) || /[/\\]node_modules[/\\]/.test(file)) return null;
    const { text, hash } = await read(file);
    const want = spelled(selector), carriers = evidence.carriers?.length ? evidence.carriers : [prop];
    let lowered: Declaration[];
    try { lowered = lowerStylesheet(text, file); } catch { return null; }
    const mine = lowered.filter(d => d.sourceOrigin !== 'framework' && selectorOf(d) === want);
    if (!mine.length) return null;
    const starts = lineStarts(text), name = file.split(/[/\\]/).pop()!;
    // the last declaration among the property and its shorthands, as the cascade takes them within one selector;
    // a conditional one (@media, @supports) applies only sometimes and is not the base value
    const base = mine.filter(d => !conditionsOf(d).media);
    const setting = base.filter(d => carriers.includes(d.prop)).at(-1);
    if (setting) {
      const at = offsetOf(text, starts, setting), range = valueRange(setting.site.text);
      if (at === null || !range) return null;
      const conditions = conditionsOf(setting);
      // a shorthand carries it: the longhand goes right after the shorthand, where it wins
      if (setting.prop !== prop) {
        const after = at + setting.site.text.length;
        return { system: 'rule', file, start: after, end: after, value: null, prop: setting.prop, hash, said: `${want} in ${name}`, conditions, writable: true };
      }
      return { system: 'rule', file, start: at + range[0], end: at + range[1], value: text.slice(at + range[0], at + range[1]), prop, hash, said: `${want} in ${name}`, conditions, writable: true };
    }
    // set only under a condition (@media, @supports): said, not written
    const conditional = mine.filter(d => carriers.includes(d.prop)).at(-1);
    if (conditional) return { system: 'rule', file, start: 0, end: 0, value: null, prop: conditional.prop, hash, said: `${want} in ${name}`, conditions: conditionsOf(conditional), writable: `${want} in ${name} sets it only under ${conditionsOf(conditional).media}; that isn't written yet.` };
    // the rule sets something else: the property is added as its last declaration
    const last = base.at(-1);
    const at = last ? offsetOf(text, starts, last) : null;
    if (!last || at === null) return null;
    const after = at + last.site.text.length;
    return { system: 'rule', file, start: after, end: after, value: null, prop: last.prop, hash, said: `${want} in ${name}`, conditions: conditionsOf(last), writable: true };
  },
  encode(token: string): string | null {
    return /^--[\w-]+$/.test(token) ? `var(${token})` : null;
  },
  edit(origin: Origin, change: Change): Edit[] {
    const value = (change.token && this.encode(change.token, change.prop)) || change.value;
    if (origin.start === origin.end) return [{ file: origin.file, start: origin.start, end: origin.end, replacement: `; ${change.prop}: ${value}` }];
    return [{ file: origin.file, start: origin.start, end: origin.end, replacement: value }];
  },
};
