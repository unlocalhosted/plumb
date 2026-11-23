import { relative, resolve } from 'node:path';
import type { Declaration, Report } from '../report.js';
import { darkCondition } from './harvest.js';
import { oklab } from '../rules/families.js';

/**
 * Light and dark pairs: an element that sets a colour for light mode and again with `dark:` is a role written out by
 * hand at every place (`text-zinc-600 dark:text-zinc-400`). The pair already holds both values of the role, so one
 * token can carry it (`--color-muted`: zinc-600, and zinc-400 under .dark), the place says `text-muted`, and the
 * theme switches by itself. Primitives stay where they are; the role is the layer on top. Reads only.
 */
export type Job = 'text' | 'surface' | 'line';
export interface At { line: number; column: number }
/** One element's pair: the classes as written and where each starts (1-based), so a write can check them first. */
export interface PairPlace { file: string; line: number; light: string; dark: string; lightAt: At; darkAt: At }
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
  /** Near pairs folded into this one: their colours, places, and how far each moves (OKLab ΔE, the larger of light and dark). */
  merged: { light: string; dark: string; places: number; moves: number }[];
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
  /** Near text pairs kept apart because folding them would cost contrast, with the ratio before and after. */
  refused: { light: string; dark: string; into: string; mode: 'light' | 'dark'; before: number; after: number }[];
  /** How the project turns dark: a selector (`.dark`, `[data-theme="dark"]`) or the system setting. */
  darkWhen: { selector: string } | { media: string } | null;
}

/**
 * Two pairs for the same job are one role when both their light colours and their dark colours sit within this
 * distance (OKLab ΔE). It is the colour clean-up's keep reach for greys (overlay/src/colours.js REACH.keep.grey): a
 * grey this close to a level is that level drifted, by similarity, and one fewer level is less to tell apart.
 */
export const NEAR = 0.12;
/** WCAG 2.2 SC 1.4.3: words need 4.5:1 against what is behind them. A source scan can't see the size, so body text's. */
export const TEXT_CONTRAST = 4.5;
/** OKLab to WCAG relative luminance, through linear sRGB (Björn Ottosson's OKLab matrices). */
function luminance([L, a, b]: number[]): number {
  const l = (L! + 0.3963377774 * a! + 0.2158037573 * b!) ** 3, m = (L! - 0.1055613458 * a! - 0.0638541728 * b!) ** 3, s = (L! - 0.0894841775 * a! - 1.291485548 * b!) ** 3;
  const clamp = (x: number) => Math.min(1, Math.max(0, x));
  return 0.2126 * clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s) + 0.7152 * clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s) + 0.0722 * clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
}
const contrast = (x: number[], y: number[]) => { const a = luminance(x), b = luminance(y); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
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
/** The dark variant's own condition: `:where(.dark, .dark *)` gives `.dark`; a colour-scheme media query gives itself. */
function darkWhenOf(d: Declaration): DarkPairs['darkWhen'] {
  const media = d.when.find(c => c.kind === 'media' && /prefers-color-scheme\s*:\s*dark/.test(c.text));
  if (media) return { media: media.text };
  for (const c of d.when) {
    const m = /:where\(\s*([^,()]+?)\s*,/.exec(c.text);
    if (m && darkCondition.test(m[1]!)) return { selector: m[1]!.trim() };
  }
  return null;
}
const isDark = (d: Declaration) => d.when.some(condition => darkCondition.test(condition.text));

export function darkPairs(report: Report): DarkPairs {
  const path = (file: string) => relative(report.root, file).replaceAll('\\', '/');
  const colours = report.declarations.filter(d => d.origin === 'class' && JOB[d.prop] && !d.opaque && d.sourceOrigin !== 'framework');
  // light candidates by file, so each dark class looks only at its own file
  const lights = new Map<string, Declaration[]>();
  for (const d of colours) if (!isDark(d)) { const list = lights.get(d.site.file) ?? []; list.push(d); lights.set(d.site.file, list); }
  const taken = new Set<Declaration>();
  const groups = new Map<string, { job: Job; light: string; dark: string; lightValue: string; darkValue: string; places: PairPlace[]; merged: PairRole['merged'] }>();
  let pairs = 0, unpaired = 0;
  let darkWhen: DarkPairs['darkWhen'] = null;

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
    darkWhen ??= darkWhenOf(dark);
    const job = JOB[dark.prop]!, light = colourOf(split(twin.site.text).utility), darkColour = colourOf(utility);
    const key = `${job}|${light}|${darkColour}`; // the role is the pair; hover: and the rest are only where it is used
    let group = groups.get(key);
    if (!group) groups.set(key, group = { job, light, dark: darkColour, lightValue: twin.resolved ?? twin.value, darkValue: dark.resolved ?? dark.value, places: [], merged: [] });
    group.places.push({ file: path(dark.site.file), line: dark.site.line, light: twin.site.text, dark: dark.site.text, lightAt: { line: twin.site.line, column: twin.site.column }, darkAt: { line: dark.site.line, column: dark.site.column } });
  }

  // near pairs fold into the pair used most: that is the choice the code made, the others drifted from it
  const palette = new Map(report.decisions.filter(d => d.origin === 'framework').map(d => [d.name, d.resolved ?? d.value]));
  const labOf = (colour: string) => {
    const m = /^([a-z]+(?:-\d{2,3})?)(?:\/(\d+))?$/.exec(colour);
    if (!m || m[2]) return undefined; // see-through colours are kept apart: their colour depends on what is under them
    const value = palette.get(`--color-${m[1]}`);
    return value ? oklab(value) : undefined;
  };
  const dE = (a: number[], b: number[]) => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
  type Group = { job: Job; light: string; dark: string; lightValue: string; darkValue: string; places: PairPlace[]; merged: PairRole['merged'] };
  const anchors: (Group & { labs?: [number[], number[]] })[] = [];
  // a hover colour never folds into a resting one, or the hover would stop showing
  const hover = (x: Group) => x.places.filter(p => STATE.test(p.light)).length * 2 > x.places.length;
  const byUse = [...groups.values()].sort((a, b) => b.places.length - a.places.length);
  // what words sit on: the page's main surface, the resting background pair used most (white and near-black if none)
  const main = byUse.find(g => g.job === 'surface' && !hover(g) && labOf(g.light) && labOf(g.dark) && (step(g.light) ?? 0) < 600);
  const ground: number[][] = main ? [labOf(main.light)!, labOf(main.dark)!] : [[1, 0, 0], [0.145, 0, 0]];
  // words on a filled control (a dark button in light mode) are judged on the inverse surface used most
  const fill = byUse.find(g => g.job === 'surface' && !hover(g) && labOf(g.light) && labOf(g.dark) && (step(g.light) ?? 0) >= 600);
  const inverseGround: number[][] | null = fill ? [labOf(fill.light)!, labOf(fill.dark)!] : null;
  const refused: DarkPairs['refused'] = [];
  for (const g of byUse) {
    const l = labOf(g.light), d = labOf(g.dark);
    const near = l && d ? anchors.filter(a => a.job === g.job && hover(a) === hover(g) && a.labs && dE(a.labs[0], l) <= NEAR && dE(a.labs[1], d) <= NEAR) : [];
    // words never fold into a colour that drops them below 4.5:1 where they met it, or lowers them where they didn't
    // light-mode words lighter than mid-grey (OKLab L 0.75, past zinc-400) can't be read on the page: they sit on a fill
    const under = l && l[0]! > 0.75 ? inverseGround : ground;
    const losses = (a: (typeof anchors)[number]) => g.job !== 'text' || !under ? [] : (['light', 'dark'] as const).flatMap((mode, i) => {
      const before = contrast([l!, d!][i]!, under[i]!), after = contrast(a.labs![i]!, under[i]!);
      return after < TEXT_CONTRAST && after < before ? [{ light: g.light, dark: g.dark, into: a.light + ' / ' + a.dark, mode, before: Math.round(before * 10) / 10, after: Math.round(after * 10) / 10 }] : [];
    });
    const home = near.find(a => !losses(a).length);
    if (!home && near.length) refused.push(...losses(near[0]!));
    if (home) {
      home.places.push(...g.places);
      home.merged.push({ light: g.light, dark: g.dark, places: g.places.length, moves: Math.round(Math.max(dE(home.labs![0], l!), dE(home.labs![1], d!)) * 1000) / 1000 });
    } else anchors.push({ ...g, merged: [], ...(l && d ? { labs: [l, d] as [number[], number[]] } : {}) });
  }
  const kept: Group[] = anchors.filter(g => g.places.length >= 2);
  const once = anchors.filter(g => g.places.length < 2).reduce((n, g) => n + g.places.length, 0);
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
    // a level is a light colour: pairs that share one share its name (muted, muted-2), the next colour is the next level
    const levels = [...new Set(plain.map(g => g.light))];
    plain.forEach(g => { const i = levels.indexOf(g.light); roles.push(role(g, claim(NAMES[job][i] ?? `${NAMES[job].at(-1)}-${i - NAMES[job].length + 2}`))); });
    for (const g of inverse) roles.push(role(g, claim(INVERSE[job])));
    for (const g of mine.filter(g => !greys.includes(g)).sort((a, b) => b.places.length - a.places.length)) {
      const hue = STATUS.find(([re]) => re.test(g.light))?.[1] ?? g.light.replace(/-\d.*$/, '');
      roles.push(role(g, claim(job === 'text' ? hue : job === 'surface' ? `${hue}-soft` : `${hue}-line`)));
    }
  }
  return { pairs, roles: roles.sort((a, b) => b.places.length - a.places.length), once, unpaired, refused, darkWhen };

  function role(g: (typeof kept)[number], name: string): PairRole {
    return { name, job: g.job, light: g.light, dark: g.dark, lightValue: g.lightValue, darkValue: g.darkValue, replacement: `${PREFIX[g.job]}-${name}`, places: g.places, merged: g.merged };
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
  const folds = found.roles.flatMap(r => r.merged.map(m => ({ r, m })));
  if (folds.length) {
    lines.push('', `${folds.length} near pairs fold into a role, each within ${NEAR} of it in light and in dark (the clean-up's reach for a grey that drifted):`);
    lines.push(...table([['Into', 'Was', 'Places', 'Moves by'], ...folds.map(({ r, m }) => [r.replacement, `${m.light} / ${m.dark}`, String(m.places), String(m.moves)])]));
  }
  if (found.refused.length) lines.push('', `${found.refused.length} near text pairs stay apart: folded, their words would fall below ${TEXT_CONTRAST}:1 on the surface they sit on (WCAG 1.4.3).`, ...found.refused.map(r => `  ${r.light} / ${r.dark} into ${r.into}: ${r.before}:1 to ${r.after}:1 in ${r.mode}`));
  if (found.once) lines.push('', `${found.once} pairs are used at one place only and stay as they are.`);
  return lines.join('\n') + '\n';
}

// ── writing: the roles into the theme, each place onto its role ─────────────

/** A colour as a class spells it, as CSS: `zinc-600` → `var(--color-zinc-600)`, `amber-500/15` → a 15% mix. */
function cssOf(colour: string): string | null {
  const m = /^([a-z]+(?:-\d{2,3})?)(?:\/(\d+))?$/.exec(colour);
  if (!m) return null; // an arbitrary value ([#123456]) is left to the person
  const base = `var(--color-${m[1]})`;
  return m[2] ? `color-mix(in oklab, ${base} ${m[2]}%, transparent)` : base;
}

export interface RolesPlan {
  theme: { file: string; before: string; hash: string | null; after: string; added: string[] };
  sources: { file: string; before: string; hash: string; after: string; swaps: number }[];
  roles: PairRole[];
  /** Places whose classes weren't where the reading said (the file changed, or the class is built at runtime). */
  skipped: number;
}

/** The edits that write the roles. Reads the files; writes nothing. `target`: the theme stylesheet, relative to root. */
export async function planRoles(root: string, found: DarkPairs, target: string, shape: 'theme' | 'shadcn' | 'root'): Promise<RolesPlan | { refused: string }> {
  const { readSource, readSourceIfExists } = await import('../write/source-file.js');
  if (!found.darkWhen) return { refused: 'The project’s dark mode could not be read from its dark: classes, so the roles have nowhere to switch.' };
  if (shape === 'root') return { refused: 'The project has no Tailwind theme block (@theme) for role classes like text-fg to come from.' };
  const roles = found.roles.filter(r => cssOf(r.light) && cssOf(r.dark));
  if (!roles.length) return { refused: 'No pair is used at more than one place.' };

  // the theme: light values where the theme's colours live, dark values under the project's own dark condition
  const current = await readSourceIfExists(root, resolve(root, target));
  const before = current?.text ?? '', hash = current?.hash ?? null;
  const why = (r: PairRole) => `  /* ${r.job === 'text' ? 'words' : r.job === 'surface' ? 'backgrounds' : 'borders'}: ${r.light} in light, ${r.dark} in dark, at ${r.places.length} places */`;
  const head = `/* React Plumber: light and dark roles. Each was a pair written at every place; it now switches here. */`;
  const variable = (r: PairRole) => shape === 'shadcn' ? `--${r.name}` : `--color-${r.name}`;
  const lightLines = roles.flatMap(r => [why(r), `  ${variable(r)}: ${cssOf(r.light)};`]);
  const darkLines = roles.map(r => `  ${variable(r)}: ${cssOf(r.dark)};`);
  const blocks: string[] = [head];
  if (shape === 'shadcn') blocks.push(':root {', ...lightLines, '}', '@theme inline {', ...roles.map(r => `  --color-${r.name}: var(--${r.name});`), '}');
  else blocks.push('@theme {', ...lightLines, '}');
  if ('selector' in found.darkWhen) blocks.push(`${found.darkWhen.selector} {`, ...darkLines, '}');
  else blocks.push(`@media ${found.darkWhen.media} {`, '  :root {', ...darkLines.map(l => `  ${l}`), '  }', '}');
  const after = (before.trimEnd() ? before.trimEnd() + '\n\n' : '') + blocks.join('\n') + '\n';

  // the places: the light class becomes the role, the dark: class goes
  const byFile = new Map<string, { at: At; length: number; next: string; expect: string }[]>();
  let skipped = 0;
  for (const r of roles) for (const p of r.places) {
    const lightClass = p.light, colour = colourOf(split(lightClass).utility);
    if (!lightClass.endsWith(colour)) { skipped++; continue; }
    const list = byFile.get(p.file) ?? [];
    list.push({ at: p.lightAt, length: lightClass.length, next: lightClass.slice(0, lightClass.length - colour.length) + r.name, expect: lightClass });
    list.push({ at: p.darkAt, length: p.dark.length, next: '', expect: p.dark });
    byFile.set(p.file, list);
  }
  const sources: RolesPlan['sources'] = [];
  for (const [file, edits] of byFile) {
    const source = await readSource(root, resolve(root, file));
    const lines = source.text.split('\n');
    const starts: number[] = []; let offset = 0;
    for (const line of lines) { starts.push(offset); offset += line.length + 1; }
    const located = edits.map(e => ({ ...e, index: starts[e.at.line - 1]! + e.at.column - 1 }));
    // each place's two edits stand or fall together: if either class isn't there as read, neither changes
    const ok = (e: (typeof located)[number]) => source.text.slice(e.index, e.index + e.length) === e.expect;
    const kept: typeof located = [];
    for (let i = 0; i < located.length; i += 2) { if (ok(located[i]!) && ok(located[i + 1]!)) kept.push(located[i]!, located[i + 1]!); else skipped++; }
    // a use of a shared string is read at the use, where the classes aren't written: it moves when the string does
    // a class string shared by several elements (`className={btn}`) is read once per element but written once; any
    // other overlap means the reading is wrong there, and the file is left alone
    const unique = [...new Map(kept.map(e => [`${e.index}|${e.length}`, e])).values()].sort((a, b) => b.index - a.index);
    if (unique.some((e, i) => i && e.index + e.length > unique[i - 1]!.index)) { skipped += kept.length / 2; continue; }
    let text = source.text;
    for (const e of unique) {
      let start = e.index, end = e.index + e.length;
      if (!e.next) { // a removed class takes one space with it, the one before it when there is one
        if (/[ \t]/.test(text[start - 1] ?? '')) start--; else if (/[ \t]/.test(text[end] ?? '')) end++;
      }
      text = text.slice(0, start) + e.next + text.slice(end);
    }
    if (unique.length) sources.push({ file, before: source.text, hash: source.hash, after: text, swaps: unique.filter(e => e.next).length });
  }
  return { theme: { file: target, before, hash, after, added: blocks }, sources, roles, skipped };
}

/** Writes the plan as one transaction: every file must still hold what it was planned from, or none is written. */
export async function applyRoles(root: string, plan: RolesPlan): Promise<void> {
  const { Transaction } = await import('../write/source-file.js');
  const tx = new Transaction(root);
  await tx.run(async () => {
    await tx.write(resolve(root, plan.theme.file), { expectHash: plan.theme.hash, next: plan.theme.after });
    for (const s of plan.sources) await tx.write(resolve(root, s.file), { expectHash: s.hash, next: s.after });
  });
}

export function describeRoles(plan: RolesPlan): string {
  const swaps = plan.sources.reduce((n, s) => n + s.swaps, 0);
  return [
    `+++ ${plan.theme.file}`, ...plan.theme.added.map(l => `+ ${l}`), '',
    `Wrote ${plan.roles.length} roles to ${plan.theme.file}, and moved ${swaps} class pairs in ${plan.sources.length} files onto them.`,
    ...(plan.skipped ? [`${plan.skipped} more places use a class string kept in a variable; they follow the string where it was moved, and are left as they are where it wasn’t.`] : []),
    'git diff shows every change; git checkout puts it back.',
  ].join('\n') + '\n';
}
