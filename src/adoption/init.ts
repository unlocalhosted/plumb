import { statePath } from '../paths.js';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { hasShadcnConfig } from '../project-facts/index.js';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { loadConfig } from '../config.js';
import type { PlumbConfig, DecisionSource } from '../config.js';
import { check } from '../index.js';
import { UsageError } from '../errors.js';
import { count } from '../messages.js';
import { currentDecisions, decisionEntry, findingGroups } from '../ledger/keys.js';
import { author } from '../ledger/git.js';
import { entryCount, readLedger, writeLedger } from '../ledger/store.js';
import { defaultSource, projectSourceFiles } from '../project.js';
import { discoverComponents } from '../ownership/components.js';
import type { Family, Report } from '../report.js';
import { judgedFamilies } from '../rules/families.js';
import type { JudgedFamily } from '../rules/families.js';
import { checkProject, declinedValues, describeFamily, propose } from '../onboarding/propose.js';
import { readState } from '../onboarding/state.js';
import { applyTheme, describePlan, planTheme } from '../onboarding/write.js';
import { asked } from '../onboarding/ask.js';
import type { Asker } from '../onboarding/ask.js';
import { familyFor } from '../decisions/index.js';

const defaults = ['hover-gate', 'focus-outline', 'transition-named', 'no-ease-in'];
const pathFrom = (root: string, file: string) => relative(root, file).replaceAll('\\', '/');

function decisionSources(report: Report): NonNullable<PlumbConfig['decisions']> {
  const sources: Partial<Record<Family, DecisionSource>> = {};
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
  return sources;
}

function componentSource(root: string): string | undefined {
  if (existsSync(join(root, 'src/components/ui'))) return 'directory:src/components/ui';
  if (existsSync(join(root, 'src/components'))) return 'directory:src/components';
}

export interface InitOptions {
  config?: string;
  force?: boolean;
  /** Answers given on the command line: a family to keep or skip, and shadcn as your system or not. */
  families?: ReadonlyMap<string, 'keep' | 'skip'>;
  preset?: string;
  /** Asks the questions. Without one, every question takes its default. */
  asker?: Asker;
  /** Say nothing about the questions (for --json). */
  quiet?: boolean;
}
const labels: Record<string, string> = { color: 'colour', z: 'z-index' };

export async function initProject(root: string, options: InitOptions, print: (text: string) => void): Promise<{ message: string; entries: import('../ledger/types.js').LedgerEntry[]; moves: never[] }> {
  const loaded = await loadConfig(root, options.config);
  if (loaded.path && !options.force) throw new UsageError(`Config already exists: ${pathFrom(root, loaded.path)}.\n  Review the diff before replacing it.\n  → plumber init --force`);
  const ledger = await readLedger(root); // Refuse malformed state before writing config.
  const scratch = await mkdtemp(join(tmpdir(), 'plumb-init-'));
  let undoTheme: (() => Promise<void>) | undefined;
  try {
    const temporary = join(scratch, 'config.mjs');
    await writeFile(temporary, 'export default {};\n');
    let report = await checkProject(root, temporary, true);
    // Propose first: the theme comes before the baseline, so the baseline records drift against real tokens.
    const state = await readState({ root, config: temporary, report }).catch(() => undefined);
    const proposal = state && state.rung !== 'R0' ? propose({ root, report, state, declined: await declinedValues(root) }) : undefined;
    const say = options.quiet ? () => {} : print;
    if (state) say(`${state.sentence}\n\n`);
    const componentList = discoverComponents(root, await projectSourceFiles(root, {}), {}, new Map(), true).components;
    let from = componentSource(root);
    const shadcnFile = join(root, 'components.json');
    const hasShadcn = hasShadcnConfig(root);
    if (hasShadcn) {
      const shadcn = JSON.parse(await readFile(shadcnFile, 'utf8')) as { aliases?: { ui?: string; components?: string } };
      from = shadcn.aliases?.ui ?? shadcn.aliases?.components ?? 'directory:src/components/ui';
    }
    // The questions, one at a time.
    const asking = (hasShadcn ? 1 : 0) + (proposal?.families.length ?? 0);
    let number = 0;
    const answer = async (text: string, flag: boolean | undefined, show?: () => string): Promise<boolean> => {
      const question = { n: ++number, of: asking, text, ...(show ? { show } : {}) };
      if (flag !== undefined) { say(asked(question, flag)); return flag; }
      if (!options.asker) { say(asked(question, true)); return true; }
      return options.asker.ask(question);
    };
    let useShadcn = true;
    if (hasShadcn) {
      const flag = options.preset === undefined ? undefined : options.preset !== 'none';
      useShadcn = await answer(`Treat shadcn's tokens and the ${componentList.length} ${componentList.length === 1 ? 'component' : 'components'} under ${from?.replace(/^directory:/, '') ?? 'src/components'} as your system?`, flag);
    }
    const kept: JudgedFamily[] = [], skippedFamilies: string[] = [];
    for (const item of proposal?.families ?? []) {
      const flag = options.families?.get(item.family);
      const numeric = item.scales[0]?.ladder === 'tailwind-numeric';
      const yes = await answer(`${item.summary} ${numeric ? 'Make it yours?' : 'Keep these as your tokens?'}`, flag === undefined ? undefined : flag === 'keep',
        () => describeFamily(item) + '\n' + item.scales.flatMap(scale => scale.steps.map(step => `  ${step.name}  ${step.value}  ${count(step.sites, 'place')}`)).join('\n'));
      (yes ? kept : skippedFamilies).push(...(yes ? [item.family] : [labels[item.family] ?? item.family]) as never[]);
    }
    options.asker?.close();
    let written = '';
    if (proposal && kept.length) {
      const plan = await planTheme(proposal, root, new Set(kept));
      if (plan) {
        undoTheme = await applyTheme(root, plan);
        written = describePlan(plan).summary;
        report = await checkProject(root, temporary, true);
      }
    }
    const sources = decisionSources(report);
    const components = componentList;
    const config: PlumbConfig = { ...(report.tailwind.entry ? { css: pathFrom(root, report.tailwind.entry) } : {}), source: defaultSource,
      ...(!useShadcn ? { presets: [{ shadcn: false }] } : {}),
      decisions: sources, ...(from && useShadcn ? { components: { from } } : {}), habits: defaults };
    const serialized = JSON.stringify(config, null, 2);
    let text = '// Inferred by React Plumber. Review token sources and habits with the design owner.\n' +
      (written ? `// Tokens proposed from your code were written to ${written.split(' to ')[1]?.split(' (')[0] ?? 'your theme'}; each has a drafted reason to confirm.\n` : '') +
      `// Components: ${components.length} found${from && useShadcn ? ` from ${from}` : ''}.\n` +
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
    // A family with no tokens is a setup step (read.tokens.<family>), never debt to carry.
    const debt = [...findingGroups(adopted).values()].filter(group => group.finding.rule !== 'config/no-tokens').map(group => group.entry);
    for (const entry of debt) {
      const previous = accepted.get(entry.key);
      // Init can propose config again, but cannot silently grow an adopted baseline.
      if (ledger.exists && (previous?.kind !== 'debt' && previous?.kind !== 'exception' || previous && entryCount(entry) > entryCount(previous))) {
        throw new UsageError('Init refuses new debt in an existing ledger.\n  Fix new findings, or review them before recording debt.\n  → plumber baseline --force');
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
    undoTheme = undefined;
    await rm(statePath(root, '.baseline-pending'), { force: true });
    const accepts = currentDecisions(adopted).length;
    const left = skippedFamilies.length ? `\nLeft for later: ${skippedFamilies.join(', ')}. plumber propose --family <name> shows what would be written.` : '';
    return { message: `Wrote ${pathFrom(root, destination)} with your token sources.\n${written ? `${written}\n` : ''}Components: ${components.length} found${from && useShadcn ? ` from ${from}` : ''}.\nBaseline: ${count(debt.length, 'debt entry', 'debt entries')} (${count(debt.reduce((sum, entry) => sum + entryCount(entry), 0), 'location')}) in ${pathFrom(root, statePath(root, 'ledger.jsonl'))}.\nAccepted ${count(accepts, 'token')} as inferred.${left}\nNext steps: run plumber install --ci.`, entries: [...accepted.values()], moves: [] };
  } catch (error) { await undoTheme?.(); throw error; }
  finally { await rm(scratch, { recursive: true, force: true }); }
}
