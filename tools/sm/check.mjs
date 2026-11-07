// @ts-check
// `sm check`: format, graph and lint findings for a set of files (spec 5.1, 5.2).
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { UsageError, discover } from './config.mjs';
import { finish, sortFindings, cmp } from './findings.mjs';
import { analyzeFile } from './analyze.mjs';

/**
 * @param {object} o
 * @param {string} o.root @param {string} o.cwd @param {{ include: string[], exclude: string[] }} o.config
 * @param {string[]} o.files @param {Record<string, string | boolean>} o.flags
 * @param {typeof import('./config.mjs').includeMatcher} o.includeMatcher @param {typeof import('./config.mjs').relPath} o.relPath
 * @param {typeof import('node:fs').statSync} o.statSync
 */
export async function check({ root, cwd, config, files, flags, includeMatcher, relPath, statSync }) {
  const included = await includeMatcher(config);
  /** @type {string[]} */
  let named = files.map(f => relPath(root, cwd, f));
  if (flags.staged || typeof flags['changed-since'] === 'string') {
    const args = flags.staged ? ['diff', '--name-only', '--cached'] : ['diff', '--name-only', String(flags['changed-since'])];
    let out;
    try {
      out = execFileSync('git', args, { cwd: root, env: { ...process.env, LC_ALL: 'C' }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
      throw new UsageError('bad-ref', `git ${args.join(' ')} failed: ${String(/** @type {any} */ (error).stderr ?? error).trim()}`);
    }
    named.push(...out.split('\n').filter(Boolean));
  }
  named = [...new Set(named)].sort(cmp);
  const skipped = named.filter(f => !included(f) || !statSync(join(root, f), { throwIfNoEntry: false })?.isFile());
  const targets = named.length ? named.filter(f => !skipped.includes(f)) : await discover(root, config);
  /** @type {any[]} */
  const findings = [];
  /** @type {import('./machine.mjs').Machine[]} */
  const machines = [];
  for (const file of targets) {
    const text = readFileSync(join(root, file), 'utf8');
    const result = await analyzeFile(file, text, { lint: true });
    findings.push(...finish(result.findings));
    machines.push(...result.machines);
  }
  if (!named.length) {
    /** @type {Map<string, import('./machine.mjs').Machine[]>} */
    const groups = new Map();
    for (const m of machines) if (m.canonical) groups.set(m.id, [...(groups.get(m.id) ?? []), m]);
    for (const [id, list] of groups) {
      if (list.length < 2) continue;
      for (const m of list) {
        const other = list.find(o => o !== m) ?? m;
        findings.push({
          rule: 'sm/machine-id-duplicate', level: 'error', file: m.file, line: m.line, column: 1, endLine: m.line, endColumn: 1, machine: id,
          key: `sm/machine-id-duplicate|${m.file}|machine:${id}|${id}|1`, message: `Machine id \`${id}\` is also declared in ${other.file}.`, fix: 'Give one of them a new id.',
        });
      }
    }
  }
  let suppressed = 0;
  let kept = findings;
  if (typeof flags.baseline === 'string') {
    const path = join(root, flags.baseline);
    if (!existsSync(path)) throw new UsageError('bad-flag', `No baseline at ${flags.baseline}.`);
    const keys = new Set(JSON.parse(readFileSync(path, 'utf8')).keys ?? []);
    kept = findings.filter(f => { if (keys.has(f.key)) { suppressed++; return false; } return true; });
  }
  if (!flags.advice && flags.advice !== undefined) kept = kept.filter(f => f.level !== 'advice');
  const sorted = sortFindings(kept);
  const summary = { advice: sorted.filter(f => f.level === 'advice').length, error: sorted.filter(f => f.level === 'error').length };
  return {
    code: summary.error ? 1 : 0,
    answer: { command: 'check', files: targets, findings: sorted, schema: 1, skipped, suppressed, summary },
  };
}
