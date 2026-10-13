// Run from repo root: node scripts/docs/record-ledger.mjs (uses existing dist/).
import { spawnSync } from 'node:child_process';
import { stripVTControlCharacters } from 'node:util';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { plumbCommand, recordingJSON, recordingPaths } from './recording.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const scratch = await mkdtemp(join(tmpdir(), 'plumb-docs-ledger-'));
const root = join(scratch, 'fixture'), cache = join(scratch, 'cache');
const portable = recordingPaths({ repo, root, paths: [[cache, '.plumb/cache'], [scratch, '.']] });
const steps = [];
try {
  await cp(join(repo, 'fixtures/docs-judged'), root, { recursive: true, filter: file => !['node_modules', '.plumb'].includes(file.split('/').at(-1)) });
  await symlink(join(repo, 'node_modules'), join(root, 'node_modules'), 'dir');
  const entries = async () => {
    const text = await readFile(join(root, '.plumb/ledger.jsonl'), 'utf8').catch(error => {
      if (error.code === 'ENOENT') return ''; throw error;
    });
    return text.split('\n').filter(Boolean).map(line => JSON.parse(line));
  };
  const capture = async (id, details, stdout = '', stderr = '') => {
    const ledgerEntries = await entries();
    const entryCounts = Object.fromEntries(['debt', 'exception', 'decision'].map(kind => [kind, ledgerEntries.filter(entry => entry.kind === kind).length]));
    const siteCounts = Object.fromEntries(['debt', 'exception'].map(kind => [kind, ledgerEntries.filter(entry => entry.kind === kind).reduce((n, entry) => n + (entry.count ?? 1), 0)]));
    const step = {
      id, ...details, cwd: '.',
      summaryLines: stdout.split('\n').filter(line => /^(?:Baseline recorded|Accepted |Ledger has|ledger  |known\s|no new findings$|\d[\d,]* findings?:)/.test(line)),
      stdout, stderr, entryCounts, siteCounts, ledgerEntries,
    };
    steps.push(step);
    return step;
  };
  const cli = async (id, args, expectedExit) => {
    const invocation = [...args, '--root', root];
    const result = spawnSync(process.execPath, [join(repo, 'dist/cli.js'), ...invocation], {
      cwd: root, encoding: 'utf8', env: { ...process.env, PLUMB_CACHE_DIR: cache },
      maxBuffer: 32 * 1024 * 1024, timeout: 30_000,
    });
    if (result.error) throw result.error;
    if (result.status !== expectedExit) throw new Error(`${id}: expected ${expectedExit}, got ${result.status}: ${result.stderr}\n${result.stdout}`);
    return capture(id, { command: plumbCommand(invocation, root), exitCode: result.status }, stripVTControlCharacters(result.stdout), stripVTControlCharacters(result.stderr));
  };
  const edit = async (id, file, transform) => {
    const before = await readFile(join(root, file), 'utf8');
    const after = transform(before);
    await writeFile(join(root, file), after);
    return capture(id, { edit: { file, before, after } });
  };
  for (const args of [['init', '--quiet'], ['config', 'user.name', 'Plumb docs recording']]) {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', timeout: 30_000 });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Git setup failed: ${result.stderr}`);
  }
  await cli('baseline', ['baseline'], 0);
  await cli('check-baseline', ['check'], 0);
  await edit('add-new-drift', 'src/Judged.tsx', before => before + '\nexport function NewDrift() { return <div className="gap-[14px]">New drift</div>; }\n');
  await cli('check-new-drift', ['check'], 1);
  await edit('fix-old-drift', 'src/Judged.tsx', before => {
    if (before.split('className="gap-[13px]"').length !== 2) throw new Error('Expected one old arbitrary site');
    return before.replace('className="gap-[13px]"', 'className="gap-3"');
  });
  await cli('check-debt-falls', ['check'], 1);
  await cli('ratchet', ['ledger', '--ratchet'], 0);
  const newSiteLine = (await readFile(join(root, 'src/Judged.tsx'), 'utf8')).split('\n').findIndex(line => line.includes('className="gap-[14px]"')) + 1;
  if (!newSiteLine) throw new Error('New drift site vanished.');
  await cli('accept-new-drift', ['accept', '--rule', 'provenance/arbitrary', '--site', `src/Judged.tsx:${newSiteLine}`, '--why', '14px separation is intentional for this docs recording.'], 0);
  await cli('check-after-accept', ['check'], 0);
  const baseline = steps.find(step => step.id === 'check-baseline');
  const reduced = steps.find(step => step.id === 'check-debt-falls');
  if (reduced.siteCounts.debt !== baseline.siteCounts.debt) throw new Error('check unexpectedly rewrote ledger debt.');
  if (!steps.find(step => step.id === 'ratchet').siteCounts.debt || steps.find(step => step.id === 'ratchet').siteCounts.debt >= baseline.siteCounts.debt) throw new Error('Ratchet did not shrink stored debt.');
  const output = join(repo, 'site/src/docs/recordings/ledger.json');
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, recordingJSON({
    schemaVersion: 1, fixture: 'fixtures/docs-judged/', regenerate: 'node scripts/docs/record-ledger.mjs',
    root: 'fixtures/docs-judged/', setup: 'Copied fixture without node_modules or .plumb, linked repo dependencies, initialized Git without commits and configured user.name as Plumb docs recording; temporary copy removed after recording. Commands and edits run from fixture root (cwd: .).',
    countNotes: 'entryCounts counts stored ledger rows. siteCounts sums stored count (default 1). Check summaryLines count current matching sites; check does not rewrite the ledger.',
    steps,
  }, portable));
  console.log('Recorded site/src/docs/recordings/ledger.json');
} finally {
  await rm(scratch, { recursive: true, force: true });
}
