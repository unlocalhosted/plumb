import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, realpath, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';
import { check } from '../index.js';
import { projectDecision } from '../decisions/availability.js';
import type { Report, JudgedFamily } from '../report.js';
import { loadConfig } from '../config.js';
import { allConfigNames, statePath } from '../paths.js';
import { dataConfig } from '../data-config.js';
import { CheckCache } from '../check-cache.js';
import { defaultSource, discoverProject, projectSourceFiles } from '../project.js';
import { containsPath, sourceBoundary } from '../source-boundary.js';
import { tailwindSetupProblem, packageManager } from '../setup-messages.js';
import { readLedger } from '../ledger/store.js';
import { UsageError, userMessage } from '../errors.js';
import { diff, parse, walk } from '../adoption/overlay.js';
import { nodeName } from '../collect/source.js';
import { atomicWrite } from '../atomic-write.js';
import { addSourceGlobs, hostConfig, installedRefresh } from './config.js';
import { table, wrap } from '../cli-table.js';
import { count } from '../messages.js';

export type Capability = 'read' | 'remember' | 'fast' | 'locate' | 'preview' | 'write' | 'blueprint' | 'system';
export type Status = 'ok' | 'missing' | 'unknown';
export interface Evidence { file: string; line: number; text: string }
export type Fix = { kind: 'diff'; file: string; hash: string; diff: string; dirty: boolean } | { kind: 'step'; instruction: string; command: string };
export interface Requirement {
  id: string; capability: Capability; status: Status; title: string;
  evidence: Evidence[]; loses: string; fix: Fix | null;
  derived?: boolean; cause?: string;
}
export interface ReadinessReport {
  schemaVersion: 1;
  capabilities: { id: Capability; label: string; status: 'full' | 'degraded' | 'off'; requirements: string[]; available?: boolean }[];
  requirements: Requirement[];
}
/** Trusted host observations only. HTTP input cannot set these facts. */
export interface Runtime {
  host: 'vite' | 'next-webpack' | 'next-turbopack';
  development: boolean;
  plugin: boolean;
  fastRefresh?: boolean;
  hmr?: boolean;
  polling?: boolean;
  watching?: boolean;
}
export interface ReadinessOptions { root: string; config?: string; runtime?: Runtime; report?: () => Promise<Report>; sourceEvidence?: () => Promise<string[]> }
const labels: Record<Capability, string> = { read: 'Read', remember: 'Remember', fast: 'Fast', locate: 'Locate', preview: 'Preview', write: 'Write in place', blueprint: 'Blueprint', system: 'System panel' };
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const status = (value: boolean | undefined): Status => value === undefined ? 'unknown' : value ? 'ok' : 'missing';
const step = (instruction: string, command: string): Fix => ({ kind: 'step', instruction, command });
function dirty(root: string, file: string): boolean {
  const git = spawnSync('git', ['-C', root, 'status', '--porcelain=v1', '--untracked-files=all', '--', file], { encoding: 'utf8' });
  // Without Git there is no clean baseline to prove; confirmation is required.
  if (git.status !== 0 || git.stdout.trim() !== '') return true;
  const tracked = spawnSync('git', ['-C', root, 'ls-files', '--error-unmatch', '--', file], { encoding: 'utf8' });
  return tracked.status !== 0;
}
async function ownConfig(root: string, file: string): Promise<void> {
  const own = await realpath(root), target = await realpath(file), path = relative(own, target);
  if (!/^(?:vite|next|plumb|plumber)\.config\.(?:ts|mts|js|mjs|cjs)$/.test(relative(root, file)) || path.startsWith('..') || isAbsolute(path) || target !== join(own, basename(file))) {
    throw new UsageError('Readiness fixes only write the project’s own config files; symlinks are refused.');
  }
  if (!(await stat(target)).isFile()) throw new UsageError('Readiness fix needs a regular config file.');
}

async function sourceChange(options: ReadinessOptions, config: string): Promise<{ before: string; after: string } | undefined> {
  const root = resolve(options.root), observed = await options.sourceEvidence?.() ?? [];
  if (!observed.length || observed.some(file => !containsPath(sourceBoundary(root), file))) return;
  const loaded = await loadConfig(root, options.config), selected = new Set(await projectSourceFiles(root, loaded.value));
  const missing = observed.filter(file => !selected.has(file));
  if (!missing.length) return;
  const globs = [...new Set(missing.map(file => {
    const parts = relative(root, file).replaceAll('\\', '/').split('/');
    if (parts.length === 1) return parts[0]!;
    const first = parts.findIndex(part => part !== '..');
    return parts.slice(0, Math.min(first + 1, parts.length - 1)).join('/') + '/**';
  }))];
  const before = await readFile(config, 'utf8'), after = addSourceGlobs(config, before, globs, defaultSource);
  if (!after || after === before) return;
  // Exclusions and symlinks may still prevent checking. Never offer a diff
  // which fails to include the evidence it promises to resolve.
  const proposed = await projectSourceFiles(root, { ...loaded.value, source: [...(loaded.value.source ?? defaultSource), ...globs] });
  if (missing.some(file => !proposed.includes(file))) return;
  return { before, after };
}

export async function readiness(options: ReadinessOptions): Promise<ReadinessReport> {
  const root = resolve(options.root), runtime = options.runtime, requirements: Requirement[] = [];
  const add = (id: string, capability: Capability, state: Status, title: string, evidence: Evidence[], loses: string, fix: Fix | null, derived: Pick<Requirement, 'derived' | 'cause'> = {}) => {
    requirements.push({ id, capability, status: state, title, evidence, loses, fix: state === 'ok' ? null : fix, ...derived });
  };
  const config = options.config ? resolve(root, options.config) : allConfigNames.map(file => join(root, file)).find(existsSync);
  let loaded: Awaited<ReturnType<typeof loadConfig>> | undefined, configError = '';
  try { loaded = await loadConfig(root, options.config); } catch (error) { configError = userMessage(error); }
  const configFile = config ? relative(root, config) : 'plumber.config.ts';
  let exportLine = 1, presetLine = 1;
  if (config) try {
    const source = await readFile(config, 'utf8'), ast = parse(config, source);
    const line = (offset: number) => source.slice(0, offset).split('\n').length;
    for (const item of ast.body) if (item.type === 'ExportDefaultDeclaration') exportLine = line(item.start);
    walk(ast, node => { if (node.type === 'Property' && nodeName(node.key) === 'presets') presetLine = line(node.start); });
  } catch {}
  const configEvidence = [{ file: configFile, line: exportLine, text: configError || (config ? 'React Plumber config' : 'No React Plumber config') }];
  let report: Report | undefined, readStatus: Status = 'unknown', analysisError = '';
  try {
    if (loaded) {
      const project = await discoverProject(root, loaded.value), problem = await tailwindSetupProblem(root, project.tailwind.entry, project.tailwind.version);
      readStatus = problem ? 'missing' : 'ok';
      add('read.styles', 'read', readStatus, problem?.split('\n')[0] ?? (project.tailwind.entry ? 'Tailwind 4 is ready' : 'Plain CSS is ready'),
        [{ file: project.tailwind.entry ? relative(root, project.tailwind.entry) : 'package.json', line: 1, text: project.tailwind.version ?? 'plain CSS' }],
        'Drift cannot be judged against the CSS your app uses.', step('Install the project dependencies or upgrade Tailwind to version 4.', problem?.includes('upgrade') ? 'npx @tailwindcss/upgrade' : `${packageManager(root)} install`));
      if (readStatus === 'ok') report = await (options.report ? options.report() : check({ root, ...(options.config ? { config: options.config } : {}) }));
    }
  } catch (error) { analysisError = userMessage(error); }
  if (!requirements.some(item => item.id === 'read.styles')) add('read.styles', 'read', 'unknown', 'Styles could not be checked', configEvidence, 'Drift cannot be judged.', step(`Review the CSS entry and validation errors in ${configFile}, then run plumber doctor.`, 'plumber doctor'));
  for (const family of ['spacing', 'color', 'radius', 'type', 'motion', 'elevation', 'z'] as JudgedFamily[]) {
    const token = report ? projectDecision(report, family) : undefined;
    const needed = report ? (report.coverage[family].total > 0 || !!report.configHints?.[family]) : false;
    add(`read.tokens.${family}`, 'read', report ? token || !needed ? 'ok' : 'missing' : 'unknown',
      !report ? `${family} tokens need verification` : token ? `${family} tokens are ready` : needed ? `Your theme has no ${family} tokens` : `${family}: no values to judge`,
      token ? [{ file: relative(root, token.source.file), line: token.source.line, text: token.name }] : configEvidence,
      `${family} values cannot be judged against your tokens.`, step(`Add ${family} tokens to your theme, or set decisions.${family}.from in ${configFile}.`, 'plumber doctor'));
  }
  let baseline: Status = 'unknown', ledgerText = 'Ledger could not be read';
  try { const ledger = await readLedger(root); baseline = ledger.exists ? 'ok' : 'missing'; ledgerText = ledger.exists ? 'Ledger baseline exists' : 'No ledger baseline'; } catch (error) { ledgerText = userMessage(error); }
  add('remember.baseline', 'remember', baseline, ledgerText, [{ file: relative(root, statePath(root, 'ledger.jsonl')), line: 1, text: ledgerText }], 'Every finding counts as new.', baseline === 'unknown' ? step(`Repair ${relative(root, statePath(root, 'ledger.jsonl'))}, then run plumber doctor.`, 'plumber doctor') : step('Review today’s drift, then record it as debt.', 'plumber baseline'));
  const plain = config ? await dataConfig(config) : undefined;
  let eligible = false, cacheUnknown = false;
  try { eligible = plain ? !!await CheckCache.create({ root, ...(config ? { config } : {}) }) : false; } catch { cacheUnknown = true; }
  add('fast.config', 'fast', configError || cacheUnknown ? 'unknown' : eligible ? 'ok' : 'missing', eligible ? 'Warm runs reuse the whole report' : 'Warm runs cannot reuse the whole report', configEvidence,
    'Each run repeats analysis instead of reusing the whole report.', step(plain ? 'Remove executable presets or CSS plugins, or keep the normal analysis path.' : `Use a plain-data default export in ${configFile}: no imports, calls or functions.`, config ? 'plumber doctor' : 'plumber init'));

  let host: Awaited<ReturnType<typeof hostConfig>>;
  try { host = await hostConfig(root); } catch { /* An unreadable host config is unknown. */ }
  const hostFile = host ? relative(root, host.file) : 'package.json';
  const evidence = (key: string, text: string): Evidence[] => [{ file: hostFile, line: host ? host.source.slice(0, host.offsets[key] ?? 0).split('\n').length : 1, text }];
  const manual = (instruction: string) => step(`${instruction} Review ${hostFile}, then run plumber doctor.`, 'plumber doctor');
  const configFix = async (id: string, fallback: Fix): Promise<Fix> => {
    const after = host?.changes[id];
    if (!host || !after || after === host.source) return fallback;
    try { await ownConfig(root, host.file); } catch { return fallback; }
    return { kind: 'diff', file: hostFile, hash: hash(host.source), diff: diff({ file: host.file, before: host.source, after }, root), dirty: dirty(root, host.file) };
  };
  let declaredHost: string | undefined;
  try {
    const metadata = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as { scripts?: Record<string, string> };
    const commands = Object.values(metadata.scripts ?? {}).join(' ');
    declaredHost = /(?:^|\s)(vite|next)(?:\s|$)/.exec(commands)?.[1] ?? /(?:^|\s)(react-scripts|parcel|astro)(?:\s|$)/.exec(commands)?.[1];
  } catch {}
  const hostState: Status = runtime || host || declaredHost === 'vite' || declaredHost === 'next' ? 'ok' : declaredHost ? 'missing' : 'unknown';
  add('locate.host', 'locate', hostState, runtime ? `${runtime.host} dev server is running` : host ? `${host.host} config found; runtime not observed` : declaredHost ? `${declaredHost} is declared in package.json` : 'Host could not be established', evidence('plugin', runtime?.host ?? host?.host ?? declaredHost ?? 'No single supported host config found'),
    'Clicking an element may not locate its source.', step('Run the app with Vite or Next.js in development.', `${packageManager(root)} run dev`));
  const plugin = runtime?.plugin ?? host?.plugin;
  const observed = await options.sourceEvidence?.() ?? [];
  const selected = loaded ? new Set(await projectSourceFiles(root, loaded.value).catch(() => [])) : new Set<string>();
  const unchecked = observed.filter(file => !selected.has(file));
  let sourceFix: Fix = step(`Add the shared files to source in ${configFile}, within the repository/workspace root.`, 'plumber doctor');
  if (config && unchecked.length) try {
    await ownConfig(root, config);
    const change = await sourceChange(options, config);
    if (change) sourceFix = { kind: 'diff', file: configFile, hash: hash(change.before), diff: diff({ file: config, before: change.before, after: change.after }, root), dirty: dirty(root, config) };
  } catch { /* Opaque, excluded or unowned source needs manual config review. */ }
  add('locate.source', 'locate', !loaded ? 'unknown' : unchecked.length ? 'missing' : 'ok', unchecked.length ? 'Rendered source is outside source' : 'No observed rendered source outside source',
    unchecked.length ? unchecked.slice(0, 3).map(file => ({ file: relative(root, file).replaceAll('\\', '/'), line: 1, text: 'Rendered element: outside source' })) : configEvidence,
    'These rendered elements are not checked; Blueprint cannot judge them.', sourceFix);
  add('locate.plugin', 'locate', status(plugin), plugin ? 'React Plumber dev plugin is present' : 'React Plumber dev plugin is not established', evidence('plugin', plugin ? 'plumb() / withPlumb()' : 'Dev plugin not established'),
    'Clicking an element cannot locate its source.', await configFix('locate.plugin', step('Add React Plumber to the dev host.', 'plumber install --overlay --write')));
  add('locate.order', 'locate', status(host?.ordered), host?.ordered ? 'React Plumber precedes JSX transforms' : host?.ordered === false ? 'React Plumber must precede JSX transforms' : 'JSX plugin order needs verification', evidence('plugin', 'Plugin order relative to JSX transforms'),
    'Source locations may point at transformed code.', await configFix('locate.order', manual('Move plumb() before plugins that transform JSX/TSX.')));
  let react = false;
  try { createRequire(join(root, 'package.json')).resolve('react'); react = true; } catch {}
  const reactDev = !react ? 'missing' : runtime ? status(runtime.development) : 'unknown';
  add('locate.react-dev', 'locate', reactDev, reactDev === 'ok' ? 'Development host has React installed' : 'React development build needs verification', [{ file: 'package.json', line: 1, text: react ? 'React resolves; browser fibers are not inspected by the server' : 'React does not resolve' }],
    'Clicking an element may not find its React component.', step(react ? 'Run the development app; production React has no development source fibers.' : 'Install React in the project.', react ? `${packageManager(root)} run dev` : `${packageManager(root)} ${packageManager(root) === 'npm' ? 'install' : 'add'} react react-dom`));
  const dependency = (id: string, capability: Capability, prefix: Capability, title: string, loses: string) => {
    const checks = requirements.filter(item => item.capability === prefix);
    const state = checks.some(item => item.status === 'missing') ? 'missing' : checks.some(item => item.status === 'unknown') ? 'unknown' : 'ok';
    const blocked = state === 'ok' ? undefined : checks.find(item => item.status === state);
    const cause = blocked?.cause ?? blocked?.id;
    add(id, capability, state, title, blocked?.evidence ?? evidence('plugin', title), loses, step(`Resolve ${labels[prefix]} requirements first.`, cause ? `plumber fix ${cause}` : 'plumber doctor'), { derived: true, ...(cause ? { cause } : {}) });
  };
  dependency('preview.locate', 'preview', 'locate', 'Preview needs source locations', 'Tokens cannot be previewed at the selected source.');
  dependency('write.locate', 'write', 'locate', 'Writing needs source locations', 'The selected component cannot be written safely.');
  const next = runtime?.host.startsWith('next-');
  const refresh = runtime?.fastRefresh ?? (next ? true : host?.refresh);
  const manager = packageManager(root);
  const refreshStep = installedRefresh(join(root, 'package.json'))
    ? manual('Add the installed React Fast Refresh plugin immediately after plumb(); this config needs manual review.')
    : step('Install the React Fast Refresh plugin, then rerun plumber doctor to review the config diff.', `${manager} ${manager === 'npm' ? 'install' : 'add'} -D @vitejs/plugin-react`);
  add('write.refresh', 'write', status(refresh), refresh ? 'React Fast Refresh is present' : 'React Fast Refresh is not established', evidence('plugin', 'React Fast Refresh plugin'),
    'Every write reloads the whole page and loses its state, instead of swapping the component in place.', await configFix('write.refresh', refreshStep));
  const hmr = runtime?.hmr ?? host?.hmr;
  add('write.hmr', 'write', status(hmr), hmr === false ? 'Hot updates are off' : hmr ? 'Hot updates are enabled' : 'Hot updates could not be checked', evidence('hmr', `server.hmr: ${hmr === undefined ? 'not established' : hmr}`),
    'Writes reload the page instead of updating it in place.', await configFix('write.hmr', manual('Remove server.hmr: false from the dev config.')));
  // WSL/Docker can be established from the host environment. A network mount
  // cannot be detected portably: PLUMBER_WATCH_ENV is an explicit host hint.
  const watchEnvironment = process.env.PLUMBER_WATCH_ENV ?? (process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP ? 'wsl' : existsSync('/.dockerenv') ? 'docker' : 'native');
  const needsPolling = ['wsl', 'docker', 'network'].includes(watchEnvironment);
  const polling = runtime?.polling ?? host?.polling;
  const watching = runtime?.watching ?? host?.watching;
  const watcherStatus: Status = watching === false ? 'missing' : needsPolling ? status(polling) : 'unknown';
  add('write.watcher', 'write', watcherStatus, watching === false ? 'File watching is disabled' : needsPolling ? polling ? `Polling is enabled for ${watchEnvironment}` : `${watchEnvironment} needs file polling` : 'File watching needs a real save to verify', evidence('watcher', `server.watch.usePolling: ${polling ?? 'not established'}; environment: ${watchEnvironment}`),
    'The dev server may miss writes, leaving the page unchanged.', await configFix('write.watcher', manual('Set server.watch.usePolling: true, interval: 100 and awaitWriteFinish, then verify a source save.')));
  dependency('blueprint.locate', 'blueprint', 'locate', 'Blueprint needs source locations', 'Alt+B cannot connect drift to its source.');
  add('blueprint.host', 'blueprint', hostState, 'Blueprint needs a supported host', evidence('plugin', runtime?.host ?? host?.host ?? declaredHost ?? 'Host not established'), 'Alt+B may not show every drift in view.', step('Run a supported Vite or Next.js development app.', `${manager} run dev`));
  dependency('system.blueprint', 'system', 'blueprint', 'System panel needs Blueprint', 'The system panel cannot connect tokens to the page.');
  const presets = report?.presets ?? loaded?.presets ?? [];
  add('system.preset', 'system', loaded ? presets.length ? 'ok' : 'missing' : 'unknown', presets.length ? 'A preset is selected' : 'No preset is selected', [{ file: configFile, line: presetLine, text: presets.length ? presets.map(item => item.name).join(', ') : 'No loaded preset' }],
    'The system panel has no preset to review or fill.', step('Choose a preset in your React Plumber config.', 'plumber presets'));
  return { schemaVersion: 1, capabilities: (Object.keys(labels) as Capability[]).map(id => {
    const checks = requirements.filter(item => item.capability === id), missing = checks.some(item => item.status === 'missing'), unknown = checks.some(item => item.status === 'unknown');
    const essentialMissing = checks.some(item => item.status === 'missing' && (item.id.startsWith('read.') || item.id.startsWith('locate.') || item.id.endsWith('.locate') || item.id.endsWith('.blueprint') || item.id === 'system.preset'));
    return { id, label: labels[id], status: essentialMissing ? 'off' : missing || unknown ? 'degraded' : 'full', requirements: checks.map(item => item.id), ...(id === 'system' ? { available: false } : {}) };
  }), requirements };
}

const applying = new Set<string>();
/** Regenerate the one approved patch; never accept a client-supplied path/diff. */
export async function applyReadinessFix(options: ReadinessOptions, request: { id: string; hash: string; confirm: boolean; allowDirty?: boolean }): Promise<{ id: string; file: string; diff: string; hash: string }> {
  const root = await realpath(options.root);
  if (request.confirm !== true) throw new UsageError('Show the diff and confirm before applying this fix.');
  if (applying.has(root)) throw new UsageError('Another readiness fix is applying. Read readiness again.');
  applying.add(root);
  try {
    const report = await readiness(options), requirement = report.requirements.find(item => item.id === request.id), fix = requirement?.fix;
    if (!fix || fix.kind !== 'diff') throw new UsageError('This requirement has no applicable diff. Follow its step, then run plumber doctor.');
    if (fix.hash !== request.hash) throw new UsageError('Config changed since the diff was shown. Read readiness again.');
    const file = resolve(root, fix.file);
    await ownConfig(root, file);
    if (dirty(root, file) && request.allowDirty !== true) throw new UsageError('Config has uncommitted changes. Confirm the dirty file before applying (allowDirty: true).');
    const current = await readFile(file, 'utf8');
    if (hash(current) !== request.hash) throw new UsageError('Config changed since the diff was shown. Read readiness again.');
    const host = request.id === 'locate.source' ? undefined : await hostConfig(root);
    const source = request.id === 'locate.source' ? await sourceChange(options, file) : undefined;
    const after = source?.after ?? host?.changes[request.id];
    if (!after || (source?.before ?? host?.source) !== current) throw new UsageError('Config changed. Read readiness again.');
    await ownConfig(root, file);
    if (hash(await readFile(file, 'utf8')) !== request.hash) throw new UsageError('Config changed. Read readiness again.');
    await atomicWrite(file, after, { mode: (await stat(file)).mode & 0o777 });
    return { id: request.id, file: fix.file, diff: fix.diff, hash: hash(after) };
  } finally { applying.delete(root); }
}

/** Causes for capabilities that exist today; shared by doctor counts and exit status. */
export function actionableRequirements(report: ReadinessReport): Requirement[] {
  const unavailable = new Set(report.capabilities.filter(item => item.available === false).map(item => item.id));
  return report.requirements.filter(item => !item.derived && !unavailable.has(item.capability));
}

export function formatReadiness(report: ReadinessReport): string {
  const requirements = actionableRequirements(report);
  const missing = requirements.filter(item => item.status === 'missing'), unknown = requirements.filter(item => item.status === 'unknown');
  let output = `Readiness: ${count(missing.length, 'setup gap')} · ${count(unknown.length, 'check needs verification', 'checks need verification')}\n`;
  output += table(report.capabilities.map(item => [item.available === false ? 'unavailable' : item.status, item.label]), [{ width: 11 }, { weight: 1 }], { indent: 2 }).join('\n') + '\n';
  for (const item of requirements) {
    output += wrap(`\n  ${item.status === 'ok' ? 'ok' : item.status === 'missing' ? 'fix' : '?'} ${item.title} [${item.id}]`) + '\n';
    output += wrap(`     ${item.evidence.map(evidence => `${evidence.file}:${evidence.line} ${evidence.text}`).join(' · ')}`) + '\n';
    if (item.status !== 'ok') {
      output += wrap(`     ${item.loses}`) + '\n';
      if (item.fix?.kind === 'step') output += wrap(`     ${item.fix.instruction}`) + '\n';
      if (item.fix) output += wrap(`     ${item.fix.kind === 'diff' ? `plumber fix ${item.id}` : item.fix.command}`) + '\n';
    }
  }
  return output;
}
