import { relative } from 'node:path';
import type { Declaration, Report } from '../report.js';
import { darkCondition } from './harvest.js';

/**
 * Light and dark pairs: an element that sets a colour for light mode and again with `dark:` is a role written out by
 * hand at every place (`text-zinc-600 dark:text-zinc-400`). The pair already holds both values of the role, so one
 * token can carry it (`--color-muted`: zinc-600, and zinc-400 under .dark), the place says `text-muted`, and the
 * theme switches by itself. Primitives stay where they are; the role is the layer on top. Reads only.
 */
export type Job = 'text' | 'surface' | 'line';
export interface PairPlace { file: string; line: number; light: string; dark: string }
export interface PairRole {
  /** The role's name, without `--color-` (`muted`, `surface-2`, `danger`). */
  name: string;
  job: Job;
  /** The colours as the classes spell them (`zinc-600`, `white`, `amber-500/15`). */
  light: string;
  dark: string;
  /** The values behind them, as the theme gives them. */
  lightValue: string;
  darkValue: string;
  /** The class the places would use instead (`text-muted`). */
  replacement: string;
  places: PairPlace[];
}
export interface DarkPairs {
  /** Places that set a colour twice, light and dark. */
  pairs: number;
  /** Pairs used at two or more places, each made one role. */
  roles: PairRole[];
  /** Pairs used at one place only: left as they are, a role for one place adds a name and removes nothing. */
  once: number;
  /** `dark:` colours with no light class beside them to pair with. */
  unpaired: number;
}

const JOB: Record<string, Job> = { color: 'text', 'background-color': 'surface', 'border-color': 'line' };
const PREFIX: Record<Job, string> = { text: 'text', surface: 'bg', line: 'border' };
const NEUTRAL = /^(slate|gray|grey|zinc|neutral|stone|white|black)\b/;
const STATUS: [RegExp, string][] = [[/^(red|rose)-/, 'danger'], [/^(green|emerald|lime)-/, 'success'], [/^(amber|yellow|orange)-/, 'warning'], [/^(sky|blue|cyan)-/, 'info']];
const NAMES: Record<Job, string[]> = { text: ['fg', 'muted', 'faint'], surface: ['surface', 'surface-2', 'sunken'], line: ['line', 'line-strong'] };
const INVERSE: Record<Job, string> = { text: 'fg-inverse', surface: 'surface-inverse', line: 'line-inverse' };

/** `hover:dark:text-zinc-100` → variants ['hover', 'dark'], utility 'text-zinc-100'. Arbitrary brackets keep their colons. */
function split(text: string): { variants: string[]; utility: string } {
  const parts: string[] = []; let depth = 0, start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '[' || c === '(') depth++;
    else if (c === ']' || c === ')') depth--;
    else if (c === ':' && depth === 0) { parts.push(text.slice(start, i)); start = i + 1; }
  }
  return { variants: parts, utility: text.slice(start) };
}
/** The colour part of a colour utility: `text-zinc-900` → `zinc-900`, `border-t-red-500/40` → `red-500/40`. */
const colourOf = (utility: string) => utility.replace(/^!/, '').replace(/^(text|bg|border(-[xytrblse])?)-/, '');
/** How dark a colour step is, 0 (white) to 1000 (black); null for a colour with no step. */
function step(colour: string): number | null {
  if (/^white\b/.test(colour)) return 0;
  if (/^black\b/.test(colour)) return 1000;
  const m = /-(\d{2,3})\b/.exec(colour);
  return m ? Number(m[1]) : null;
}
const STATE = /(^|:)(hover|active|focus|focus-visible|group-hover|peer-hover|data-\[[^\]]*\]|aria-[a-z]+):/;
const isDark = (d: Declaration) => d.when.some(condition => darkCondition.test(condition.text));

export function darkPairs(report: Report): DarkPairs {
  const path = (file: string) => relative(report.root, file).replaceAll('\\', '/');
  const colours = report.declarations.filter(d => d.origin === 'class' && JOB[d.prop] && !d.opaque && d.sourceOrigin !== 'framework');
  // light candidates by file, so each dark class looks only at its own file
  const lights = new Map<string, Declaration[]>();
  for (const d of colours) if (!isDark(d)) { const list = lights.get(d.site.file) ?? []; list.push(d); lights.set(d.site.file, list); }
  const taken = new Set<Declaration>();
  const groups = new Map<string, { job: Job; light: string; dark: string; lightValue: string; darkValue: string; places: PairPlace[] }>();
  let pairs = 0, unpaired = 0;

  for (const dark of colours) {
    if (!isDark(dark)) continue;
    const { variants, utility } = split(dark.site.text);
    if (!variants.includes('dark')) continue; // set dark by a stylesheet, not a class on the element
    const chain = variants.filter(v => v !== 'dark').join(':');
    // its twin: the same property under the same other variants, in the same component, on the same element. A class
    // list can wrap, so the nearest one within a few lines is the element's.
    const twin = (lights.get(dark.site.file) ?? [])
      .filter(l => !taken.has(l) && l.prop === dark.prop && l.site.anchor === dark.site.anchor && Math.abs(l.site.line - dark.site.line) <= 3 && split(l.site.text).variants.join(':') === chain)
      .sort((a, b) => (Math.abs(a.site.line - dark.site.line) - Math.abs(b.site.line - dark.site.line)) || (Math.abs(a.site.column - dark.site.column) - Math.abs(b.site.column - dark.site.column)))[0];
    if (!twin) { unpaired++; continue; }
    taken.add(twin); pairs++;
    const job = JOB[dark.prop]!, light = colourOf(split(twin.site.text).utility), darkColour = colourOf(utility);
    const key = `${job}|${light}|${darkColour}`; // the role is the pair; hover: and the rest are only where it is used
    let group = groups.get(key);
    if (!group) groups.set(key, group = { job, light, dark: darkColour, lightValue: twin.resolved ?? twin.value, darkValue: dark.resolved ?? dark.value, places: [] });
    group.places.push({ file: path(dark.site.file), line: dark.site.line, light: twin.site.text, dark: dark.site.text });
  }

  const kept = [...groups.values()].filter(g => g.places.length >= 2);
  const once = [...groups.values()].filter(g => g.places.length < 2).reduce((n, g) => n + g.places.length, 0);
  // names: the project's own colour names are never reused
  const taken_ = new Set(report.decisions.filter(d => d.family === 'color').map(d => d.name.replace(/^--color-/, '')));
  const claim = (base: string) => { let name = base, n = 2; while (taken_.has(name)) name = `${base}-${n++}`; taken_.add(name); return name; };
  const roles: PairRole[] = [];
  for (const job of ['text', 'surface', 'line'] as Job[]) {
    const mine = kept.filter(g => g.job === job);
    // greys by how far they sit from the page: text darkest first, surfaces and lines lightest first; a light-mode
    // text that is nearly white (or a surface nearly black) is the inverted one, on a filled control
    const greys = mine.filter(g => NEUTRAL.test(g.light) && step(g.light) !== null);
    const inverse = greys.filter(g => job === 'text' ? step(g.light)! <= 300 : step(g.light)! >= 600);
    // a surface or line shown mostly under hover or press is that state of the role, not a level of its own
    const hovered = job === 'text' ? [] : greys.filter(g => !inverse.includes(g) && g.places.filter(p => STATE.test(p.light)).length * 2 > g.places.length);
    for (const g of hovered.sort((a, b) => b.places.length - a.places.length)) roles.push(role(g, claim(`${NAMES[job][0]}-hover`)));
    // the rest by level; two pairs with the same light colour: the one used more takes the plainer name
    const plain = greys.filter(g => !inverse.includes(g) && !hovered.includes(g)).sort((a, b) => (job === 'text' ? step(b.light)! - step(a.light)! : step(a.light)! - step(b.light)!) || b.places.length - a.places.length);
    plain.forEach((g, i) => roles.push(role(g, claim(NAMES[job][i] ?? `${NAMES[job].at(-1)}-${i - NAMES[job].length + 2}`))));
    for (const g of inverse) roles.push(role(g, claim(INVERSE[job])));
    for (const g of mine.filter(g => !greys.includes(g)).sort((a, b) => b.places.length - a.places.length)) {
      const hue = STATUS.find(([re]) => re.test(g.light))?.[1] ?? g.light.replace(/-\d.*$/, '');
      roles.push(role(g, claim(job === 'text' ? hue : job === 'surface' ? `${hue}-soft` : `${hue}-line`)));
    }
  }
  return { pairs, roles: roles.sort((a, b) => b.places.length - a.places.length), once, unpaired };

  function role(g: (typeof kept)[number], name: string): PairRole {
    return { name, job: g.job, light: g.light, dark: g.dark, lightValue: g.lightValue, darkValue: g.darkValue, replacement: `${PREFIX[g.job]}-${name}`, places: g.places };
  }
}

/** The proposal's words for the pairs, or nothing when the project has none. */
export function formatDarkPairs(found: DarkPairs, table: (rows: string[][]) => string[]): string {
  if (!found.pairs) return '';
  const covered = found.roles.reduce((n, r) => n + r.places.length, 0);
  const lines = [
    '',
    `Light and dark by hand: ${found.pairs} places set a colour for light mode and again with dark:.`,
    found.roles.length
      ? `${found.roles.length} roles would carry ${covered} of them. Each place would name its job once, and the theme would switch by itself.`
      : 'No pair is used at more than one place, so no role is proposed.',
  ];
  if (found.roles.length) lines.push('', ...table([['Role', 'Light / dark', 'Places', 'Instead of'], ...found.roles.map(r => [r.replacement, `${r.light} / ${r.dark}`, String(r.places.length), `${r.places[0]!.light} ${r.places[0]!.dark}`])]));
  if (found.once) lines.push('', `${found.once} pairs are used at one place only and stay as they are.`);
  return lines.join('\n') + '\n';
}
