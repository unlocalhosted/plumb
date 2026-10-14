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
import { errorMessage } from '../errors.js';
import { tailwindFix } from '../setup-messages.js';
import { count } from '../messages.js';

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

export async function doctor(root: string, configPath?: string): Promise<{ text: string; ok: boolean }> {
  const lines: string[] = [];
  let ok = true;
  const line = (name: string, good: boolean, fact: string, fix: string) => {
    if (!good) ok = false;
    lines.push(`${good ? 'ok' : 'fix'}  ${name}: ${oneLine(fact)}. ${oneLine(fix)}`);
  };
  const [major = 0, minor = 0] = process.versions.node.split('.').map(Number);
  line('Node', major > 22 || major === 22 && minor >= 18, process.versions.node, major > 22 || major === 22 && minor >= 18 ? 'No change needed.' : 'Use Node 22.18 or later.');
  let config: PlumbConfig = {}, valid = true;
  try {
    const loaded = await loadConfig(root, configPath); config = loaded.value;
    line('Config', loaded.path !== null, loaded.path ? `${relative(root, loaded.path)} is valid` : 'no config', loaded.path ? 'No change needed.' : 'Run plumber init.');
  } catch (error) {
    valid = false;
    line('Config', false, errorMessage(error), 'Fix the config, then run plumber doctor.');
  }
  try {
    const project = await discoverProject(root, config);
    const version = project.tailwind.version;
    const compatible = !!version && Number(version.split('.')[0]) === 4;
    line('Tailwind', !project.tailwind.entry || compatible, project.tailwind.entry ? version ?? 'not installed' : 'not used', project.tailwind.entry && !compatible ? tailwindFix : 'No change needed.');
    line('CSS entry', true, project.tailwind.entry ? relative(root, project.tailwind.entry) : 'plain CSS from source files', 'No change needed.');
  } catch (error) {
    line('Tailwind', false, 'version could not be checked', 'Fix the CSS entry and rerun plumber doctor.');
    line('CSS entry', false, errorMessage(error), 'Set css in plumber.config.ts to a readable entry file.');
  }
  try {
    const ledger = await readLedger(root);
    if (!ledger.exists) line('Ledger', false, 'no .plumber/ledger.jsonl', 'Run plumber init.');
    else if (!valid) line('Ledger', false, `${count(ledger.entries.length, 'entry', 'entries')} parsed; token and debt checks need a valid config`, 'Fix the config, then rerun plumber doctor.');
    else {
      const report = await check({ root, ...(configPath === undefined ? {} : { config: configPath }) });
      const problems = report.findings.filter(finding => /^(ledger|decisions)\//.test(finding.rule));
      const stale = problems.some(finding => /stale|vanished/.test(finding.rule));
      const unaccepted = problems.some(finding => finding.rule === 'decisions/unaccepted');
      const noWhy = problems.some(finding => finding.rule === 'ledger/no-why');
      line('Ledger', !problems.length, `${count(ledger.entries.length, 'entry', 'entries')}, ${count(problems.length, 'issue')}`, problems.length ?
        [noWhy && 'Record exception reasons with plumber accept <key> --why "reason".', unaccepted && 'Review tokens, then run plumber accept-decisions --why "reason".', stale && 'Run plumber ledger --ratchet --prune after reviewing removals.'].filter(Boolean).join(' ') : 'No change needed.');
    }
  } catch (error) { line('Ledger', false, errorMessage(error), 'Repair .plumber/ledger.jsonl, then rerun plumber doctor.'); }
  const cache = cacheDirectory(root);
  try {
    const bytes = existsSync(cache) ? await size(cache) : 0;
    let parent = cache;
    while (!existsSync(parent) && dirname(parent) !== parent) parent = dirname(parent);
    await access(parent, constants.W_OK);
    line('Cache', true, `${cache}, ${count(bytes, 'byte')}${existsSync(cache) ? '' : ', not created'}`, 'No change needed.');
  } catch (error) { line('Cache', false, `${cache}: ${errorMessage(error)}`, 'Set PLUMBER_CACHE_DIR to a writable directory.'); }
  return { text: lines.join('\n') + '\n', ok };
}
