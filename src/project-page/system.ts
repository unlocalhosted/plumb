import { basename, relative } from 'node:path';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Report } from '../report.js';
import { causesOf } from '../causes.js';
import type { Cause } from '../causes.js';
import { sayCause } from '../say-cause.js';

/**
 * The data the project page draws: for each scale (text size, weight, radius, colour) the theme's steps with how many
 * places use them, and the values written by hand, grouped by what they resolve to, each with the step it sits nearest
 * and how it was written. A port of docs/design/prototypes/data/extract-system.py; the output has the same shape as
 * docs/design/prototypes/data/crafting-ui.json, plus `causes`.
 *
 * It reads the resolved declarations, not the findings: a finding is one class as written, so `text-[11px]` and
 * `text-[0.6875rem]` would be two findings for one value.
 */
export interface Written { text: string; n: number }
export interface Step { name: string; px: number; uses: number }
export interface Stray { px: number; places: number; scaled: number; near: string | null; copy: boolean; written: Written[] }
export interface ColourStep { name: string; css: string; uses: number }
export interface ColourStray { css: string; places: number; near: string | null; distance: number | null; alpha: string | null; written: Written[] }
export interface SystemData {
  project: string;
  files: number;
  size: { steps: Step[]; strays: Stray[] };
  radius: { steps: Step[]; strays: Stray[] };
  weight: { used: { weight: number; places: number; written: Written[] }[] };
  colour: { steps: ColourStep[]; strays: ColourStray[] };
  dead: { class: string; places: number; meant: string[] }[];
  /** The three biggest causes, biggest first, in the terminal's words. */
  causes: PageCause[];
  /** How many causes there are in all. */
  open: number;
}
/** A cause as the page draws it: the terminal's sentence, how it was written, and its places by file, busiest first. */
export interface PageCause {
  id: string;
  family: string;
  label: string;
  value: string;
  said: string;
  count: number;
  rendersNothing: number;
  spellings: Cause['spellings'];
  suggestion: { name: string; exact: boolean } | null;
  files: { file: string; places: { line: number; text: string; rendersNothing: boolean }[] }[];
}

function pageCause(cause: Cause, report: Report): PageCause {
  const files = new Map<string, PageCause['files'][number]['places']>();
  for (const p of cause.places) {
    // a path from the project's folder: what a person reads, and nothing about the machine leaves it
    const file = relative(report.root, p.file).replaceAll('\\', '/');
    const list = files.get(file) ?? [];
    list.push({ line: p.line, text: p.text, rendersNothing: p.rendersNothing });
    files.set(file, list);
  }
  return {
    id: cause.id, family: cause.family, label: cause.label, value: cause.value, said: sayCause(cause, report),
    count: cause.count, rendersNothing: cause.rendersNothing, spellings: cause.spellings,
    suggestion: cause.suggestion ? { name: cause.suggestion.name, exact: cause.suggestion.exact } : null,
    files: [...files].map(([file, places]) => ({ file, places })).sort((a, b) => b.places.length - a.places.length || a.file.localeCompare(b.file)),
  };
}

type Decl = Report['declarations'][number] & { decisionRefs?: string[] };
type Dec = Report['decisions'][number];

const round = (n: number, digits: number): number => Number(n.toFixed(digits));
const str = (value: unknown): string => value === undefined || value === null ? 'None' : String(value);

function px(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  const v = String(value).trim();
  let m = /^(-?[\d.]+)(px|rem)?$/.exec(v);
  if (m) { const n = Number(m[1]); return Number.isNaN(n) ? null : round(n * (m[2] === 'rem' ? 16 : 1), 3); }
  // scaled text: calc(var(--z) * 15px) or calc(15px * var(--z)), drawn at its designed size
  m = /([\d.]+)(px|rem)\s*\*\s*var\(--z\)|var\(--z\)\s*\*\s*([\d.]+)(px|rem)/.exec(v);
  if (m) {
    const [n, unit] = m[1] ? [m[1], m[2]] : [m[3]!, m[4]];
    const x = Number(n); return Number.isNaN(x) ? null : round(x * (unit === 'rem' ? 16 : 1), 3);
  }
  return null;
}
const scaled = (d: Decl): boolean => str(d.value ?? '').includes('var(--z)');
// the tokens a declaration reads: its own var() refs and, for a utility class, the theme token behind it
const refs = (d: Decl): string[] => [...d.refs ?? [], ...d.decisionRefs ?? []];

type Lab = [number, number, number];
// colour as OKLab, to find the theme colour a hand-written one sits nearest (and exact copies)
function oklab(input: string): Lab | null {
  const css = input.trim().toLowerCase();
  let m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/.exec(css) ?? /^#([0-9a-f]{3})$/.exec(css);
  if (m) {
    let h = m[1]!; if (h.length === 3) h = [...h].map(c => c + c).join('');
    const rgb = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
    const lin = rgb.map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4) as [number, number, number];
    let l = 0.4122214708 * lin[0] + 0.5363325363 * lin[1] + 0.0514459929 * lin[2];
    let m_ = 0.2119034982 * lin[0] + 0.6806995451 * lin[1] + 0.1073969566 * lin[2];
    let s_ = 0.0883024619 * lin[0] + 0.2817188376 * lin[1] + 0.6299787005 * lin[2];
    l = l ** (1 / 3); m_ = m_ ** (1 / 3); s_ = s_ ** (1 / 3);
    return [0.2104542553 * l + 0.7936177850 * m_ - 0.0040720468 * s_, 1.9779984951 * l - 2.4285922050 * m_ + 0.4505937099 * s_, 0.0259040371 * l + 0.7827717662 * m_ - 0.8086757660 * s_];
  }
  m = /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*(?:\/\s*[\d.%]+)?\s*\)$/.exec(css);
  if (m) {
    const L = Number(m[1]) / (m[2] ? 100 : 1), C = Number(m[3]), H = Number(m[4]) * Math.PI / 180;
    return [L, C * Math.cos(H), C * Math.sin(H)];
  }
  return null;
}
function alpha(css: string): string | null {
  const m = /\/\s*([\d.]+%?)\s*\)$/.exec(css) ?? /^#[0-9a-f]{6}([0-9a-f]{2})$/.exec(css.toLowerCase());
  return m ? m[1]! : null;
}
function opacity(css: string): number {
  const a = alpha(css);
  if (!a) return 1;
  return /^[0-9a-f]{2}$/.test(a) ? parseInt(a, 16) / 255 : a.endsWith('%') ? Number(a.slice(0, -1)) / 100 : Number(a);
}

/** The three ways it was written most often; ties keep the order they were first seen in (a Counter's most_common). */
function top(counter: Map<string, number>): Written[] {
  return [...counter].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([text, n]) => ({ text, n }));
}
const bump = (counter: Map<string, number>, key: string) => counter.set(key, (counter.get(key) ?? 0) + 1);

export function systemOf(report: Report): SystemData {
  const decls = report.declarations as Decl[];
  const decisions = report.decisions.filter((d: Dec) => d.origin === 'project');

  function scale(prefix: string, props: Set<string>, least = 0): { steps: Step[]; strays: Stray[] } {
    const steps = new Map<string, Step>();
    for (const d of decisions) {
      if (!d.name.startsWith(prefix) || d.name.slice(prefix.length).includes('--')) continue;
      const value = px(d.resolved || d.value);
      if (value !== null) steps.set(d.name, { name: d.name.slice(2), px: value, uses: 0 });
    }
    const strays = new Map<number, { places: number; written: Map<string, number>; scaled: number }>();
    for (const d of decls) {
      if (!props.has(d.prop)) continue;
      const ref = refs(d).find(r => steps.has(r));
      if (ref) { steps.get(ref)!.uses++; continue; }
      const value = !scaled(d) ? px(d.resolved) : px(d.value);
      // below `least` is a unit artifact (a unitless or em value read as px), not a size anyone set
      if (value === null || value < Math.max(least, 0.01)) continue;
      const s = strays.get(value) ?? { places: 0, written: new Map(), scaled: 0 };
      strays.set(value, s);
      s.places++; bump(s.written, d.site.text);
      if (scaled(d)) s.scaled++;
    }
    const ordered = [...steps.values()].sort((a, b) => a.px - b.px);
    const out: Stray[] = [];
    for (const [value, s] of strays) {
      let near: Step | undefined;
      for (const step of ordered) if (!near || Math.abs(step.px - value) < Math.abs(near.px - value)) near = step;
      out.push({ px: value, places: s.places, scaled: s.scaled, near: near ? near.name : null,
        copy: near !== undefined && Math.abs(near.px - value) < 0.01, written: top(s.written) });
    }
    return { steps: ordered, strays: out.sort((a, b) => a.px - b.px) };
  }

  function weights(): SystemData['weight'] {
    const own = new Map<number, number>(), other = new Map<number, number>(), written = new Map<number, Map<string, number>>();
    const theme = new Set(decisions.filter(d => d.name.startsWith('--font-weight-')).map(d => d.name));
    for (const d of decls) {
      if (d.prop !== 'font-weight') continue;
      const w = d.resolved || d.value;
      if (!/^\d{3}$/.test(str(w))) continue;
      const n = Number(w);
      // a weight from the theme the project wrote, or one Tailwind ships: the theme here only restates Tailwind's names,
      // so every weight in use is counted, marked by where it came from
      const mine = refs(d).some(r => theme.has(r));
      const bucket = mine ? own : other;
      bucket.set(n, (bucket.get(n) ?? 0) + 1);
      if (!written.has(n)) written.set(n, new Map());
      bump(written.get(n)!, d.site.text);
    }
    const all = [...new Set([...own.keys(), ...other.keys()])].sort((a, b) => a - b);
    return { used: all.map(weight => ({ weight, places: (own.get(weight) ?? 0) + (other.get(weight) ?? 0), written: top(written.get(weight)!) })) };
  }

  const COLOR_PROPS = new Set(['color', 'background-color', 'background', 'border-color', 'fill', 'stroke', 'outline-color', 'text-decoration-color']);
  const HEX = /#(?:[0-9a-fA-F]{3}){1,2}\b|rgba?\([^)]*\)|oklch\([^)]*\)|hsla?\([^)]*\)/;

  function colours(): SystemData['colour'] {
    const tokens = new Map<string, string>();
    for (const d of decisions) if (d.family === 'color' && d.name.startsWith('--color-')) tokens.set(d.name, d.resolved || d.value);
    const uses = new Map<string, number>();
    const strays = new Map<string, { places: number; written: Map<string, number> }>();
    for (const d of decls) {
      if (!COLOR_PROPS.has(d.prop)) continue;
      const ref = refs(d).find(r => tokens.has(r));
      if (ref) { uses.set(ref, (uses.get(ref) ?? 0) + 1); continue; }
      const value = d.resolved || d.value || '';
      const m = HEX.exec(String(value));
      if (!m || String(value).includes('var(')) continue;
      let key = m[0].toLowerCase();
      if (key === '#fff') key = '#ffffff';
      const s = strays.get(key) ?? { places: 0, written: new Map() };
      strays.set(key, s);
      s.places++; bump(s.written, d.site.text);
    }
    const labs = new Map<string, Lab>();
    for (const [n, v] of tokens) { const lab = oklab(v); if (lab) labs.set(n, lab); }
    const nearest = (css: string): [string | null, number | null] => {
      const lab = oklab(css);
      if (!lab || !labs.size) return [null, null];
      // opacity counts: black at 42% is not black
      const a = opacity(css);
      let best: string | undefined, bestDistance = Infinity;
      for (const [n, t] of labs) {
        const distance = Math.sqrt(t.reduce((sum, x, i) => sum + (x - lab[i]!) ** 2, 0) + (opacity(tokens.get(n)!) - a) ** 2);
        if (distance < bestDistance) { best = n; bestDistance = distance; }
      }
      return [best!.slice(2), round(bestDistance, 4)];
    };
    return {
      steps: [...tokens].filter(([, v]) => v.includes('(') || v.startsWith('#')).map(([n, v]) => ({ name: n.slice(2), css: v, uses: uses.get(n) ?? 0 })),
      strays: [...strays].map(([css, s]) => { const [near, distance] = nearest(css); return { css, places: s.places, near, distance, alpha: alpha(css), written: top(s.written) }; })
        .sort((a, b) => b.places - a.places),
    };
  }

  function dead(): SystemData['dead'] {
    const out: SystemData['dead'] = [];
    for (const f of report.findings) {
      if (f.rule !== 'existence/dead-class') continue;
      const meant = [...(f.fix ?? '').matchAll(/`([^`]+)`/g)].map(m => m[1]!);
      out.push({ class: f.declaration!.value, places: f.sites.length, meant: meant.slice(0, 2) });
    }
    return out.sort((a, b) => b.places - a.places);
  }

  const files = report.files as unknown as Record<string, number> | number;
  const causes = report.causes ?? causesOf(report);
  return {
    project: projectName(report.root),
    files: typeof files === 'number' ? files : Object.values(files).reduce((sum, n) => sum + n, 0),
    size: scale('--text-', new Set(['font-size']), 6),
    radius: scale('--radius-', new Set(['border-radius'])),
    weight: weights(),
    colour: colours(),
    dead: dead(),
    causes: causes.slice(0, 3).map(cause => pageCause(cause, report)),
    open: causes.length,
  };
}

export function projectName(root: string): string {
  try { const name = (JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { name?: unknown }).name; if (typeof name === 'string' && name) return name; } catch { /* the folder's name says it */ }
  return basename(root);
}
