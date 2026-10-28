import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { parseSync, visitorKeys } from 'oxc-parser';
import type { Node } from 'oxc-parser';
import { check } from '../index.js';
import { loadConfig } from '../config.js';
import type { PlumbConfig } from '../config.js';
import { UsageError } from '../errors.js';
import { count, plural } from '../messages.js';
import { packageManager, packageMetadata, resolvedTailwind, tailwindSetupProblem } from '../setup-messages.js';
import { discoverProject, matchProjectFiles, projectSourceFiles, tailwindEntryCandidates } from '../project.js';
import { workspaceApps } from '../cli-project.js';
import { projectFacts, publicFacts } from '../project-facts/index.js';
import type { PublicFacts } from '../project-facts/index.js';
import { components, pixels } from '../decisions/resolve.js';
import { nodeName, unwrap } from '../collect/source.js';
import { familiesFor, isJudged, judgedFamilies, oklab, tokens } from '../rules/families.js';
import type { JudgedFamily } from '../rules/families.js';
import type { Lab } from '../rules/families.js';
import type { Declaration, Report } from '../report.js';

/** docs/briefs/onboarding.md section 1: one rung, a kind, and a sorted set of flags, all read from evidence. */
export type Rung = 'R0' | 'R1' | 'R2' | 'R3' | 'R4';
export type Flag = 'conflicting' | 'dark-split' | 'dead' | 'dtcg' | 'noisy' | 'prefixed' | 'split' | 'styled-in-js' | 'tokens-from-package' | 'unreadable';
export const rungNames: Record<Rung, string> = { R0: 'Blocked', R1: 'Bare', R2: 'Framework', R3: 'Partial', R4: 'Clean' };

export interface FamilyState {
  /** Judged values in this family. */
  total: number;
  /** Values that use a project token. */
  onTokens: number;
  off: number;
  /** Whole percent of values on tokens. */
  percent: number;
  /** The project has at least one token of its own in this family. */
  tokened: boolean;
  /** Values that name one of Tailwind's own keys (text-gray-500, rounded-lg). */
  frameworkKeys: number;
}
export interface StateNumbers {
  files: { source: number; css: number };
  tailwind: { major: number | null; declared: string | null; entry: string | null; prefix: string | null };
  /** Only the families the code uses. */
  families: Partial<Record<JudgedFamily, FamilyState>>;
  tokens: { project: number; exported: number };
  arbitrary: { declarations: number; judged: number; percent: number };
  inline: { sites: number; literal: number; percent: number };
  values: { distinct: number; near: number; percent: number; files: number; byFamily: Record<string, number> };
  unusedTokens: { total: number; dead: number; percent: number };
  darkColours: { total: number; withDark: number };
  entries: number;
  rootProperties: number;
  unreadable: { files: number; stylesheets: number };
  libraries: string[];
  themeValues?: number;
  apps?: { path: string; kind: string }[];
}
export interface Evidence { about: string; files: string[] }
export interface ProjectState {
  schemaVersion: 1;
  rung: Rung;
  name: string;
  kind: string;
  flags: Flag[];
  sentence: string;
  next: string;
  numbers: StateNumbers;
  evidence: Evidence[];
  /** The project facts (experimental for one release): the same object the readiness route publishes as `project`. */
  facts?: PublicFacts;
}

export interface StateOptions {
  root: string;
  config?: string;
  /** A report the caller already has (the check header); otherwise the project is checked. */
  report?: Report;
}

const pct = (part: number, whole: number) => whole ? Math.round(part / whole * 100) : 0;
const colourName = (family: string) => family === 'color' ? 'colour' : family;
const file = (root: string, path: string) => relative(root, path).replaceAll('\\', '/') || '.';
const listOf = (items: string[]) => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

const styledPattern = /^(?:styled-components|@emotion\/.+|@stitches\/react|@linaria\/.+|goober|styled-jsx)$/;
const taggedTemplate = /\b(?:styled|css|keyframes|createGlobalStyle)\b[^`\n]{0,80}`/;
const templateTags = new Set(['styled', 'css', 'keyframes', 'createGlobalStyle']);

/** A styled`...`/css`...` tagged template in the source (parsed, so prose in comments does not count). */
export function hasStyledTemplate(source: string, name: string): boolean {
  if (!taggedTemplate.test(source)) return false;
  let program;
  try { program = parseSync(name, source).program; } catch { return false; }
  const rootName = (node: Node): string | undefined => {
    if (node.type === 'Identifier') return node.name;
    if (node.type === 'MemberExpression') return rootName(node.object as Node);
    if (node.type === 'CallExpression') return rootName(node.callee as Node);
  };
  const visit = (node: Node): boolean => {
    if (node.type === 'TaggedTemplateExpression') { const root = rootName(node.tag as Node); if (root && templateTags.has(root)) return true; }
    for (const key of (visitorKeys as Record<string, readonly string[]>)[node.type] ?? []) {
      const value = (node as unknown as Record<string, unknown>)[key];
      for (const child of Array.isArray(value) ? value : [value]) if (child && typeof child === 'object' && 'type' in child && visit(child as Node)) return true;
    }
    return false;
  };
  return visit(program as unknown as Node);
}

/** Static count of the values in tailwind.config theme and theme.extend. Reads the file as text; nothing runs. */
export function themeValues(source: string, name: string): number | undefined {
  let program;
  try { program = parseSync(name, source).program; } catch { return; }
  const find = (node: Node | null | undefined): Node | undefined => {
    if (!node) return;
    const inner = unwrap(node);
    if (inner.type === 'ObjectExpression') return inner;
    if (inner.type === 'CallExpression') return find(inner.arguments[0] as Node | undefined);
    if (inner.type === 'Identifier') {
      for (const item of program.body) if (item.type === 'VariableDeclaration') {
        for (const declarator of item.declarations) if (declarator.id.type === 'Identifier' && declarator.id.name === inner.name) return find(declarator.init);
      }
    }
  };
  let config: Node | undefined;
  for (const item of program.body) {
    if (item.type === 'ExportDefaultDeclaration') config = find(item.declaration as Node);
    else if (item.type === 'ExpressionStatement' && item.expression.type === 'AssignmentExpression') {
      const left = item.expression.left;
      if (left.type === 'MemberExpression' && nodeName(left.object) === 'module' && nodeName(left.property) === 'exports') config = find(item.expression.right);
    }
  }
  if (config?.type !== 'ObjectExpression') return;
  const leaves = (node: Node): number => {
    const object = unwrap(node);
    if (object.type !== 'ObjectExpression') return object.type === 'ArrowFunctionExpression' || object.type === 'FunctionExpression' ? 0 : 1;
    let total = 0;
    for (const property of object.properties) if (property.type === 'Property') total += leaves(property.value as Node);
    return total;
  };
  let total = 0;
  for (const property of config.properties) if (property.type === 'Property' && nodeName(property.key as Node) === 'theme') total += leaves(property.value as Node);
  return total;
}

interface Bucket { tolerance: number; values: Map<string, { amount: number | Lab; files: Set<string> }>; colour?: boolean }
/** The brief's tolerances (section 2.3), used only to say how many distinct values sit within reach of another. */
const tolerances: Record<string, number> = { spacing: 1, radius: 1, 'type-size': 0.5, 'line-height': 0.05, 'letter-spacing': 0.01, duration: 20, color: 0.02 };

/** Literal values in use, per measure; the count of those within the merge tolerance of another. */
export function nearValues(report: Report, root: string): StateNumbers['values'] {
  const buckets = new Map<string, Bucket>();
  const add = (name: string, key: string, amount: number | Lab, from: string) => {
    let bucket = buckets.get(name);
    if (!bucket) buckets.set(name, bucket = { tolerance: tolerances[name]!, values: new Map(), ...(name === 'color' ? { colour: true } : {}) });
    const entry = bucket.values.get(key) ?? { amount, files: new Set<string>() };
    entry.files.add(from); bucket.values.set(key, entry);
  };
  for (const declaration of report.declarations) {
    if (declaration.opaque || !isJudged(declaration)) continue;
    const text = declaration.resolved ?? declaration.value, from = file(root, declaration.site.file);
    for (const family of familiesFor(declaration.prop)) {
      if (family === 'spacing' || family === 'radius') {
        for (const part of components(text)) { const amount = pixels(part); if (amount !== undefined && amount > 0) add(family, String(amount), amount, from); }
      } else if (family === 'type') {
        if (declaration.prop === 'font-size') { const amount = pixels(text); if (amount !== undefined && amount > 0) add('type-size', String(amount), amount, from); }
        else if (declaration.prop === 'line-height' && /^(?:\d*\.)?\d+$/.test(text.trim())) add('line-height', text.trim(), Number(text), from);
        else if (declaration.prop === 'letter-spacing') { const match = /^(-?(?:\d*\.)?\d+)em$/.exec(text.trim()); if (match) add('letter-spacing', match[1]!, Number(match[1]), from); }
      } else if (family === 'motion') {
        for (const match of text.matchAll(/(?<![\w.-])(-?(?:\d*\.)?\d+)(ms|s)\b/g)) { const amount = Number(match[1]) * (match[2] === 's' ? 1000 : 1); add('duration', String(amount), amount, from); }
      } else if (family === 'color') {
        for (const part of tokens(text)) {
          const lab = oklab(part);
          if (lab && lab[3] > 0) add('color', lab.map(n => n.toFixed(4)).join(','), lab, from);
        }
      }
    }
  }
  let distinct = 0, near = 0;
  const filesSeen = new Set<string>(), byFamily: Record<string, number> = {};
  for (const [name, bucket] of [...buckets].sort((a, b) => a[0].localeCompare(b[0]))) {
    const entries = [...bucket.values.values()];
    for (const entry of entries) for (const from of entry.files) filesSeen.add(from);
    distinct += entries.length; byFamily[name] = entries.length;
    if (bucket.colour) {
      const labs = entries.map(entry => entry.amount as Lab), close = new Array<boolean>(labs.length).fill(false);
      for (let i = 0; i < labs.length; i++) for (let j = i + 1; j < labs.length; j++) {
        if (Math.hypot(labs[i]![0] - labs[j]![0], labs[i]![1] - labs[j]![1], labs[i]![2] - labs[j]![2]) <= bucket.tolerance && labs[i]![3] === labs[j]![3]) close[i] = close[j] = true;
      }
      near += close.filter(Boolean).length;
    } else {
      // Single linkage over the sorted amounts: a value is near when a neighbour is within the merge tolerance.
      const amounts = entries.map(entry => entry.amount as number).sort((a, b) => a - b);
      for (let i = 0; i < amounts.length; i++) {
        if (i > 0 && amounts[i]! - amounts[i - 1]! <= bucket.tolerance + 1e-9 || i + 1 < amounts.length && amounts[i + 1]! - amounts[i]! <= bucket.tolerance + 1e-9) near++;
      }
    }
  }
  return { distinct, near, percent: pct(near, distinct), files: filesSeen.size, byFamily };
}

const darkCondition = /(?:^|[^\w-])\.dark\b|\[data-(?:theme|mode)[~|^$*]?=["']?dark|prefers-color-scheme\s*:\s*dark|\.theme-dark|\[class[~|^$*]?=["']?dark/i;
const rootOwner = (declaration: Declaration) => declaration.when.length > 0 && declaration.when.every(condition => condition.text === ':root' || condition.text === 'html');
const darkOwner = (declaration: Declaration) => declaration.when.some(condition => darkCondition.test(condition.text));

function ownTheme(report: Report, root: string): { conflicts: { name: string; files: string[]; values: string[] }[]; dark: StateNumbers['darkColours']; rootProperties: number } {
  const own = report.declarations.filter(declaration => declaration.origin === 'custom-property' && declaration.sourceOrigin !== 'framework' && !declaration.prop.startsWith('--tw-'));
  const light = own.filter(rootOwner), dark = own.filter(darkOwner);
  const byName = new Map<string, Declaration[]>();
  for (const declaration of light) byName.set(declaration.prop, [...byName.get(declaration.prop) ?? [], declaration]);
  const conflicts = [...byName].flatMap(([name, list]) => {
    const files = [...new Set(list.map(item => file(root, item.site.file)))].sort(), values = [...new Set(list.map(item => item.value))].sort();
    return files.length > 1 && values.length > 1 ? [{ name, files, values }] : [];
  }).sort((a, b) => a.name.localeCompare(b.name));
  const colours = new Set(light.filter(declaration => { const lab = oklab(declaration.value); return lab !== undefined && lab[3] > 0; }).map(declaration => declaration.prop));
  const withDark = new Set(dark.map(declaration => declaration.prop));
  return { conflicts, dark: { total: colours.size, withDark: [...colours].filter(name => withDark.has(name)).length }, rootProperties: byName.size };
}

/** Whether the project has a token of its own in a family. Tailwind's default `--spacing` is not one. */
function tokened(report: Report, root: string, family: JudgedFamily): boolean {
  if (report.decisions.some(decision => decision.family === family && decision.origin !== 'framework')) return true;
  const unit = report.numericSpacing;
  if (family !== 'spacing' || !unit || unit.replaced) return false;
  const path = relative(root, unit.unit.source.file).replaceAll('\\', '/');
  return !path.startsWith('../') && !path.split('/').includes('node_modules');
}

function families(report: Report, root: string): Partial<Record<JudgedFamily, FamilyState>> {
  const result: Partial<Record<JudgedFamily, FamilyState>> = {};
  for (const family of judgedFamilies) {
    const coverage = report.coverage[family];
    if (coverage.total <= 0) continue;
    const frameworkKeys = report.findings.filter(finding => finding.rule === `provenance/${family}/framework`).reduce((sum, finding) => sum + finding.sites.length, 0);
    result[family] = { total: coverage.total, onTokens: coverage.fromDecisions, off: coverage.findings, percent: pct(coverage.fromDecisions, coverage.total),
      tokened: tokened(report, root, family), frameworkKeys };
  }
  return result;
}

const empty = (partial: Partial<StateNumbers> = {}): StateNumbers => ({
  files: { source: 0, css: 0 }, tailwind: { major: null, declared: null, entry: null, prefix: null }, families: {}, tokens: { project: 0, exported: 0 },
  arbitrary: { declarations: 0, judged: 0, percent: 0 }, inline: { sites: 0, literal: 0, percent: 0 }, values: { distinct: 0, near: 0, percent: 0, files: 0, byFamily: {} },
  unusedTokens: { total: 0, dead: 0, percent: 0 }, darkColours: { total: 0, withDark: 0 }, entries: 0, rootProperties: 0, unreadable: { files: 0, stylesheets: 0 }, libraries: [], ...partial,
});

function blocked(kind: string, sentence: string, next: string, numbers: StateNumbers, flags: Flag[] = [], evidence: Evidence[] = []): ProjectState {
  return { schemaVersion: 1, rung: 'R0', name: rungNames.R0, kind, flags: [...new Set(flags)].sort(), sentence, next, numbers, evidence };
}

/** The state of a project, named from evidence: docs/briefs/onboarding.md section 1. Writes nothing. */
export async function readState(options: StateOptions): Promise<ProjectState> {
  const state = await stateOf(options);
  // The report header reads the sentence only; `state` itself carries the facts.
  return options.report ? state : { ...state, facts: publicFacts(await projectFacts(resolve(options.root))) };
}
async function stateOf(options: StateOptions): Promise<ProjectState> {
  const root = resolve(options.root);
  if (!options.report) {
    const { workspace, apps } = await workspaceApps(root);
    if (workspace) {
      const listed = apps.map(app => ({ path: app.path, kind: app.kind }));
      const names = listed.map(app => app.path);
      return blocked('workspace', `${count(listed.length, 'app')}${names.length ? `: ${names.join(', ')}` : ''}. Run in one: --root ${names[0] ?? 'path/to/app'}.`,
        `plumber state --root ${names[0] ?? 'path/to/app'}`, empty({ apps: listed }), ['split'], [{ about: 'Apps in this workspace', files: names }]);
    }
  }
  const loaded = await loadConfig(root, options.config);
  const config: PlumbConfig = loaded.value;
  const metadata = await packageMetadata(root);
  const dependencies = { ...metadata.dependencies, ...metadata.devDependencies, ...metadata.peerDependencies };
  const declared = dependencies.tailwindcss ?? null;
  const declaredMajor = declared?.match(/\d+/)?.[0];
  const installed = await resolvedTailwind(root).catch(() => null);
  // Installed beats declared: what runs is what is judged (owner decision 1).
  const major = installed ? Number(installed.split('.')[0]) : declaredMajor !== undefined ? Number(declaredMajor) : null;
  const facts = await projectFacts(root);
  const libraries = [...new Set((facts.libraries.value ?? []).map(item => String(item.detail?.package ?? '').replace(/^(@[^/]+)\/.*$/, '$1')))].sort();
  const styledDependency = Object.keys(dependencies).filter(name => styledPattern.test(name)).sort()[0];
  const everything = await projectSourceFiles(root, config);
  const sources = everything.filter(item => /\.[jt]sx?$/.test(item));
  const cssFiles = everything.filter(item => item.endsWith('.css'));
  const files = { source: sources.length, css: cssFiles.length };
  const candidates = config.css === undefined ? await tailwindEntryCandidates(root) : [];
  const entryPaths = config.css === undefined ? candidates.map(item => file(root, item)) : [];
  const flags: Flag[] = [];
  if (candidates.length > 1) flags.push('split');
  const designTokens = await matchProjectFiles(root, '**/*.tokens.json');
  if (designTokens.length || Object.values(config.decisions ?? {}).some(source => [source.from].flat().some(item => typeof item === 'string' && item.startsWith('dtcg:')))) flags.push('dtcg');
  const evidence: Evidence[] = [];
  if (candidates.length > 1) evidence.push({ about: 'Tailwind entries', files: entryPaths });
  if (designTokens.length) evidence.push({ about: 'Design tokens JSON', files: designTokens.map(item => file(root, item)).sort() });
  const base = empty({ files, tailwind: { major, declared, entry: null, prefix: null }, entries: config.css === undefined ? candidates.length : 1, libraries });

  // R0: the project cannot be judged yet. One named step out.
  if (major === 3) {
    const found = await Promise.all(['js', 'cjs', 'mjs', 'ts'].map(extension => readFile(resolve(root, `tailwind.config.${extension}`), 'utf8').then(text => ({ extension, text }), () => undefined)));
    const configFile = found.find(item => item !== undefined);
    const values = configFile ? themeValues(configFile.text, `tailwind.config.${configFile.extension}`) : undefined;
    const version = installed?.startsWith('3.') ? installed.split('.').slice(0, 2).join('.') : declared?.match(/\d+(?:\.\d+)?/)?.[0] ?? '3';
    return blocked('v3', `Tailwind ${version}: Plumber judges Tailwind 4.${values ? ` Your ${count(values, 'theme value')} ${plural(values, 'comes', 'come')} with the upgrade.` : ''}`,
      'npx @tailwindcss/upgrade', { ...base, ...(values !== undefined ? { themeValues: values } : {}) }, flags, evidence);
  }
  if (!sources.length) {
    return blocked('no-source', 'No React source under src/ or app/. Set source in plumber.config.ts.', 'set source in plumber.config.ts', base, flags, evidence);
  }
  if (declared !== null || installed !== null) {
    // A declared Tailwind that is not installed cannot be read.
    const discovered = options.report ? undefined : await discoverProject(root, config).catch(() => undefined);
    if (discovered) {
      const problem = await tailwindSetupProblem(root, discovered.tailwind.entry, discovered.tailwind.version);
      if (problem && /not installed/.test(problem)) {
        return blocked('not-installed', problem.split('\n')[0]!, `${packageManager(root)} install`, base, flags, evidence);
      }
    }
  }

  let report = options.report;
  if (!report) {
    const run = (entry?: string) => check({ root, ...(options.config ? { config: options.config } : {}), ...(entry ? { entry } : {}) });
    try { report = await run(); }
    catch (error) {
      // Several Tailwind entries with no way to tell which the app uses: say so as a flag and read the first.
      if (!(error instanceof UsageError) || !/^Multiple Tailwind entry files/.test(error.message) || !candidates[0]) throw error;
      report = await run(candidates[0]);
    }
  }
  const entry = report.tailwind.entry;
  const entryText = entry ? await readFile(entry, 'utf8').catch(() => '') : '';
  const prefix = /@import\s+["']tailwindcss["']\s+(?:[^;]*?\s)?prefix\(\s*([\w-]+)\s*\)/.exec(entryText)?.[1] ?? null;
  if (prefix) flags.push('prefixed');
  const used = judgedFamilies.filter(family => report!.coverage[family].total > 0);
  const state = families(report, root);

  const unreadableFindings = report.findings.filter(finding => finding.rule === 'config/unreadable');
  const unreadableFiles = [...new Set(unreadableFindings.flatMap(finding => finding.sites.map(site => file(root, site.file))))].sort();
  const readableSheets = report.stylesheets.filter(sheet => sheet.sourceOrigin === 'project').length;
  if (unreadableFiles.length) { flags.push('unreadable'); evidence.push({ about: "Files that can't be read", files: unreadableFiles }); }
  const unreadable = { files: unreadableFiles.length, stylesheets: readableSheets };

  const judgedClass = report.declarations.filter(declaration => (declaration.origin === 'class' || declaration.origin === 'arbitrary') && isJudged(declaration));
  const arbitraryCount = judgedClass.filter(declaration => declaration.origin === 'arbitrary').length;
  const arbitrary = { declarations: arbitraryCount, judged: judgedClass.length, percent: pct(arbitraryCount, judgedClass.length) };
  const inline = { sites: report.coverage.inline.sites, literal: report.coverage.inline.literalSites, percent: pct(report.coverage.inline.literalSites, report.coverage.inline.sites) };
  const values = nearValues(report, root);
  const dead = Object.values(report.deadDecisions ?? {}).reduce((sum, item) => ({ total: sum.total + (item?.total ?? 0), dead: sum.dead + (item?.dead ?? 0) }), { total: 0, dead: 0 });
  const unusedTokens = { ...dead, percent: pct(dead.dead, dead.total) };
  const theme = ownTheme(report, root);
  const projectDecisions = report.decisions.filter(decision => decision.origin === 'project');
  const exported = projectDecisions.filter(decision => decision.exported === true).length;
  const numbers: StateNumbers = { files, tailwind: { major, declared, entry: entry ? file(root, entry) : null, prefix }, families: state, tokens: { project: projectDecisions.length, exported },
    arbitrary, inline, values, unusedTokens, darkColours: theme.dark, entries: config.css === undefined ? Math.max(candidates.length, entry ? 1 : 0) : 1,
    rootProperties: theme.rootProperties, unreadable, libraries };

  // Flags: the health axis. Thresholds are the brief's (section 1.1), with a floor on tiny samples.
  if (arbitrary.judged > 0 && arbitrary.declarations * 10 >= arbitrary.judged || inline.sites >= 5 && inline.literal * 100 >= inline.sites * 40 || values.distinct >= 10 && values.near * 100 >= values.distinct * 30) flags.push('noisy');
  if (dead.total > 0 && dead.dead * 2 >= dead.total) flags.push('dead');
  if (theme.conflicts.length) {
    flags.push('conflicting');
    for (const conflict of theme.conflicts) evidence.push({ about: `${conflict.name} is defined more than once: ${conflict.values.join(' vs ')}`, files: conflict.files });
  }
  if (theme.dark.withDark > 0 && theme.dark.withDark < theme.dark.total) flags.push('dark-split');
  const styledTemplates = !styledDependency && (await Promise.all(sources.map(item => readFile(item, 'utf8').then(text => hasStyledTemplate(text, item), () => false)))).some(Boolean);
  if (styledDependency || styledTemplates) flags.push('styled-in-js');
  if (projectDecisions.length > 0 && exported * 2 > projectDecisions.length) flags.push('tokens-from-package');

  const uniqueFlags = [...new Set(flags)].sort() as Flag[];
  const judged = Object.values(state).reduce((sum, item) => sum + item.total, 0);
  const onTokens = Object.values(state).reduce((sum, item) => sum + item.onTokens, 0);
  const finish = (rung: Rung, kind: string, sentence: string, next: string): ProjectState => ({ schemaVersion: 1, rung, name: rungNames[rung], kind, flags: uniqueFlags, sentence, next, numbers, evidence });

  // R0 from the report: nothing readable, or styles that live where Plumber cannot read them.
  if (unreadableFiles.length && !readableSheets) {
    return { ...blocked('unreadable', `${count(unreadableFiles.length, 'file')} can't be read, so nothing is judged yet.`,
      'fix these files, or exclude them with source', numbers, uniqueFlags, evidence) };
  }
  if ((styledDependency || styledTemplates) && judged === 0 && !cssFiles.length) {
    return blocked('styled-in-js', `Styles live in ${styledDependency ?? 'CSS-in-JS templates'}${styledTemplates ? ` (${count(sources.length, 'file')})` : ''}. Plumber reads stylesheets, Tailwind classes and inline style.`,
      'use a stylesheet, Tailwind classes or inline style where Plumber can read them', numbers, uniqueFlags, evidence);
  }

  const presetNames = (report.presets ?? []).map(preset => preset.name);
  const kind = presetNames.length ? 'preset' : 'own';
  const tokenedFamilies = used.filter(family => state[family]!.tokened);
  const untokened = used.filter(family => !state[family]!.tokened);
  const overall = pct(onTokens, judged);
  const arbitraryOver = arbitrary.judged > 0 && arbitrary.declarations * 50 >= arbitrary.judged;
  const clean = used.length > 0 && !untokened.length && used.every(family => state[family]!.percent >= 90) && !arbitraryOver && numbers.entries <= 1;
  // One short sentence: the two clauses that matter most. The rest are in `flags` and `evidence`.
  const clause = (flag: Flag, text: string) => uniqueFlags.includes(flag) ? [text] : [];
  const clauses = [
    ...clause('split', `${numbers.entries} Tailwind entries`),
    ...clause('conflicting', `${count(theme.conflicts.length, 'token')} defined twice`),
    ...clause('unreadable', `${count(unreadableFiles.length, 'file')} can't be read`),
    ...clause('dead', `${count(dead.dead, 'token')} unused`),
    ...clause('dark-split', `dark values for ${theme.dark.withDark} of ${count(theme.dark.total, 'colour')}`),
    ...clause('noisy', arbitrary.judged > 0 && arbitrary.declarations * 10 >= arbitrary.judged ? `${arbitrary.percent}% of utilities are arbitrary values`
      : inline.sites >= 5 && inline.literal * 100 >= inline.sites * 40 ? `${inline.percent}% of inline styles are literals` : `${count(values.near, 'value')} sit within a hair of another`),
    ...clause('tokens-from-package', `tokens come from ${presetNames.find(name => name !== 'shadcn') ?? 'a package'}`),
    ...(prefix ? [`Tailwind prefix ${prefix}:`] : []),
    ...clause('styled-in-js', `some styles live in ${styledDependency ?? 'CSS-in-JS templates'}`),
    ...clause('dtcg', 'design tokens JSON found'),
  ].slice(0, 2);
  const withClauses = (sentence: string) => (clauses.length ? `${sentence.replace(/\.$/, '')}, ${clauses.join(', ')}.` : sentence);

  if (!tokenedFamilies.length) {
    if (entry === null) {
      return finish('R1', 'plain', withClauses(`No system yet: ${count(values.distinct, 'value')} in ${count(values.files, 'file')}${values.near ? `, ${values.near} of them near-duplicates` : ''}.`), 'plumber init');
    }
    const part = (family: string, one: string, many: string) => values.byFamily[family] ? [`${values.byFamily[family]} ${values.byFamily[family] === 1 ? one : many}`] : [];
    const used3 = [...part('type-size', 'type size', 'type sizes'), ...part('spacing', 'spacing step', 'spacing steps'), ...part('color', 'colour', 'colours')];
    return finish('R2', 'tailwind', withClauses(`Tailwind's scale, no decisions of your own${used3.length ? `: ${used3.join(', ')} in use` : ''}.`), 'plumber init');
  }
  if (clean) {
    return finish('R4', kind, withClauses(`A system, in use: every value family has your tokens and ${overall}% of values use them.`), 'plumber init');
  }
  const owner = presetNames.includes('shadcn') ? "shadcn's" : 'your';
  const keys = used.map(family => ({ family, share: pct(state[family]!.frameworkKeys, state[family]!.total) })).filter(item => item.share > 0)
    .sort((a, b) => b.share - a.share || a.family.localeCompare(b.family)).slice(0, 2);
  const tail = keys.length ? `${keys.map(item => `${item.share}% of ${colourName(item.family)}`).join(' and ')} still ${keys.length === 1 ? 'uses' : 'use'} Tailwind's keys`
    : untokened.length ? `${listOf(untokened.map(colourName))} still ${untokened.length === 1 ? 'has' : 'have'} no tokens` : `${overall}% of values use them`;
  return finish('R3', kind, withClauses(`A system, half in use: ${owner} tokens are installed; ${tail}.`), 'plumber init');
}

/** The human output of `plumber state`: the sentence, then the numbers that back it. */
export function formatState(state: ProjectState, table: (rows: string[][]) => string[]): string {
  const lines = [state.sentence, '', `${state.rung} ${state.name} · ${state.kind}${state.flags.length ? ` · ${state.flags.join(', ')}` : ''}`];
  const rows = Object.entries(state.numbers.families).map(([family, item]) => [colourName(family), `${item.onTokens.toLocaleString('en-US')} of ${item.total.toLocaleString('en-US')} on tokens`, `${item.percent}%`, item.tokened ? 'tokens' : 'no tokens']);
  if (rows.length) lines.push('', ...table(rows));
  const { arbitrary, inline, values, unusedTokens } = state.numbers;
  const facts = [
    arbitrary.judged ? `${arbitrary.percent}% arbitrary utilities (${arbitrary.declarations} of ${arbitrary.judged})` : '',
    inline.sites ? `${inline.literal} of ${count(inline.sites, 'style attribute')} literal` : '',
    values.distinct ? `${count(values.distinct, 'distinct value')}, ${values.near} near another` : '',
    unusedTokens.total ? `${unusedTokens.dead} of ${count(unusedTokens.total, 'token')} unused` : '',
  ].filter(Boolean);
  if (facts.length) lines.push('', ...facts.map(fact => `  ${fact}`));
  for (const item of state.evidence) lines.push('', `  ${item.about}`, ...item.files.slice(0, 6).map(path => `    ${path}`), ...(item.files.length > 6 ? [`    +${item.files.length - 6} more`] : []));
  lines.push('', `Next: ${state.next}`);
  return lines.join('\n') + '\n';
}
