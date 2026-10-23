import { presetDecisions } from '../presets/index.js';
import { isAbsolute, relative, resolve } from 'node:path';
import type { PlumbConfig } from '../config.js';
import type { Decision, Family } from '../report.js';
import type { StylesheetGraph } from '../collect/stylesheets.js';
import type { ThemeValue } from '../lower/tailwind.js';
import { cssCode } from '../collect/stylesheets.js';
import { references } from '../collect/source.js';
import { UsageError } from '../errors.js';
import { tokenReasons } from '../messages.js';
import { readDtcg } from './dtcg.js';
import type { CssVariable } from './css.js';
import { readCssVariables } from './css.js';
import { resolveValue } from './resolve.js';
import { themeSourceGraph } from './theme-sources.js';
import { motionDefinitions } from './motion.js';
import { numericSpacing } from './spacing.js';
import type { NumericSpacing } from './spacing.js';
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

export interface DecisionRecord { numericSpacing?: NumericSpacing | undefined; inventory?: Decision[]; decisions: Decision[]; variables: Map<string, Variable>; theme: Set<string>; defined: Set<string>; frameworkVariables: Map<string, CssVariable>; definitions: CssVariable[] }
function outside(root: string, file: string): boolean {
  const path = relative(root, resolve(root, file)).replaceAll('\\', '/');
  return path === '..' || path.startsWith('../') || isAbsolute(path);
}
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
  // A framework theme default (e.g. Tailwind's --radius) cannot replace the
  // authored :root backing value used by an inline alias.
  for (const item of theme) if (!variables.has(item.name)) variables.set(item.name, { value: item.value, dynamic: metadata.get(item.name)?.dynamic ?? false });
  const decisions = new Map<string, Decision>(), overrides = new Set<string>();
  function add(record: Decision, explicit = false, projectOverride = false): void {
    if (record.name === '--spacing') return;
    if (!record.name || typeof record.value !== 'string' || !record.source || !record.source.file || !Number.isInteger(record.source.line) || record.source.line < 1 ||
        !['project', 'framework', 'inferred'].includes(record.origin) || !['primitive', 'semantic'].includes(record.tier) || !Array.isArray(record.refs) || record.refs.some(ref => typeof ref !== 'string') || typeof record.why !== 'string' || record.groupWhy !== undefined && typeof record.groupWhy !== 'string') {
      throw new UsageError(`Invalid decision record in decisions.${record.family}.from.`);
    }
    const previous = decisions.get(`${record.family}:${record.name}`);
    if (previous?.exported && (!projectOverride && (record.origin === 'framework' || outside(root, record.source.file)))) return;
    if (previous?.exported && previous.value === record.value) record = { ...record, exported: true };
    decisions.set(`${record.family}:${record.name}`, { ...record, refs: [...record.refs], source: { ...record.source, file: resolve(root, record.source.file) } });
    if (explicit) overrides.add(`${record.family}:${record.name}`);
  }
  for (const record of presetDecisions(config)) add(record, true);
  function selected(name: string, family: Family, file: string, isTheme: boolean, inferredFamily?: Family): boolean {
    const source = config.decisions?.[family]?.from;
    if (source === undefined) return (familyFor(name) ?? inferredFamily) === family;
    if (familyFor(name) !== undefined && familyFor(name) !== family) return false;
    if (typeof source === 'function') return false;
    return (Array.isArray(source) ? source : [source]).some(pattern => {
      if (pattern.startsWith('theme:')) return isTheme && matches(name, pattern.slice(6));
      if (pattern.startsWith('dtcg:')) return false;
      const selector = pattern.replace(/^css:/, ''), fragment = /^(.*)#(--[^#]+)$/.exec(selector);
      const path = fragment?.[1] ?? selector;
      return (!fragment || matches(name, fragment[2]!)) && (matches(file, path) || matches(relative(root, file).replaceAll('\\', '/'), path));
    });
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
        add(record, true, true);
      }
    } else for (const pattern of Array.isArray(source.from) ? source.from : source.from === undefined ? [] : [source.from]) if (pattern.startsWith('dtcg:')) {
      for (const record of await readDtcg(root, pattern.slice(5), family as Family)) add(record, hasTierOverride(record), true);
    }
  }
  const projectNamesForValues = new Set(raw.filter(item => item.origin === 'project' && !outside(root, item.source.file)).map(item => item.name));
  for (const record of decisions.values()) variables.set(record.name, record.exported && !projectNamesForValues.has(record.name) ? { value: record.value } : variables.get(record.name) ?? { value: record.value });
  // DTCG references share the resolver with CSS variables.
  const cssValue = (value: string) => value.replace(/\{([\w.-]+)\}/g, 'var($1)');
  for (const [name, variable] of variables) variables.set(name, { ...variable, value: cssValue(variable.value) });
  // Theme backing values can change outside :root too. Never resolve an alias
  // to just its light value when another scope supplies a different definition.
  const themeSources = themeSourceGraph({ definitions: raw, theme: new Set(theme.map(item => item.name)), variables, decisions: [...decisions.values()] });
  const lightVariables = new Map([...variables].map(([name, value]) => [name, { ...value }]));
  const darkVariables = new Map([...lightVariables].map(([name, value]) => [name, { ...value }]));
  for (const item of raw) if (!item.theme && themeSources.names.has(item.name)) {
    if (item.dark && !item.dynamic) darkVariables.set(item.name, { value: cssValue(item.value) });
    else if (!item.root || item.dynamic) {
      const light = lightVariables.get(item.name), dark = darkVariables.get(item.name);
      if (light && (item.dynamic || cssValue(item.value) !== light.value)) light.dynamic = true;
      if (dark && (item.dynamic || cssValue(item.value) !== dark.value)) dark.dynamic = true;
    }
  }
  const motionNames = new Set<string>();
  for (const item of motionDefinitions(raw, graph)) {
    // Backing definitions already belong to their theme decision (Layer 1).
    if (themeSources.names.has(item.name) || !selected(item.name, 'motion', item.source.file, false, 'motion')) continue;
    add(defineDecisions([{ family: 'motion', name: item.name, value: item.value, why: item.why || item.trailingWhy, source: item.source, ...(item.tier ? { tier: item.tier } : {}) }])[0]!, item.tier !== undefined);
    variables.set(item.name, variables.get(item.name) ?? { value: item.value });
    motionNames.add(item.name);
  }
  for (const item of raw) if (!item.theme && (themeSources.names.has(item.name) || motionNames.has(item.name))) {
    const variable = variables.get(item.name);
    if (variable && (item.dynamic || item.value !== variable.value)) variable.dynamic = true;
  }
  const refIndex = new Map([...decisions.values()].flatMap(record => record.refs.map(ref => [ref, record] as const)));
  function resolveRecord(record: Decision): void {
    const inline = metadata.get(record.name)?.inline;
    const values = inline ? lightVariables : variables;
    const resolved = resolveValue(cssValue(record.value), values, new Set([record.name]));
    if (resolved !== undefined && !values.get(record.name)?.dynamic) record.resolved = resolved;
    else delete record.resolved;
    if (inline) {
      const dark = resolveValue(cssValue(record.value), darkVariables, new Set([record.name]));
      if (dark !== undefined && dark !== resolved && !darkVariables.get(record.name)?.dynamic) record.resolvedModes = { dark };
    }
  }
  for (const record of decisions.values()) {
    if (!overrides.has(`${record.family}:${record.name}`)) {
      record.tier = [...references(record.value), ...[...record.value.matchAll(/\{([\w.-]+)\}/g)].map(match => match[1]!)].some(name => {
        const other = refIndex.get(`var(${name})`) ?? refIndex.get(`{${name}}`);
        return other?.family === record.family && other.name !== record.name;
      }) ? 'semantic' : 'primitive';
    }
    resolveRecord(record);
  }
  const themeNames = new Set(theme.map(item => item.name));
  const defined = new Set([...presetDecisions(config).map(record => record.name), ...raw.filter(item => !item.theme).map(item => item.name), ...themeNames]);
  for (const sheet of graph.files.values()) for (const match of cssCode(sheet.css).matchAll(/@property\s+(--[\w-]+)/g)) defined.add(match[1]!);
  const frameworkVariables = new Map<string, CssVariable>();
  const projectNames = new Set(raw.filter(item => item.origin === 'project').map(item => item.name));
  for (const item of raw) if (item.origin === 'framework' && (!item.theme || themeNames.has(item.name)) && !projectNames.has(item.name) && !item.name.startsWith('--tw-') && item.name !== '--spacing') frameworkVariables.set(item.name, item);
  const inventory = theme.flatMap(item => {
    const meta = metadata.get(item.name), family = familyFor(item.name);
    if (!meta || meta.origin !== 'project' || !family || item.name === '--spacing') return [];
    const selected = decisions.get(`${family}:${item.name}`);
    if (selected) return [selected];
    const record = defineDecisions([{ family, name: item.name, value: item.value, why: meta.why, source: meta.source }])[0]!;
    resolveRecord(record);
    return [record];
  });
  tokenReasons([...decisions.values(), ...inventory]);
  return { numericSpacing: numericSpacing(raw, [...decisions.values()], variables, themeNames), inventory, defined, frameworkVariables, definitions: raw, decisions: [...decisions.values()].sort((a, b) => a.family.localeCompare(b.family) || a.name.localeCompare(b.name)), variables, theme: new Set(theme.map(item => item.name)) };
}
