import { resolve } from 'node:path';
import type { PlumbConfig } from '../config.js';
import type { Decision, Family } from '../report.js';
import type { StylesheetGraph } from '../collect/stylesheets.js';
import type { ThemeValue } from '../lower/tailwind.js';
import { cssCode } from '../collect/stylesheets.js';
import { references } from '../collect/source.js';
import { UsageError } from '../errors.js';
import { readDtcg } from './dtcg.js';
import type { CssVariable } from './css.js';
import { readCssVariables } from './css.js';
import { resolveValue } from './resolve.js';
import type { Variable } from './resolve.js';

export { defineDecisions } from './record.js';
export type { DecisionInput } from './record.js';
import { defineDecisions, hasTierOverride } from './record.js';

export function familyFor(name: string): Family | undefined {
  if (/^--spacing-/.test(name)) return 'spacing';
  if (/^--color-/.test(name)) return 'color';
  if (/^--radius-/.test(name)) return 'radius';
  if (/^--(?:text|font|leading|tracking|default-(?:mono-)?font)-/.test(name)) return 'type';
  if (/^--(?:ease|animate|duration|default-transition)-/.test(name)) return 'motion';
  if (/^--(?:shadow|inset-shadow|drop-shadow)-/.test(name)) return 'elevation';
  if (/^--z-/.test(name)) return 'z';
  if (/^--opacity-/.test(name)) return 'opacity';
  if (/^--(?:size|container|breakpoint|aspect|perspective|blur|max-width)-/.test(name)) return 'size';
}
export function matches(value: string, pattern: string): boolean {
  return new RegExp(`^${pattern.split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`).test(value);
}

export interface DecisionRecord { decisions: Decision[]; variables: Map<string, Variable>; theme: Set<string>; defined: Set<string>; frameworkVariables: Map<string, CssVariable>; definitions: CssVariable[] }
export async function readDecisions(root: string, config: PlumbConfig, graph: StylesheetGraph, theme: ThemeValue[]): Promise<DecisionRecord> {
  const raw = readCssVariables(graph), variables = new Map<string, Variable>();
  const metadata = new Map<string, typeof raw[number]>();
  for (const item of raw) {
    if (item.theme) metadata.set(item.name, item);
    if (item.root) {
      const previous = variables.get(item.name);
      variables.set(item.name, { value: item.value, dynamic: item.dynamic || !!previous && (previous.dynamic || previous.value !== item.value) });
    }
  }
  for (const item of theme) variables.set(item.name, { value: item.value, dynamic: metadata.get(item.name)?.dynamic ?? false });
  const decisions = new Map<string, Decision>(), overrides = new Set<string>();
  function add(record: Decision, explicit = false): void {
    if (record.name === '--spacing') return;
    if (!record.name || typeof record.value !== 'string' || !record.source || !record.source.file || !Number.isInteger(record.source.line) || record.source.line < 1 ||
        !['project', 'framework', 'inferred'].includes(record.origin) || !['primitive', 'semantic'].includes(record.tier) || !Array.isArray(record.refs) || record.refs.some(ref => typeof ref !== 'string') || typeof record.why !== 'string') {
      throw new UsageError(`Invalid decision record in decisions.${record.family}.from.`);
    }
    decisions.set(`${record.family}:${record.name}`, { ...record, refs: [...record.refs], source: { ...record.source, file: resolve(root, record.source.file) } });
    if (explicit) overrides.add(`${record.family}:${record.name}`);
  }
  function selected(name: string, family: Family, file: string, isTheme: boolean): boolean {
    const source = config.decisions?.[family]?.from;
    if (source === undefined) return familyFor(name) === family;
    if (familyFor(name) !== undefined && familyFor(name) !== family) return false;
    if (typeof source === 'function') return false;
    return (Array.isArray(source) ? source : [source]).some(pattern => pattern.startsWith('theme:') ? isTheme && matches(name, pattern.slice(6)) : pattern.startsWith('dtcg:') ? false : matches(file, pattern.replace(/^css:/, '')) || matches(file.slice(root.length + 1), pattern.replace(/^css:/, '')));
  }
  for (const item of theme) {
    const meta = metadata.get(item.name), family = familyFor(item.name) ?? Object.keys(config.decisions ?? {}).find(family => selected(item.name, family as Family, meta?.source.file ?? '', true)) as Family | undefined;
    if (!family || !meta || meta.origin !== 'framework' && !selected(item.name, family, meta.source.file, true)) continue;
    const record = defineDecisions([{ family, name: item.name, value: item.value, origin: meta.origin, why: meta.why, source: meta.source, ...(meta.tier ? { tier: meta.tier } : {}) }])[0]!;
    add(record, meta.tier !== undefined);
  }
  for (const item of raw.filter(item => item.root && !item.theme && item.origin === 'project')) {
    for (const family of Object.keys(config.decisions ?? {}) as Family[]) if (selected(item.name, family, item.source.file, false)) {
      add(defineDecisions([{ family, name: item.name, value: item.value, why: item.why, source: item.source, ...(item.tier ? { tier: item.tier } : {}) }])[0]!, item.tier !== undefined);
    }
    const family = familyFor(item.name);
    if (family && !config.decisions?.[family]) add(defineDecisions([{ family, name: item.name, value: item.value, why: item.why, source: item.source, ...(item.tier ? { tier: item.tier } : {}) }])[0]!, item.tier !== undefined);
  }
  for (const [family, source] of Object.entries(config.decisions ?? {})) {
    if (typeof source.from === 'function') {
      const records = await source.from();
      if (!Array.isArray(records)) throw new UsageError(`decisions.${family}.from must return decision records.`);
      for (const record of records) {
        if (record.family !== family) throw new UsageError(`decisions.${family}.from returned family ${record.family}.`);
        add(record, true);
      }
    } else for (const pattern of Array.isArray(source.from) ? source.from : source.from === undefined ? [] : [source.from]) if (pattern.startsWith('dtcg:')) {
      for (const record of await readDtcg(root, pattern.slice(5), family as Family)) add(record, hasTierOverride(record));
    }
  }
  for (const record of decisions.values()) variables.set(record.name, variables.get(record.name) ?? { value: record.value });
  // DTCG references share the resolver with CSS variables.
  const cssValue = (value: string) => value.replace(/\{([\w.-]+)\}/g, 'var($1)');
  for (const [name, variable] of variables) variables.set(name, { ...variable, value: cssValue(variable.value) });
  const refIndex = new Map([...decisions.values()].flatMap(record => record.refs.map(ref => [ref, record] as const)));
  for (const record of decisions.values()) {
    if (!overrides.has(`${record.family}:${record.name}`)) {
      record.tier = [...references(record.value), ...[...record.value.matchAll(/\{([\w.-]+)\}/g)].map(match => match[1]!)].some(name => {
        const other = refIndex.get(`var(${name})`) ?? refIndex.get(`{${name}}`);
        return other?.family === record.family && other.name !== record.name;
      }) ? 'semantic' : 'primitive';
    }
    const resolved = resolveValue(cssValue(record.value), variables, new Set([record.name]));
    if (resolved !== undefined && !variables.get(record.name)?.dynamic) record.resolved = resolved;
    else delete record.resolved;
  }
  const themeNames = new Set(theme.map(item => item.name));
  const defined = new Set([...raw.filter(item => !item.theme).map(item => item.name), ...themeNames]);
  for (const sheet of graph.files.values()) for (const match of cssCode(sheet.css).matchAll(/@property\s+(--[\w-]+)/g)) defined.add(match[1]!);
  const frameworkVariables = new Map<string, CssVariable>();
  const projectNames = new Set(raw.filter(item => item.origin === 'project').map(item => item.name));
  for (const item of raw) if (item.origin === 'framework' && (!item.theme || themeNames.has(item.name)) && !projectNames.has(item.name) && !item.name.startsWith('--tw-') && item.name !== '--spacing') frameworkVariables.set(item.name, item);
  return { defined, frameworkVariables, definitions: raw, decisions: [...decisions.values()].sort((a, b) => a.family.localeCompare(b.family) || a.name.localeCompare(b.name)), variables, theme: new Set(theme.map(item => item.name)) };
}
