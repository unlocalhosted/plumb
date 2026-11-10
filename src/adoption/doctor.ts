import { readiness, formatReadiness, blocking } from '../readiness/index.js';
import type { Requirement } from '../readiness/index.js';
import { stackLine } from '../onboarding/path.js';
import type { Report } from '../report.js';
import { cacheDirectory } from '../paths.js';
import { existsSync } from 'node:fs';
import { access, readdir, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { loadConfig } from '../config.js';
import type { PlumbConfig } from '../config.js';
import { discoverProject } from '../project.js';
import { readLedger } from '../ledger/store.js';
import { check } from '../index.js';
import { userMessage } from '../errors.js';
import { tailwindSetupProblem } from '../setup-messages.js';
import { describeFacts } from '../project-facts/index.js';
import { count } from '../messages.js';
import { table } from '../cli-table.js';
import type { Cell } from '../cli-table.js';

async function size(path: string): Promise<number> {
  let total = 0;
  for (const item of await readdir(path, { withFileTypes: true })) {
    const file = join(path, item.name);
    if (item.isDirectory()) total += await size(file);
    else if (item.isFile()) total += (await stat(file)).size;
  }
  return total;
}
const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim();

/** Everything doctor knows: the old default output, now `plumber doctor --verbose`. */
export async function doctorVerbose(root: string, configPath?: string): Promise<{ text: string; ok: boolean }> {
  const rows: Cell[][] = [];
  let ok = true;
  let checked: Report | undefined;
  const line = (name: string, good: boolean, fact: string, fix: string, blocks = true) => {
    if (!good && blocks) ok = false;
    rows.push([{ text: good ? 'ok' : 'fix', ...(good ? {} : { ink: 'amber' as const }) }, `${name}:`, { text: oneLine(fact), path: name === 'Cache' || name === 'CSS entry' }, oneLine(fix)]);
  };
  const [major = 0, minor = 0] = process.versions.node.split('.').map(Number);
  line('Node', major > 22 || major === 22 && minor >= 18, process.versions.node, major > 22 || major === 22 && minor >= 18 ? 'No change needed.' : 'Use Node 22.18 or later.');
  let config: PlumbConfig = {}, valid = true, configured = false;
  try {
    const loaded = await loadConfig(root, configPath); config = loaded.value; configured = loaded.path !== null;
    line('Config', loaded.path !== null, loaded.path ? `${relative(root, loaded.path)} is valid` : 'no config', loaded.path ? 'No change needed.' : 'Run plumber init.', loaded.path !== null);
  } catch (error) {
    valid = false;
    line('Config', false, userMessage(error), 'Fix the config, then run plumber doctor.');
  }
  try {
    const project = await discoverProject(root, config);
    const version = project.tailwind.version;
    const problem = await tailwindSetupProblem(root, project.tailwind.entry, version);
    line('Tailwind', !problem, project.tailwind.entry ? version ?? 'not installed' : problem ? problem.split('\n')[0]! : 'not used', problem ? problem.split('\n').slice(1).join('\n') : 'No change needed.');
    line('CSS entry', true, project.tailwind.entry ? relative(root, project.tailwind.entry) : 'plain CSS from source files', 'No change needed.');
  } catch (error) {
    line('Tailwind', false, 'version could not be checked', 'Fix the CSS entry and rerun plumber doctor.');
    line('CSS entry', false, `${config.css ? config.css + ': ' : ''}${userMessage(error)}`, 'Set css in plumber.config.ts to a readable entry file.');
  }
  try {
    const ledger = await readLedger(root);
    if (!ledger.exists) line('Ledger', false, 'no .plumber/ledger.jsonl', configured ? 'Run plumber baseline.' : 'Run plumber init.', false);
    // a line the reader skips (broken, or from a newer React Plumber) is kept, never lost, but it must still be seen
    else if (ledger.skipped) line('Ledger', false, `${count(ledger.skipped, 'line')} can't be read: ${ledger.notes[0] ?? ''}`.trim(), 'Repair .plumber/ledger.jsonl, then rerun plumber doctor.');
    else if (!valid) line('Ledger', false, `${count(ledger.entries.length, 'entry', 'entries')} parsed; token and debt checks need a valid config`, 'Fix the config, then rerun plumber doctor.');
    else {
      const report = await check({ root, ...(configPath === undefined ? {} : { config: configPath }) });
      checked = report;
      const problems = report.findings.filter(finding => /^(ledger|decisions)\//.test(finding.rule));
      const stale = problems.some(finding => /stale|vanished/.test(finding.rule));
      const unaccepted = problems.some(finding => finding.rule === 'decisions/unaccepted');
      const noWhy = problems.some(finding => finding.rule === 'ledger/no-why');
      line('Ledger', !problems.length, `${count(ledger.entries.length, 'entry', 'entries')}, ${count(problems.length, 'issue')}`, problems.length ?
        [noWhy && 'plumber accept <key> --why "reason" (record exception reasons).', unaccepted && 'plumber accept-decisions --why "reason" (review tokens first).', stale && 'plumber ledger --ratchet --prune (review removals first).'].filter(Boolean).join(' ') : 'No change needed.');
    }
  } catch (error) { line('Ledger', false, userMessage(error), 'Repair .plumber/ledger.jsonl, then rerun plumber doctor.'); }
  const cache = cacheDirectory(root);
  try {
    const bytes = existsSync(cache) ? await size(cache) : 0;
    let parent = cache;
    while (!existsSync(parent) && dirname(parent) !== parent) parent = dirname(parent);
    await access(parent, constants.W_OK);
    line('Cache', true, `${cache}, ${count(bytes, 'byte')}${existsSync(cache) ? '' : ', not created'}`, 'No change needed.');
  } catch (error) { line('Cache', false, `${cache}: ${userMessage(error)}`, 'Set PLUMBER_CACHE_DIR to a writable directory.'); }
  const ready = await readiness({ root, ...(configPath === undefined ? {} : { config: configPath }), ...(checked ? { report: async () => checked! } : {}) });
  ok &&= !blocking(ready);
  // One row per fact: value, then how it is known and the first evidence line (R8).
  const project = describeFacts(ready.project).map(([name, value, where]): Cell[] => [`${name}:`, { text: value, path: /^(?:Root|Boundary|Repo)$/.test(name) }, { text: oneLine(where), ink: 'dim' }]);
  // Everything detected, with what plumb does with it: supported, partial (what is and is not), unsupported (and the next step).
  const detected = [...ready.project.styling.value?.systems ?? [], ...ready.project.libraries.value ?? []];
  const support = detected.map((item): Cell[] => [{ text: item.support, ...(item.support === 'unsupported' ? { ink: 'amber' as const } : {}) }, `${item.label}:`, { text: [...'usage' in item && item.usage ? [count(item.usage.files, 'file')] : [], ...item.evidence[0] ? [`${item.evidence[0].file}:${item.evidence[0].line}`] : []].join(', first ') },
    { text: oneLine(item.support === 'supported' ? (item.judged ?? 'judged') : item.support === 'partial' ? `${item.judged ?? ''}; ${item.skipped ?? ''}` : `not judged yet: ${item.skipped ?? ''}. ${item.next ?? ''}`), ink: 'dim' as const }]);
  const supportTable = support.length ? '\nSupport\n' + table(support, [{ width: 11 }, { width: 18 }, { weight: 2, wrap: true }, { weight: 3, wrap: true }], { indent: 0, gap: 1 }).join('\n') + '\n' : '';
  return { text: formatReadiness(ready) + '\nProject\n' + table(project, [{ width: 16 }, { weight: 1, wrap: true }, { weight: 3, wrap: true }], { indent: 0, gap: 1 }).join('\n') + '\n' + supportTable + '\nDiagnostics\n' + table(rows, [{ width: 3 }, { width: 10 }, { weight: 1 }, { width: 48 }], { indent: 0, gap: 1 }).join('\n') + '\n', ok };
}

const oneCommand = (item: { fix: Requirement['fix'] }): string =>
  item.fix?.kind === 'diff' ? 'plumber install --overlay --write' : !item.fix || item.fix.command === 'plumber doctor' ? 'plumber doctor --verbose' : item.fix.command;
const plain = (text: string) => text.replaceAll('React Plumber', 'Plumber');

/**
 * Three lines, in the person's words: can it read your code, does it show on your page, does it guard new code
 * (docs/design/onboarding.md, section 6). Each is ✓, ✗ with the one command that fixes it, or – when it's optional or
 * can't be told from here. Exit 1 only when one of the first two is ✗. The rows are readiness's, not a second copy.
 */
export async function doctor(root: string, configPath?: string): Promise<{ text: string; ok: boolean }> {
  const ready = await readiness({ root, ...(configPath === undefined ? {} : { config: configPath }), noReport: true });
  const row = (mark: '✓' | '✗' | '–', label: string, detail: string) => `  ${mark} ${label.padEnd(22)}${detail}\n`;
  const find = (id: string) => ready.requirements.find(item => item.id === id);
  let ok = true, text = 'Plumber\n';

  const reads = find('read.styles');
  if (reads?.status === 'ok') {
    let tailwind: { version?: string | null; entry?: string | null } = {};
    try { const project = await discoverProject(root, (await loadConfig(root, configPath)).value); tailwind = { version: project.tailwind.version, entry: project.tailwind.entry }; } catch { /* the stack line leaves it out */ }
    text += row('✓', 'Reads your code', await stackLine(root, tailwind, false));
  } else { ok = false; text += row('✗', 'Reads your code', `${plain(reads?.title ?? 'Styles couldn’t be checked')} → ${reads ? oneCommand(reads) : 'plumber doctor --verbose'}`); }

  const hostRows = ['locate.host', 'locate.plugin', 'locate.order'].map(find).filter((item): item is Requirement => item !== undefined);
  const broken = hostRows.find(item => item.status === 'missing' || item.id === 'locate.host' && item.status === 'unknown'), unsure = hostRows.find(item => item.status === 'unknown');
  const where = find('locate.plugin')?.evidence[0]?.file ?? 'your dev config';
  if (broken) {
    ok = false;
    const detail = broken.id === 'locate.plugin' ? `Plumber isn't in ${where}` : plain(broken.title);
    text += row('✗', 'Shows on your page', `${detail} → ${oneCommand(broken)}`);
  } else if (unsure) text += row('–', 'Shows on your page', `can't tell from ${where} → plumber doctor --verbose`);
  else text += row('✓', 'Shows on your page', `Plumber is in ${where}`);

  // the facts name paths relative to the project
  const ci = join(resolve(root, ready.project.repo.value ?? '.'), '.github', 'workflows', 'plumb.yml');
  text += existsSync(ci) ? row('✓', 'Guards new code', 'pull requests are checked') : row('–', 'Guards new code', 'not set up → plumber install --ci');
  return { text, ok };
}
