import { statePath } from '../paths.js';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { loadConfig } from '../config.js';
import type { PlumbConfig, DecisionSource } from '../config.js';
import { check } from '../index.js';
import { UsageError } from '../errors.js';
import { currentDecisions, decisionEntry, findingGroups } from '../ledger/keys.js';
import { author } from '../ledger/git.js';
import { entryCount, readLedger, writeLedger } from '../ledger/store.js';
import { defaultSource, projectSourceFiles } from '../project.js';
import { discoverComponents } from '../ownership/components.js';
import { judgedFamilies, isJudged, partsFor } from '../rules/families.js';
import type { Decision, Family, Report } from '../report.js';
import { familyFor } from '../decisions/index.js';

const defaults = ['hover-gate', 'focus-outline', 'transition-named', 'no-ease-in'];
const pathFrom = (root: string, file: string) => relative(root, file).replaceAll('\\', '/');

// Repeated literal values are proposals, never new theme tokens. Keep their
// source positions and inferred origin visible in config and the ledger.
function usageProposals(report: Report, family: Family): Decision[] {
  const values = new Map<string, { sites: Set<string>; source: Decision['source'] }>();
  for (const declaration of report.declarations) {
    if (!isJudged(declaration, family) || declaration.opaque || declaration.refs.length) continue;
    const value = declaration.resolved ?? declaration.value;
    for (const part of partsFor(family as typeof judgedFamilies[number], declaration.prop, value, new Map(), new Set())) {
      if (!/^(?:[-+]?\d*\.?\d+(?:px|rem|em|ms|s)?|#[\da-f]{3,8}|(?:rgb|hsl|oklch|oklab)\(.+\))$/i.test(part) || /^0(?:px|rem|em|ms|s)?$/.test(part)) continue;
      const group = values.get(part) ?? { sites: new Set<string>(), source: { file: pathFrom(report.root, declaration.site.file), line: declaration.site.line } };
      group.sites.add(JSON.stringify([declaration.site.file, declaration.site.line, declaration.site.column]));
      values.set(part, group);
    }
  }
  return [...values].filter(([, group]) => group.sites.size >= 3).sort(([a], [b]) => a.localeCompare(b)).map(([value, group]) => ({
    family, name: `inferred:${family}:${value}`, value, refs: [], origin: 'inferred', tier: 'primitive', why: '', source: group.source,
  }));
}

function decisionSources(report: Report): { sources: NonNullable<PlumbConfig['decisions']>; proposals: Map<Family, Decision[]> } {
  const sources: Partial<Record<Family, DecisionSource>> = {};
  const proposals = new Map<Family, Decision[]>();
  for (const decision of currentDecisions(report)) {
    const entry = sources[decision.family] ??= { inferred: true, from: [] };
    // Name live files rather than freeze today's values. New theme keys remain
    // visible through the engine's independent decision inventory.
    const prefix = /^--[^-]+-/.exec(decision.name)?.[0];
    const pattern = prefix && familyFor(`${prefix}x`) === decision.family ? `${prefix}*` : decision.name;
    const source = decision.source.file.endsWith('.css') ? `css:${pathFrom(report.root, decision.source.file)}#${pattern}` : `theme:${pattern}`;
    const from = entry.from as string[];
    if (!from.includes(source)) from.push(source);
  }
  for (const family of judgedFamilies) if (!sources[family]) {
    const records = usageProposals(report, family);
    if (records.length) {
      proposals.set(family, records);
      sources[family] = { inferred: true, identity: 'value', origins: ['project', 'inferred'] };
    }
  }
  return { sources, proposals };
}

function componentSource(root: string): string | undefined {
  if (existsSync(join(root, 'src/components/ui'))) return 'directory:src/components/ui';
  if (existsSync(join(root, 'src/components'))) return 'directory:src/components';
}

export async function initProject(root: string, options: { config?: string; force?: boolean }, print: (text: string) => void): Promise<{ message: string; entries: import('../ledger/types.js').LedgerEntry[]; moves: never[] }> {
  const loaded = await loadConfig(root, options.config);
  if (loaded.path && !options.force) throw new UsageError(`Config already exists: ${pathFrom(root, loaded.path)}. Run plumber init --force to replace it after reviewing the diff.`);
  const ledger = await readLedger(root); // Refuse malformed state before writing config.
  const scratch = await mkdtemp(join(tmpdir(), 'plumb-init-'));
  try {
    const temporary = join(scratch, 'config.mjs');
    await writeFile(temporary, 'export default {};\n');
    const report = await check({ root, config: temporary, ledger: false, listHabits: true });
    const { sources, proposals } = decisionSources(report);
    let from = componentSource(root);
    if (existsSync(join(root, 'components.json'))) {
      const shadcn = JSON.parse(await readFile(join(root, 'components.json'), 'utf8')) as { aliases?: { ui?: string; components?: string } };
      from = shadcn.aliases?.ui ?? shadcn.aliases?.components ?? 'directory:src/components/ui';
    }
    const components = discoverComponents(root, await projectSourceFiles(root, {}), {}, new Map(), true).components;
    const config: PlumbConfig = { ...(report.tailwind.entry ? { css: pathFrom(root, report.tailwind.entry) } : {}), source: defaultSource,
      decisions: sources, ...(from ? { components: { from } } : {}), habits: defaults };
    const functions = new Map<string, string>();
    for (const [family, records] of proposals) {
      config.decisions![family]!.from = () => records;
      functions.set(`__plumb_${family}__`, `() => ${JSON.stringify(records, null, 2)}`);
    }
    const serialized = JSON.stringify(config, (_key, value: unknown) => {
      if (typeof value !== 'function') return value;
      const family = [...proposals].find(([, records]) => value() === records)![0];
      return `__plumb_${family}__`;
    }, 2).replace(/"(__plumb_\w+__)"/g, (match, key: string) => functions.get(key) ?? match);
    let text = '// Inferred by React Plumber. Review token sources and habits with the design owner.\n' +
      [...proposals].map(([family, records]) => `// ${family}: inferred from values used at three or more locations; 0 of ${records.length} have a reason.\n`).join('') +
      `// Components: ${components.length} found${from ? ` from ${from}` : ''}.\n` +
      components.map(component => `// ${component.name}: ${pathFrom(root, component.source.file)}:${component.source.line}\n`).join('') +
      `export default ${serialized};\n`;
    const habits = report.habits ?? [];
    text = text.replace(/"habits": \[[\s\S]*?\n  \]/, '"habits": [\n' + habits.map(habit =>
      `    ${defaults.includes(habit.id) ? '' : '// '}${JSON.stringify(habit.id)}, // ${habit.breaks ?? 0} breaks`).join('\n') + '\n  ]');
    // Validate and judge the proposed config before touching the destination.
    const proposedPath = join(scratch, 'proposed.mjs');
    await writeFile(proposedPath, text);
    const adopted = await check({ root, config: proposedPath, ledger: false });
    const by = author(root), stamp = { on: new Date().toISOString().slice(0, 10), ...(by ? { by } : {}) };
    const accepted = new Map(ledger.entries.map(entry => [entry.key, entry]));
    for (const decision of currentDecisions(adopted)) accepted.set(`decision:${decision.family}:${decision.name}`, { ...decisionEntry(decision), ...stamp, why: decision.why, inferred: true });
    const debt = [...findingGroups(adopted).values()].map(group => group.entry);
    for (const entry of debt) {
      const previous = accepted.get(entry.key);
      // Init can propose config again, but cannot silently grow an adopted baseline.
      if (ledger.exists && (previous?.kind !== 'debt' && previous?.kind !== 'exception' || previous && entryCount(entry) > entryCount(previous))) {
        throw new UsageError('Init refuses new debt in an existing ledger. Fix new findings or run plumber baseline --force after review.');
      }
      if (previous?.kind !== 'exception') accepted.set(entry.key, { ...entry, ...stamp });
    }
    const destination = loaded.path ?? resolve(root, options.config ?? 'plumber.config.ts');
    const before = loaded.path ? await readFile(destination, 'utf8') : '';
    if (loaded.path) print(`--- ${pathFrom(root, destination)}\n+++ ${pathFrom(root, destination)}\n@@ config before / after @@\n` +
      before.trimEnd().split('\n').map(line => `-${line}`).join('\n') + '\n' + text.trimEnd().split('\n').map(line => `+${line}`).join('\n') + '\n');
    await mkdir(resolve(destination, '..'), { recursive: true });
    await writeFile(destination, text, { flag: loaded.path ? 'w' : 'wx' });
    try { await writeLedger(root, [...accepted.values()]); }
    catch (error) { if (loaded.path) await writeFile(destination, before); else await rm(destination); throw error; }
    await rm(statePath(root, '.baseline-pending'), { force: true });
    return { message: `Wrote ${pathFrom(root, destination)} with inferred token sources.\nComponents: ${components.length} found${from ? ` from ${from}` : ''}.\nBaseline: ${debt.length} debt entries (${debt.reduce((sum, entry) => sum + entryCount(entry), 0)} locations) in ${pathFrom(root, statePath(root, 'ledger.jsonl'))}.\nAccepted ${currentDecisions(adopted).length} tokens as inferred.\nNext steps: run plumber install --ci.`, entries: [...accepted.values()], moves: [] };
  } finally { await rm(scratch, { recursive: true, force: true }); }
}
