import type { Decision } from '../report.js';
import { statePath } from '../paths.js';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { hasShadcnConfig } from '../project-facts/index.js';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { loadConfig } from '../config.js';
import type { PlumbConfig, DecisionSource } from '../config.js';
import { check } from '../index.js';
import { UsageError } from '../errors.js';
import { diff } from './overlay.js';
import { count } from '../messages.js';
import { currentDecisions, decisionEntry, findingGroups } from '../ledger/keys.js';
import { author } from '../ledger/git.js';
import { entryCount, readLedger, writeLedger } from '../ledger/store.js';
import { projectSourceFiles } from '../project.js';
import { discoverComponents } from '../ownership/components.js';
import type { Family, Report } from '../report.js';
import { judgedFamilies } from '../rules/families.js';
import type { JudgedFamily } from '../rules/families.js';
import { checkProject, declinedValues, describeFamily, propose } from '../onboarding/propose.js';
import { readState } from '../onboarding/state.js';
import { applyTheme, describePlan, planTheme } from '../onboarding/write.js';
import { readSource, Transaction, withRollback } from '../write/source-file.js';
import type { Rollback } from '../write/source-file.js';
import { asked } from '../onboarding/ask.js';
import type { Asker } from '../onboarding/ask.js';
import { familyFor } from '../decisions/index.js';

const defaults = ['hover-gate', 'focus-outline', 'transition-named', 'no-ease-in'];
const pathFrom = (root: string, file: string) => relative(root, file).replaceAll('\\', '/');

// A stem every token of one file shares and no token of another family does (`--pl-space-` for --pl-space-1 to -8):
// one line in the config for the whole scale, so it reads as the system it is and is corrected in one place
function stems(decisions: Decision[]): Map<Decision, string> {
  const byFile = new Map<string, Decision[]>();
  for (const d of decisions) byFile.set(d.source.file, [...byFile.get(d.source.file) ?? [], d]);
  const result = new Map<Decision, string>();
  for (const group of byFile.values()) for (const d of group) {
    const parts = d.name.split('-');
    for (let cut = parts.length - 1; cut >= 3; cut--) {
      const stem = parts.slice(0, cut).join('-') + '-';
      const sharing = group.filter(other => other.name.startsWith(stem));
      if (sharing.length > 1 && sharing.every(other => other.family === d.family)) { result.set(d, `${stem}*`); break; }
    }
  }
  return result;
}

function decisionSources(report: Report): NonNullable<PlumbConfig['decisions']> {
  const sources: Partial<Record<Family, DecisionSource>> = {};
  const current = currentDecisions(report), stemOf = stems(current);
  for (const decision of current) {
    const entry = sources[decision.family] ??= { inferred: true, from: [] };
    // Name live files rather than freeze today's values. New theme keys remain
    // visible through the engine's independent decision inventory.
    const prefix = /^--[^-]+-/.exec(decision.name)?.[0];
    const pattern = prefix && familyFor(`${prefix}x`) === decision.family ? `${prefix}*` : stemOf.get(decision) ?? decision.name;
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
  /** Nobody can be asked (no terminal) and nobody said --yes: questions that would write into the theme take "leave it". */
  unattended?: boolean;
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
  let undoTheme: (() => Promise<Rollback>) | undefined;
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
    const kept: JudgedFamily[] = [], skippedFamilies: string[] = [], skippedIds: string[] = [];
    for (const item of proposal?.families ?? []) {
      // the theme is the project's own file: with nobody to ask and no --yes, it is left as it is
      const flag = options.families?.get(item.family) ?? (options.unattended ? 'skip' : undefined);
      const numeric = item.scales[0]?.ladder === 'tailwind-numeric';
      const yes = await answer(`${item.summary} ${numeric ? 'Make it yours?' : 'Keep these as your tokens?'}`, flag === undefined ? undefined : flag === 'keep',
        () => describeFamily(item) + '\n' + item.scales.flatMap(scale => scale.steps.map(step => `  ${step.name}  ${step.value}  ${count(step.sites, 'place')}`)).join('\n'));
      (yes ? kept : skippedFamilies).push(...(yes ? [item.family] : [labels[item.family] ?? item.family]) as never[]);
      if (!yes) skippedIds.push(item.family);
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
    // no `source`: your code is what the rule says (src/source-identity.ts), with its installed, generated and
    // git-ignored filters; a `source` written here would replace that rule with a glob
    const config: PlumbConfig = { ...(report.tailwind.entry ? { css: pathFrom(root, report.tailwind.entry) } : {}),
      ...(!useShadcn ? { presets: [{ shadcn: false }] } : {}),
      decisions: sources, ...(from && useShadcn ? { components: { from } } : {}), habits: defaults };
    const serialized = JSON.stringify(config, null, 2);
    let text = '// Inferred by React Plumber. Review token sources and habits with the design owner.\n' +
      (written ? `// Tokens proposed from your code were written to ${written.split(' to ')[1]?.split(' (')[0] ?? 'your theme'}; each has a drafted reason to confirm.\n` : '') +
      `// Components: ${components.length} found${from && useShadcn ? ` from ${from}` : ''}.\n` +
      components.map(component => `// ${component.name}: ${pathFrom(root, component.source.file)}:${component.source.line}\n`).join('') +
      `export default ${serialized};\n`;
    // each token source says how its tokens were read, so a wrong reading is seen here and fixed by moving the line
    const readings = new Map<string, string[]>();
    for (const [family, source] of Object.entries(sources)) for (const pattern of (Array.isArray(source?.from) ? source.from : []) as string[]) {
      const [, , path, glob] = /^(css|theme):(?:(.*)#)?(.+)$/.exec(pattern) ?? [];
      if (!glob) continue;
      const like = new RegExp(`^${glob.split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);
      const members = currentDecisions(report).filter(d => d.family === family && like.test(d.name) && (!path || pathFrom(root, d.source.file) === path));
      const reasons = [...new Set(members.flatMap(d => (d.reading ?? '').split('; ')).filter(Boolean).map(reason => reason.replace(/ (?:once|\d+ times)$/, '')))];
      if (reasons.length) readings.set(JSON.stringify(pattern), [`${members.length} ${members.length === 1 ? 'token' : 'tokens'}`, ...reasons.slice(0, 2), ...(reasons.length > 2 ? [`${reasons.length - 2} more reasons`] : [])]);
    }
    text = text.replace(/^(\s+)("(?:css|theme):[^"\n]+")(,?)$/gm, (line, indent: string, pattern: string, comma: string) => readings.has(pattern) ? `${indent}${pattern}${comma} // ${readings.get(pattern)!.join('; ')}` : line);
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
    const current = loaded.path ? await readSource(root, destination) : undefined, before = current?.text ?? '';
    if (loaded.path && before !== text) print(diff({ file: destination, before, after: text }, root));
    // the config and the ledger land together: a ledger that cannot be written takes the config back, and says so if it can't
    const landing = new Transaction(root);
    await landing.write(destination, { expectHash: current?.hash ?? null, next: text });
    try { await writeLedger(root, [...accepted.values()], { expect: ledger.hash }); }
    catch (error) { throw withRollback(error, (await landing.rollback()).failed); }
    undoTheme = undefined;
    const accepts = currentDecisions(adopted).length;
    const left = !skippedFamilies.length ? '' : options.unattended && !options.families?.size
      ? `\nLeft your theme as it is (no terminal to ask): ${skippedFamilies.join(', ')}. To add them: ${skippedIds.map(id => `plumber propose --family ${id} --write`).join(' · ')}.`
      : `\nLeft for later: ${skippedFamilies.join(', ')}. plumber propose --family <name> shows what would be written.`;
    return { message: `Wrote ${pathFrom(root, destination)} with your token sources.\n${written ? `${written}\n` : ''}Components: ${components.length} found${from && useShadcn ? ` from ${from}` : ''}.\nBaseline: ${count(debt.reduce((sum, entry) => sum + entryCount(entry), 0), 'place')} recorded as known debt in ${pathFrom(root, statePath(root, 'ledger.jsonl'))}.\nAccepted ${count(accepts, 'token')} as inferred.${left}\nNext:\n  plumber install --overlay --write   see and fix drift on the page, in dev (Vite or Next.js)\n  plumber install --ci                fail CI only on new drift`, entries: [...accepted.values()], moves: [] };
  } catch (error) { throw withRollback(error, (await undoTheme?.())?.failed ?? []); }
  finally { await rm(scratch, { recursive: true, force: true }); }
}
