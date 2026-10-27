import { createHash } from 'node:crypto';
import { relative } from 'node:path';
import { components, pixels } from '../decisions/resolve.js';
import { familyFor } from '../decisions/index.js';
import { familiesFor, isJudged, oklab, partsFor, tokens } from '../rules/families.js';
import type { JudgedFamily, Lab } from '../rules/families.js';
import type { Clusterable } from './cluster.js';
import type { Declaration, Report } from '../report.js';
import { compact } from './names.js';

/** docs/briefs/onboarding.md section 2.3, "Harvest": one pass over the lowered declarations, in a fixed order. */
export type Measure = 'spacing' | 'radius' | 'type-size' | 'line-height' | 'letter-spacing' | 'duration' | 'easing' | 'color' | 'elevation' | 'z';
export const measures: readonly Measure[] = ['spacing', 'color', 'radius', 'type-size', 'line-height', 'letter-spacing', 'duration', 'easing', 'elevation', 'z'];
export const measureFamily: Record<Measure, JudgedFamily> = {
  spacing: 'spacing', radius: 'radius', 'type-size': 'type', 'line-height': 'type', 'letter-spacing': 'type', duration: 'motion', easing: 'motion', color: 'color', elevation: 'elevation', z: 'z',
};
export const measureUnit: Record<Measure, string> = { spacing: 'px', radius: 'px', 'type-size': 'px', 'line-height': '', 'letter-spacing': 'em', duration: 'ms', easing: '', color: '', elevation: '', z: '' };

export interface Value extends Clusterable {
  measure: Measure;
  /** The spelling to write: the one used at the most places. */
  text: string;
  files: number;
  fileList: string[];
  /** Places on body text (p, body), which centre the type scale. */
  body: number;
  props: string[];
  examples: string[];
  frameworkKey?: string;
  frameworkValue?: string;
}
export interface Harvest {
  values: Record<Measure, Value[]>;
  /** Values set in code (computed, spread, dynamic), per family. Never clustered. */
  setInCode: Partial<Record<JudgedFamily, number>>;
  /** Colours set for dark mode. The proposal is light only; dark values are never invented. */
  dark: number;
  hash: string;
}

interface Accumulator {
  measure: Measure; key: string; amount: number; lab?: Lab; layers?: number;
  sites: Set<string>; files: Set<string>; body: number; props: Map<string, number>; spellings: Map<string, number>; examples: string[];
  frameworkKey?: string; frameworkValue?: string;
}

const darkCondition = /(?:^|[^\w-])\.dark\b|\[data-(?:theme|mode)[~|^$*]?=["']?dark|prefers-color-scheme\s*:\s*dark|\.theme-dark|\[class[~|^$*]?=["']?dark/i;
const bodyOwner = /(?:^|[\s>+~,])(?:p|body)$/i;
const easingKeyword = /^(?:ease|ease-in|ease-out|ease-in-out|linear)$/;
const time = /^(-?(?:\d*\.)?\d+)(ms|s)$/;
const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();
const layerIsRing = (layer: string) => /^(?:inset\s+)?0(?:px)?\s+0(?:px)?(?:\s+0(?:px)?){0,2}\s+(?:transparent|#0000|rgb\(0 0 0 \/ 0\))$/.test(layer) || layer === 'none';

/** Canonical identity of a value, so a declined value is found again however it is spelled. */
export function canonical(measure: Measure, text: string): string | undefined {
  const value = text.trim();
  if (measure === 'color') { const lab = oklab(value); return lab ? lab.map(n => n.toFixed(4)).join(',') : undefined; }
  if (measure === 'easing' || measure === 'elevation') return normalize(value);
  if (measure === 'z') return /^-?\d+$/.test(value) ? value : undefined;
  if (measure === 'duration') { const match = time.exec(value); return match ? compact(Number(match[1]) * (match[2] === 's' ? 1000 : 1)) : undefined; }
  if (measure === 'line-height') return /^(?:\d*\.)?\d+$/.test(value) ? compact(Number(value)) : undefined;
  if (measure === 'letter-spacing') { const match = /^(-?(?:\d*\.)?\d+)em$/.exec(value); return match ? compact(Number(match[1])) : undefined; }
  const amount = pixels(value);
  return amount === undefined ? undefined : compact(amount);
}

export interface HarvestOptions {
  root: string;
  /** `measure:canonical` values the person declined; they are never proposed again. */
  declined?: ReadonlySet<string>;
}

/** The harvest of a report. Same declarations, same output, whatever order the files were read in. */
export function harvest(report: Report, options: HarvestOptions): Harvest {
  const path = (file: string) => relative(options.root, file).replaceAll('\\', '/');
  const declined = options.declined ?? new Set<string>();
  const accumulators = new Map<string, Accumulator>();
  const setInCode: Partial<Record<JudgedFamily, number>> = {};
  let dark = 0;

  const frameworkValues = new Map<string, string>();
  for (const decision of report.decisions) if (decision.origin === 'framework') frameworkValues.set(decision.name, decision.value);
  const elevationKeys = new Map<string, string>();
  for (const [name, value] of [...frameworkValues].sort((a, b) => a[0] < b[0] ? -1 : 1)) {
    if (/^--shadow-/.test(name)) { const key = normalize(value); if (!elevationKeys.has(key)) elevationKeys.set(key, name); }
  }
  const isFramework = (name: string) => frameworkValues.has(name) || name === '--spacing' || name.startsWith('--tw-');

  const sorted = [...report.declarations].sort((a, b) => {
    const left = path(a.site.file), right = path(b.site.file);
    return left < right ? -1 : left > right ? 1 : a.site.line - b.site.line || a.site.column - b.site.column || (a.prop < b.prop ? -1 : a.prop > b.prop ? 1 : 0) || (a.value < b.value ? -1 : a.value > b.value ? 1 : 0);
  });

  const add = (declaration: Declaration, measure: Measure, key: string, amount: number, spelling: string, extra: { lab?: Lab; layers?: number; frameworkKey?: string; frameworkValue?: string } = {}) => {
    if (declined.has(`${measure}:${key}`)) return;
    const id = `${measure}\u0000${key}`;
    let item = accumulators.get(id);
    if (!item) accumulators.set(id, item = { measure, key, amount, sites: new Set(), files: new Set(), body: 0, props: new Map(), spellings: new Map(), examples: [], ...(extra.lab ? { lab: extra.lab } : {}), ...(extra.layers !== undefined ? { layers: extra.layers } : {}) });
    const site = `${path(declaration.site.file)}:${declaration.site.line}:${declaration.site.column}`;
    if (!item.sites.has(site)) {
      item.sites.add(site);
      item.spellings.set(spelling, (item.spellings.get(spelling) ?? 0) + 1);
      item.props.set(declaration.prop, (item.props.get(declaration.prop) ?? 0) + 1);
      if (bodyOwner.test(declaration.owner.name)) item.body++;
      const example = `${path(declaration.site.file)}:${declaration.site.line}`;
      if (item.examples.length < 3 && !item.examples.includes(example)) item.examples.push(example);
    }
    item.files.add(path(declaration.site.file));
    if (extra.frameworkKey && !item.frameworkKey) { item.frameworkKey = extra.frameworkKey; if (extra.frameworkValue) item.frameworkValue = extra.frameworkValue; }
  };

  for (const declaration of sorted) {
    if (!isJudged(declaration)) continue;
    const families = familiesFor(declaration.prop);
    if (declaration.opaque) { for (const family of families) setInCode[family] = (setInCode[family] ?? 0) + 1; continue; }
    if (declaration.when.some(condition => darkCondition.test(condition.text))) { if (families.includes('color')) dark++; continue; }
    // A value that names one of the project's own variables is already on a token (or on its way to one).
    if (!declaration.refs.every(isFramework)) continue;
    const text = declaration.resolved ?? declaration.value;
    const keyed = declaration.refs.filter(name => frameworkValues.has(name) && !name.startsWith('--tw-'));
    const key = (family: string) => keyed.find(name => familyFor(name) === family);
    for (const family of families) {
      if (family === 'spacing' || family === 'radius') {
        const name = family === 'radius' ? key('radius') : undefined;
        for (const part of components(text)) {
          const amount = pixels(part);
          if (amount !== undefined && amount > 0) add(declaration, family, compact(amount), amount, part, name ? { frameworkKey: name, frameworkValue: frameworkValues.get(name)! } : {});
        }
      } else if (family === 'type') {
        if (declaration.prop === 'font-size') {
          const amount = pixels(text), name = key('type');
          if (amount !== undefined && amount > 0) add(declaration, 'type-size', compact(amount), amount, text.trim(), name && !name.includes('--', 2) ? { frameworkKey: name, frameworkValue: frameworkValues.get(name)! } : {});
        } else if (keyed.length) continue;
        else if (declaration.prop === 'line-height' && /^(?:\d*\.)?\d+$/.test(text.trim())) add(declaration, 'line-height', compact(Number(text)), Number(text), text.trim());
        else if (declaration.prop === 'letter-spacing') { const match = /^(-?(?:\d*\.)?\d+)em$/.exec(text.trim()); if (match) add(declaration, 'letter-spacing', compact(Number(match[1])), Number(match[1]), text.trim()); }
      } else if (family === 'motion') {
        if (keyed.length || /-delay$/.test(declaration.prop)) continue;
        let seenTime = false;
        for (const part of partsFor('motion', declaration.prop, text, new Map(), new Set())) {
          const match = time.exec(part);
          if (match) {
            // In a shorthand the second time is the delay.
            if (/^(?:transition|animation)$/.test(declaration.prop) && seenTime) continue;
            seenTime = true;
            const amount = Number(match[1]) * (match[2] === 's' ? 1000 : 1);
            // Under 20ms is a reset (reduced motion, no animation), not a duration anyone chose.
            if (amount >= 20) add(declaration, 'duration', compact(amount), amount, part);
          } else if (easingKeyword.test(part) || /^cubic-bezier\(/.test(part)) add(declaration, 'easing', normalize(part), 0, normalize(part));
        }
      } else if (family === 'color') {
        if (/^(?:box|text)-shadow$/.test(declaration.prop)) continue;
        const parts = partsFor('color', declaration.prop, text, new Map(), new Set());
        const name = parts.length === 1 ? key('color') : undefined;
        for (const part of parts) {
          const lab = oklab(part);
          if (!lab || lab[3] <= 0) continue;
          add(declaration, 'color', lab.map(n => n.toFixed(4)).join(','), lab[0], part, { lab, ...(name ? { frameworkKey: name, frameworkValue: frameworkValues.get(name)! } : {}) });
        }
      } else if (family === 'elevation') {
        if (declaration.prop !== 'box-shadow') continue;
        // Tailwind's ring layers keep variables of its own; a layer that is not plain values is not a shadow to propose.
        const layers = tokens(text, /,/).map(normalize).filter(layer => !layerIsRing(layer) && !layer.includes('var('));
        if (!layers.length) continue;
        const value = layers.join(', ');
        const blur = layers.reduce((sum, layer) => {
          const lengths = [...layer.replace(/\([^)]*\)/g, '').matchAll(/(?<![\w.-])(-?(?:\d*\.)?\d+)(?:px)?(?![\w.%])/g)].map(match => Number(match[1]));
          return sum + (lengths[2] ?? 0);
        }, 0);
        const name = elevationKeys.get(value);
        add(declaration, 'elevation', value, blur, value, { layers: layers.length, ...(name ? { frameworkKey: name, frameworkValue: frameworkValues.get(name)! } : {}) });
      } else if (family === 'z') {
        if (/^-?\d+$/.test(text.trim()) && Number(text) !== 0) add(declaration, 'z', text.trim(), Number(text), text.trim());
      }
    }
  }

  const values = Object.fromEntries(measures.map(measure => [measure, [] as Value[]])) as Record<Measure, Value[]>;
  const hash = createHash('sha256');
  for (const measure of measures) {
    const list = [...accumulators.values()].filter(item => item.measure === measure).sort((a, b) => a.amount - b.amount || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    for (const item of list) {
      // Spacing and radius are written in pixels, however the code spelled them.
      const spelling = measure === 'spacing' || measure === 'radius' ? `${compact(item.amount)}px` : [...item.spellings].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]![0];
      hash.update(`${measure}|${item.key}|${[...item.sites].join(',')};`);
      values[measure].push({
        measure, key: item.key, amount: item.amount, sites: item.sites.size, first: item.examples[0] ?? '', text: spelling, files: item.files.size, fileList: [...item.files].sort(), body: item.body,
        props: [...item.props].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([prop]) => prop), examples: item.examples,
        ...(item.lab ? { lab: item.lab } : {}), ...(item.layers !== undefined ? { layers: item.layers } : {}),
        ...(item.frameworkKey ? { frameworkKey: item.frameworkKey, ...(item.frameworkValue ? { frameworkValue: item.frameworkValue } : {}) } : {}),
      });
    }
  }
  for (const family of Object.keys(setInCode).sort()) hash.update(`code|${family}|${setInCode[family as JudgedFamily]};`);
  return { values, setInCode, dark, hash: hash.digest('hex').slice(0, 12) };
}
