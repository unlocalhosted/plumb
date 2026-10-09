import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

const toolRoot = resolve('.');
const original = process.env.METALUI_ROOT ?? '/Users/vijaysingh/unlocalhosted/metalui';
const cache = resolve('bench/metalui/.cache/1-adoption');
const snapshot = join(cache, 'input');
const docs = join(snapshot, 'apps/docs');
function git(root, ...args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
const commit = git(original, 'rev-parse', 'HEAD');
// Only this item's archive is replaced. Compiler receipts stay warm on reruns.
rmSync(snapshot, { recursive: true, force: true });
mkdirSync(snapshot, { recursive: true });
const archive = spawnSync('git', ['-C', original, 'archive', commit], { maxBuffer: 256 * 1024 * 1024 });
assert.ifError(archive.error); assert.equal(archive.status, 0, archive.stderr.toString());
const extract = spawnSync('tar', ['-xf', '-', '-C', snapshot], { input: archive.stdout });
assert.equal(extract.status, 0, extract.stderr.toString());
git(snapshot, 'init', '-q'); // Keep generated CI inside the copy, not Plumb's outer Git root.

// Dependency packages are read-only links. Workspace links point at archived
// source, so live MetalUI edits cannot supply implementation files to the run.
function dependencies(source, destination) {
  if (!existsSync(source)) return;
  mkdirSync(destination, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    if (entry.name === '.cache') continue;
    const from = join(source, entry.name), to = join(destination, entry.name);
    if (entry.name.startsWith('@') && entry.isDirectory()) { dependencies(from, to); continue; }
    const actual = realpathSync(from);
    const workspace = relative(original, actual);
    const target = !workspace.startsWith('..') && !workspace.startsWith('node_modules/') && existsSync(join(snapshot, workspace)) ? join(snapshot, workspace) : from;
    symlinkSync(target, to);
  }
}
dependencies(join(original, 'node_modules'), join(snapshot, 'node_modules'));
dependencies(join(original, 'apps/docs/node_modules'), join(docs, 'node_modules'));
mkdirSync(join(snapshot, '.bin'), { recursive: true });
symlinkSync(join(toolRoot, 'dist/cli.js'), join(snapshot, '.bin/plumb'));

const transcripts = [];
function run(command, expected = 0, record = true) {
  const start = performance.now();
  const result = spawnSync(process.execPath, [join(snapshot, '.bin/plumb'), ...command], {
    cwd: docs, encoding: 'utf8', timeout: 60_000, maxBuffer: 128 * 1024 * 1024,
    env: { ...process.env, PLUMB_CACHE_DIR: cache },
  });
  assert.ifError(result.error); assert.equal(result.status, expected, result.stderr || result.stdout);
  const receipt = { command: `plumb${command.length ? ' ' + command.join(' ') : ''}`, exit: result.status, wallMs: performance.now() - start, stdout: result.stdout, stderr: result.stderr };
  if (record) transcripts.push(receipt);
  return receipt;
}
run([], 0, false); // Prime receipts without an installation or package download.
const first = run([]);
assert.ok(first.wallMs < 5_000, `warm first run ${first.wallMs.toFixed(1)} ms exceeds 5 s`);
assert.match(first.stdout, /Next steps\nRun plumb init/);
run(['init']);
run(['install', '--ci']);
const check = run(['check', '--json'], 0, false);
const report = JSON.parse(check.stdout);
assert.equal(report.ledger.new, 0);
assert.ok(!report.findings.some(finding => finding.severity === 'error'));
assert.ok(existsSync(join(snapshot, '.github/workflows/plumb.yml')));
const doctor = run(['doctor'], 0, false);
const evidence = { commit, original, snapshot, project: 'apps/docs', cache, node: process.versions.node, transcripts,
  check: { exit: check.exit, wallMs: check.wallMs, ledger: report.ledger, timing: report.timing }, doctor };
writeFileSync(join(cache, 'transcripts.json'), JSON.stringify(evidence, null, 2) + '\n');
for (const [index, transcript] of transcripts.entries()) writeFileSync(join(cache, `${index + 1}.txt`), `$ ${transcript.command}\n${transcript.stdout}\nexit ${transcript.exit}; wall ${transcript.wallMs.toFixed(1)} ms\n`);
console.log(JSON.stringify({ commit, snapshot, transcripts: transcripts.map(({ command, exit, wallMs }) => ({ command, exit, wallMs })), check: evidence.check, doctor: doctor.stdout }, null, 2));
