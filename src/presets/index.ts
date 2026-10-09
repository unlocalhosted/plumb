import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ResolverFactory } from 'oxc-resolver';
import { glob } from 'tinyglobby';
import type { PlumbConfig } from '../config.js';
import { validateConfig } from '../config.js';
import { familyFor } from '../decisions/index.js';
import { defineDecisions } from '../decisions/record.js';
import type { DecisionInput } from '../decisions/record.js';
import { readDtcg } from '../decisions/dtcg.js';
import { readCssVariables } from '../decisions/css.js';
import { collectStylesheets } from '../collect/stylesheets.js';
import { errorMessage, UsageError } from '../errors.js';
import type { Decision, Family } from '../report.js';
import { discoverComponents } from '../ownership/components.js';
import type { ComponentIdentity } from '../ownership/components.js';
import { componentFiles } from '../ownership/cache.js';

export interface Preset extends Pick<PlumbConfig, 'components' | 'imitation' | 'habits' | 'markers'> {
  name?: string;
  decisions?: DecisionInput[] | (() => DecisionInput[] | Promise<DecisionInput[]>) | PlumbConfig['decisions'];
  exported?: boolean | string[];
}
export type PresetSelection = (string | Preset | Record<string, false>)[] | Record<string, boolean | string | Preset>;
export interface PresetSummary {
  name: string;
  source: string;
  decisions: number;
  exported: number;
  components: { from: string[]; contracts: string[] };
  imitation: string[];
  habits: string[];
  markers: string[];
}
interface LoadedPreset { preset: Preset; directory: string; scopes: string[]; package?: string; records: Decision[]; summary: PresetSummary }
interface State { loaded: LoadedPreset[]; project: PlumbConfig }
const states = new WeakMap<PlumbConfig, State>();
const list = (value?: string | string[]) => value === undefined ? [] : Array.isArray(value) ? value : [value];
const contains = (directory: string, file: string) => file === directory || file.startsWith(directory + sep);

export function definePreset(preset: Preset): Preset {
  if (!preset || typeof preset !== 'object' || Array.isArray(preset)) throw new UsageError('Set a preset to an object.');
  for (const key of Object.keys(preset)) if (!['name', 'decisions', 'components', 'imitation', 'habits', 'markers', 'exported'].includes(key)) throw new UsageError(`Remove unknown preset key "${key}".`);
  if (preset.name !== undefined && (typeof preset.name !== 'string' || !preset.name.trim())) throw new UsageError('Set preset.name to a non-empty string.');
  if (preset.exported !== undefined && typeof preset.exported !== 'boolean' && (!Array.isArray(preset.exported) || preset.exported.some(value => typeof value !== 'string' || !value.trim()))) throw new UsageError('Set preset.exported to a boolean or an array of token names.');
  const { name, decisions, exported, ...config } = preset;
  validateConfig({ ...config, ...(decisions && !Array.isArray(decisions) && typeof decisions !== 'function' ? { decisions } : {}) });
  return preset;
}
export function validatePresetSelection(value: unknown): void {
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === 'string' && entry.trim()) continue;
      if (entry && typeof entry === 'object' && 'name' in entry) { definePreset(entry as Preset); continue; }
      if (entry && typeof entry === 'object' && !Array.isArray(entry) && Object.values(entry).every(item => item === false)) continue;
      throw new UsageError('Set presets to module names, named presets, or package names set to false.');
    }
  } else if (value && typeof value === 'object') {
    for (const entry of Object.values(value)) {
      if (typeof entry === 'boolean' || typeof entry === 'string' && entry.trim()) continue;
      definePreset(entry as Preset);
    }
  } else throw new UsageError('Set presets to an array or an object keyed by package name.');
}

async function json(file: string): Promise<Record<string, unknown> | undefined> {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw new UsageError(`Read ${file}: ${errorMessage(error)}`); }
}
async function packageDirectory(root: string, name: string): Promise<string | undefined> {
  let directory = root;
  while (true) {
    const path = join(directory, 'node_modules', name, 'package.json');
    if (await stat(path).then(info => info.isFile()).catch(() => false)) return realpath(dirname(path));
    if (dirname(directory) === directory) break;
    directory = dirname(directory);
  }
  // Handles packages whose export maps hide package.json, including self references.
  const resolver = new ResolverFactory({ conditionNames: ['plumb', 'import', 'node', 'default'], extensions: ['.js', '.mjs', '.ts'], mainFields: ['module', 'main'] });
  const path = resolver.sync(root, name).path;
  if (path) {
    directory = dirname(path);
    while (dirname(directory) !== directory) {
      if ((await json(join(directory, 'package.json')))?.name === name) return directory;
      directory = dirname(directory);
    }
  }
}
function condition(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return;
  const object = value as Record<string, unknown>;
  if (typeof object.plumb === 'string') return object.plumb;
  if (object.plumb && typeof object.plumb === 'object') return target(object.plumb);
  for (const child of Object.values(object)) { const found = condition(child); if (found) return found; }
}
function target(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') for (const key of ['import', 'node', 'default']) { const found = target((value as Record<string, unknown>)[key]); if (found) return found; }
}
function moduleTarget(manifest: Record<string, unknown>): string | undefined {
  if (typeof manifest.plumb === 'string') return manifest.plumb;
  const exports = manifest.exports as Record<string, unknown> | undefined;
  return condition(exports) ?? (exports && target(exports['./plumb']));
}
async function records(preset: Preset, directory: string, consumer: boolean): Promise<Decision[]> {
  let inputs: DecisionInput[] = [];
  if (Array.isArray(preset.decisions)) inputs = preset.decisions;
  else if (typeof preset.decisions === 'function') inputs = await preset.decisions();
  else for (const [family, source] of Object.entries(preset.decisions ?? {})) {
    if (typeof source.from === 'function') {
      const result = await source.from();
      if (!Array.isArray(result) || result.some(record => record.family !== family)) throw new UsageError(`Preset decisions.${family}.from must return ${family} token records.`);
      inputs.push(...result);
    }
    else for (const pattern of list(source.from)) {
      if (pattern.startsWith('dtcg:')) inputs.push(...await readDtcg(directory, pattern.slice(5), family as Family));
      else {
        const files = await glob(pattern.replace(/^css:/, ''), { cwd: directory, absolute: true });
        if (pattern.startsWith('theme:')) throw new UsageError('Use CSS paths, token files, or a function for preset token sources.');
        const graph = await collectStylesheets(null, files, []);
        inputs.push(...readCssVariables(graph).filter(item => item.origin === 'project' && (!familyFor(item.name) || familyFor(item.name) === family)).map(item => ({ family: family as Family, name: item.name, value: item.value, why: item.why, source: item.source })));
      }
    }
  }
  if (!Array.isArray(inputs)) throw new UsageError('Preset decisions must return an array of token records.');
  for (const record of inputs) {
    if (!record || !['spacing', 'color', 'radius', 'type', 'motion', 'elevation', 'size', 'z', 'opacity'].includes(record.family) ||
        typeof record.name !== 'string' || !record.name.trim() || typeof record.value !== 'string' || !record.source || typeof record.source.file !== 'string' ||
        !Number.isInteger(record.source.line) || record.source.line < 1 || record.refs !== undefined && (!Array.isArray(record.refs) || record.refs.some(ref => typeof ref !== 'string')) ||
        record.why !== undefined && typeof record.why !== 'string' || record.origin !== undefined && !['project', 'framework', 'inferred'].includes(record.origin) ||
        record.tier !== undefined && !['primitive', 'semantic'].includes(record.tier)) throw new UsageError('Set preset decisions to valid token records with a family, name, value, and source location.');
  }
  return defineDecisions(inputs).map(record => ({ ...record,
    exported: consumer || (Array.isArray(preset.exported) ? preset.exported.includes(record.name) : preset.exported ?? record.exported ?? true),
    source: { ...record.source, file: resolve(directory, record.source.file) } }));
}

export async function loadPresets(root: string, project: PlumbConfig): Promise<{ value: PlumbConfig; presets: PresetSummary[] }> {
  const disabled = new Set<string>(), additions: (string | Preset)[] = [];
  for (const [key, value] of Object.entries(project.presets ?? {})) {
    if (Array.isArray(project.presets)) {
      if (typeof value === 'string' || value && 'name' in Object(value)) additions.push(value as string | Preset);
      else for (const name of Object.keys(value as object)) disabled.add(name);
    } else if (value === false) disabled.add(key);
    else if (value !== true) additions.push(typeof value === 'string' ? value : { ...value as Preset, name: (value as Preset).name ?? key });
    else additions.push(key);
  }
  const loaded: LoadedPreset[] = [];
  async function add(preset: Preset, directory: string, source: string, packageName?: string): Promise<void> {
    preset = definePreset(preset);
    if (disabled.has(preset.name ?? '') || packageName && disabled.has(packageName)) return;
    const tokens = await records(preset, directory, directory !== root);
    const name = preset.name ?? packageName ?? source;
    const from = list(preset.components?.from).map(item => item.startsWith('directory:') ? `directory:${resolve(directory, item.slice(10))}` : item);
    if (packageName && !from.includes(`package:${packageName}`)) from.push(`package:${packageName}`);
    const scoped = { ...preset, ...(preset.components || packageName ? { components: { ...preset.components, from } } : {}) };
    const scopes: string[] = packageName ? [directory] : [];
    for (const item of from) {
      if (item.startsWith('directory:')) scopes.push(item.slice(10));
      else if (item.startsWith('package:')) {
        const path = await packageDirectory(root, item.slice(8)); if (path) scopes.push(path);
      }
    }
    if (!scopes.length) scopes.push(directory);
    const summary: PresetSummary = { name, source, decisions: tokens.length, exported: tokens.filter(record => record.exported).length,
      components: { from: from.map(item => item.startsWith('directory:') ? `directory:${relative(root, item.slice(10)) || '.'}` : item), contracts: Object.keys(preset.components?.contracts ?? {}) }, imitation: Object.keys(preset.imitation ?? {}),
      habits: (preset.habits ?? []).map(habit => typeof habit === 'string' ? habit : habit.id), markers: preset.markers ?? [] };
    const entry = { preset: scoped, directory, scopes, ...(packageName ? { package: packageName } : {}), records: tokens, summary };
    const previous = loaded.findIndex(item => item.summary.name === name);
    if (previous >= 0) loaded.splice(previous, 1);
    loaded.push(entry);
  }
  const shadcn = await json(join(root, 'components.json'));
  if (shadcn && !disabled.has('shadcn')) {
    const aliases = shadcn.aliases as { ui?: string; components?: string } | undefined;
    const alias = aliases?.ui ?? aliases?.components ?? 'src/components/ui';
    const resolver = new ResolverFactory({ tsconfig: 'auto', resolveToContext: true });
    const directory = resolver.resolveFileSync(join(root, 'src/App.tsx'), alias).path ?? resolve(root, alias);
    const components = { from: [`directory:${directory}`, `import:${alias}`] };
    const graph = discoverComponents(root, componentFiles(directory), { components }, new Map(), true, new Map(), true);
    const contracts = Object.fromEntries(graph.components.map(component => [component.name, { own: ['paint', 'type', 'radius', 'elevation', 'padding'] }]));
    await add({ name: 'shadcn', components: { ...components, contracts } }, root, 'components.json');
  }
  const manifest = await json(join(root, 'package.json'));
  const dependencies = [...new Set(['dependencies', 'devDependencies', 'peerDependencies'].flatMap(key => Object.keys(manifest?.[key] as object ?? {})))].sort();
  // A package's own preset publishes its tokens in its library analysis too.
  if (manifest && moduleTarget(manifest) && typeof manifest.name === 'string' && !dependencies.includes(manifest.name)) dependencies.push(manifest.name);
  async function loadModule(file: string, directory: string, packageName?: string): Promise<void> {
    try { const module = await import(pathToFileURL(file).href); await add(module.default, directory, relative(root, file), packageName); }
    catch (error) { throw new UsageError(`Load preset ${relative(root, file)}: ${errorMessage(error)}`); }
  }
  for (const name of dependencies) {
    if (disabled.has(name)) continue;
    const directory = manifest?.name === name ? root : await packageDirectory(root, name);
    if (!directory) continue; // Optional or uninstalled dependency.
    const metadata = await json(join(directory, 'package.json'));
    const path = metadata && moduleTarget(metadata);
    if (path) await loadModule(resolve(directory, path), directory, name);
  }
  for (const entry of additions) {
    if (typeof entry !== 'string') { await add(entry, root, 'config'); continue; }
    if (disabled.has(entry)) continue;
    if (entry.startsWith('.') || isAbsolute(entry)) await loadModule(resolve(root, entry), dirname(resolve(root, entry)));
    else {
      const packageName = entry.startsWith('@') ? entry.split('/').slice(0, 2).join('/') : entry.split('/')[0]!;
      const directory = await packageDirectory(root, packageName);
      if (!directory) throw new UsageError(`Install ${packageName} or remove it from presets.`);
      const metadata = await json(join(directory, 'package.json'));
      const path = entry === packageName && metadata ? moduleTarget(metadata) : undefined;
      const resolver = new ResolverFactory({ conditionNames: ['plumb', 'import', 'node', 'default'], extensions: ['.js', '.mjs', '.ts'] });
      const file = path ? resolve(directory, path) : resolver.sync(root, entry).path;
      if (!file) throw new UsageError(`Set presets to a preset module exported by ${packageName}.`);
      await loadModule(file, directory, packageName);
    }
  }
  const value: PlumbConfig = { ...project };
  const decisionPolicies: NonNullable<PlumbConfig['decisions']> = {};
  for (const { preset } of loaded) if (preset.decisions && !Array.isArray(preset.decisions) && typeof preset.decisions !== 'function') {
    for (const [family, { from, exported, ...policy }] of Object.entries(preset.decisions)) decisionPolicies[family as Family] = { ...decisionPolicies[family as Family], ...policy };
  }
  for (const [family, policy] of Object.entries(project.decisions ?? {})) decisionPolicies[family as Family] = { ...decisionPolicies[family as Family], ...policy };
  if (Object.keys(decisionPolicies).length) value.decisions = decisionPolicies;
  const fallback = !project.components?.from && !shadcn && loaded.length ?
    [`directory:${join(root, await stat(join(root, 'src/components/ui')).then(info => info.isDirectory()).catch(() => false) ? 'src/components/ui' : 'src/components')}`] : [];
  const from = [...new Set([...fallback, ...loaded.flatMap(item => list(item.preset.components?.from)), ...list(project.components?.from)])];
  if (from.length || shadcn && disabled.has('shadcn') && project.components?.from === undefined) value.components = { ...project.components, from };
  const habits = new Map<string, NonNullable<PlumbConfig['habits']>[number]>();
  for (const habit of [...loaded.flatMap(item => item.preset.habits ?? []), ...project.habits ?? []]) habits.set(typeof habit === 'string' ? habit : habit.id, habit);
  if (habits.size) value.habits = [...habits.values()];
  if (project.habits?.length === 0) value.habits = [];
  if (loaded.some(item => item.preset.markers)) value.markers = [...new Set([...loaded.flatMap(item => item.preset.markers ?? []), ...project.markers ?? []])];
  const imitation = Object.assign({}, ...loaded.map(item => item.preset.imitation), project.imitation);
  if (Object.keys(imitation).length) value.imitation = imitation; // Names used only for graph discovery; judging is scoped below.
  states.set(value, { loaded, project });
  return { value, presets: loaded.map(item => item.summary) };
}

export function presetDecisions(config: PlumbConfig): Decision[] { return states.get(config)?.loaded.flatMap(item => item.records) ?? []; }
export function componentConfigs(config: PlumbConfig, component: ComponentIdentity): PlumbConfig[] {
  const state = states.get(config);
  if (!state) return [config];
  return [...state.loaded.filter(item => item.scopes.some(directory => contains(directory, component.source.file)))
    .map(item => ({ components: item.preset.components ?? {} })), state.project];
}
export function presetImitation(config: PlumbConfig): { name: string; entry: NonNullable<PlumbConfig['imitation']>[string]; directories?: string[] }[] {
  const state = states.get(config);
  if (!state) return Object.entries(config.imitation ?? {}).map(([name, entry]) => ({ name, entry }));
  return [...state.loaded.flatMap(item => Object.entries(item.preset.imitation ?? {}).filter(([name]) => !state.project.imitation?.[name]).map(([name, entry]) => ({ name, entry, directories: item.scopes }))),
    ...Object.entries(state.project.imitation ?? {}).map(([name, entry]) => ({ name, entry }))];
}
export function presetComponentMatches(directories: string[] | undefined, component: ComponentIdentity): boolean { return !directories || directories.some(directory => contains(directory, component.source.file)); }
