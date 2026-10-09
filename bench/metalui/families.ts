import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { defineDecisions } from '../../dist/index.js';
import { readCssVariables } from '../../dist/decisions/css.js';
import { familyFor } from '../../dist/decisions/index.js';

const directory = fileURLToPath(new URL('../../../metalui/', import.meta.url));
let loaded: Promise<any>;
function inputs() {
  return loaded ??= (async () => {
    const file = `${directory}tokens/tokens.json`, text = await readFile(file, 'utf8'), tokens = JSON.parse(text);
    const files = new Map();
    for (const path of ['packages/metalui/src/components/theme.css', 'packages/metalui/src/components/tokens.css', 'apps/docs/src/styles.css']) {
      const file = directory + path;
      files.set(file, { file, css: await readFile(file, 'utf8'), imports: [], sourceOrigin: 'project', reached: [] });
    }
    const raw = readCssVariables({ files, roots: [...files.keys()], notes: [] });
    const leaves = new Map<string, { value: string; why: string; path: string }>();
    function walk(object: any, path: string[] = [], inherited = '') {
      if (!object || typeof object !== 'object' || Array.isArray(object)) return;
      const why = object.$use ?? object.use ?? inherited;
      for (const [key, value] of Object.entries(object)) {
        if (key.startsWith('$')) continue;
        const parts = [...path, key];
        if (typeof value === 'string' || typeof value === 'number') leaves.set(parts.join('-').replace('-props-', '-'), { value: String(value), why, path: parts.join('.') });
        else walk(value, parts, why);
      }
    }
    walk(tokens);
    const byName = new Map(raw.map(item => [item.name, item]));
    const locations = new Map<string, number>(), starts = [0];
    for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
    const sourceLine = (offset: number) => { let lo = 0, hi = starts.length; while (lo < hi) { const mid = (lo + hi) >>> 1; if (starts[mid]! <= offset) lo = mid + 1; else hi = mid; } return lo; };
    let cursor = 0;
    const whitespace = () => { while (/\s/.test(text[cursor] ?? '') && cursor < text.length) cursor++; };
    const string = () => { const start = cursor++; while (cursor < text.length) { const c = text[cursor++]; if (c === '\\') cursor++; else if (c === '"') break; } return JSON.parse(text.slice(start, cursor)); };
    function locate(path: string[] = []) {
      whitespace();
      if (text[cursor] === '{') {
        cursor++; whitespace();
        while (text[cursor] !== '}') {
          const at = cursor, key = string(); locations.set([...path,key].join('.'), sourceLine(at)); whitespace(); cursor++;
          locate([...path,key]); whitespace(); if (text[cursor] === ',') { cursor++; whitespace(); } else break;
        }
        cursor++;
      } else if (text[cursor] === '[') {
        cursor++; whitespace(); let index = 0;
        while (text[cursor] !== ']') { locate([...path,String(index++)]); whitespace(); if (text[cursor] === ',') cursor++; else break; }
        cursor++;
      } else if (text[cursor] === '"') string();
      else { while (cursor < text.length && !/[\s,}\]]/.test(text[cursor]!)) cursor++; }
    }
    locate();
    const line = (path: string) => locations.get(path) ?? 1;
    function metadata(name: string, value: string) {
      let key = name.replace(/^--mu-r-/, 'recipes-').replace(/^--mu-/, '');
      let entry = leaves.get(key);
      if (!entry && key.startsWith('spring-')) {
        const role = key.slice(7).replace(/-(?:d|half|near|clamped)$/, '');
        return { why: tokens.springs[role]?.use ?? '', path: `springs.${role}` };
      }
      if (!entry && key.startsWith('led-')) {
        const role = key.slice(4).replace(/-(?:d|ease)$/, '');
        return { why: tokens.status.gestures[role]?.$use ?? tokens.status.gestures.$use ?? tokens.status.$use ?? '', path: `status.gestures.${role}` };
      }
      if (!entry && key.startsWith('radius-')) return { why: tokens.foundations.$use ?? '', path: `foundations.radius.${key.slice(7)}` };
      if (!entry && key.startsWith('type-')) return { why: key.startsWith('type-doc-') ? tokens.editorial.$use : tokens.foundations.$use, path: key.startsWith('type-doc-') ? 'editorial.type' : 'foundations.type' };
      if (!entry && tokens.shared[key] !== undefined) entry = leaves.get(`shared-${key}`);
      if (!entry && tokens.colorways.bone[key] !== undefined) return { why: tokens.colorways.bone.$use ?? tokens.colorways.$use ?? tokens.$description, path: `colorways.bone.${key}` };
      if (!entry) entry = leaves.get(key + '-bone');
      return { why: entry?.why ?? '', path: entry?.path ?? '' };
    }
    return { file, raw, metadata, line, tokens, byName };
  })();
}
export function familyDecisions(family: string) {
  return async () => {
    const { file, raw, metadata, line, tokens, byName } = await inputs();
    const records = new Map();
    const add = (name: string, value: string, why: string, path: string, refs = [`var(${name})`], tier: 'primitive'|'semantic' = 'semantic') => records.set(name, { family, name, value, refs, why: why ?? '', tier, source: path ? { file, line: line(path) } : byName.get(name)?.source ?? { file, line: 1 } });
    for (const item of raw.filter((i: any) => i.theme && familyFor(i.name) === family && !i.name.startsWith('--default-'))) {
      const refs = [...item.value.matchAll(/var\((--[\w-]+)/g)].map((m: RegExpMatchArray) => m[1]!);
      const name = refs[0] ?? item.name;
      const root = byName.get(name);
      const meta = metadata(name, root?.value ?? item.value);
      add(item.name, item.value, meta.why, meta.path, [`var(${item.name})`, ...refs.map((r: string) => `var(${r})`)], family === 'radius' ? 'primitive' : 'semantic');
    }
    for (const item of raw.filter((i: any) => !i.theme && i.name.startsWith('--mu-'))) {
      const v = item.value, name = item.name;
      const include = family === 'color' ? /^(?:#|(?:rgb|rgba|hsl|hwb|lab|lch|oklab|oklch|color|linear-gradient|radial-gradient|conic-gradient)\()/.test(v) : family === 'motion' ? /^(?:[-+\d.]+(?:ms|s)|(?:cubic-bezier|linear|steps)\(|ease(?:-in|-out|-in-out)?$)/.test(v) :
        family === 'type' ? /^--mu-(?:type-|sans$|mono$|pixel$)/.test(name) && !/stretch$/.test(name) :
        family === 'elevation' ? /^(?:inset\s+)?[-+.\d]+(?:px|rem|em)?\s+[-+.\d]+(?:px|rem|em)?(?:\s|$)/.test(v) :
        family === 'z' ? /(?:^|-)z$|z-index/.test(name) && /^-?\d+$/.test(v) : false;
      if (include) { const meta = metadata(name,v); add(name,v,meta.why,meta.path); }
    }
    // Radius and type aliases used directly by recipes/roles, with their authored reasons.
    if (family === 'radius') for (const [role, amount] of Object.entries(tokens.foundations.radius)) add(`--mu-radius-${role}`,`${amount}px`,tokens.foundations.$use,'foundations.radius',undefined,'primitive');
    return defineDecisions([...records.values()]);
  };
}

/** Recipe tokens encode component geometry/paint, not general theme choices.
 * Follow aliases too: --radius-field-regular-radius and --shadow-* recipe keys
 * resolve into --mu-r-*. Keep their references valid, but never recommend them
 * as equal-value replacements for unrelated authored code. */
export async function suggestibleTokens(): Promise<string[]> {
  const { raw, byName } = await inputs();
  function recipe(name: string, seen = new Set<string>()): boolean {
    if (name.startsWith('--mu-r-')) return true;
    if (seen.has(name)) return false;
    const next = new Set([...seen, name]);
    return [...(byName.get(name)?.value ?? '').matchAll(/var\((--[\w-]+)/g)].some(match => recipe(match[1]!, next));
  }
  return [...new Set(raw.map((item: any) => item.name))].filter(name => !recipe(name)).sort();
}
