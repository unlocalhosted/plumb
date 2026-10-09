// Read-only acceptance: all generated artifacts live in a disposable docs copy.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const source = '/Users/vijaysingh/unlocalhosted/metalui';
const directory = await mkdtemp(join(tmpdir(), 'plumb-layer9-metalui-'));
const cache = resolve(root, 'bench/metalui/.cache/layer9');
const config = resolve(root, 'bench/metalui/plumb.config.ts');
const sourceHead = spawnSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
const result = { sourceHead, sourceReadOnly: true, copiedDocs: true, cache, runs: {}, acceptance: {} };
function run(args = [], status = 0) {
  const start = performance.now();
  const child = spawnSync(process.execPath, [join(root, 'dist/cli.js'), '--root', directory, '--config', config, ...args], { cwd: root, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, timeout: 60000, env: { ...process.env, PLUMB_CACHE_DIR: cache } });
  assert.ifError(child.error); assert.equal(child.status, status, child.stderr || child.stdout.slice(-2000));
  result.runs[args.join(' ') || 'check'] = { wallMs: performance.now() - start, exitCode: status, outputBytes: Buffer.byteLength(child.stdout) };
  return child.stdout;
}
try {
  await mkdir(join(directory, 'apps'), { recursive: true });
  await cp(join(source, 'apps/docs'), join(directory, 'apps/docs'), { recursive: true, filter: path => !['node_modules', 'dist', '.cache', '.plumb-cache', '.plumb'].includes(basename(path)) });
  await cp(join(source, 'package.json'), join(directory, 'package.json'));
  await symlink(join(source, 'node_modules'), join(directory, 'node_modules'), 'dir');
  await mkdir(join(directory, 'packages'), { recursive: true });
  await symlink(join(source, 'packages/metalui'), join(directory, 'packages/metalui'), 'dir');
  run(['baseline']);
  const ledger = await readFile(join(directory, '.plumb/ledger.jsonl'), 'utf8');
  const baseline = JSON.parse(run(['--json']));
  const sarif = JSON.parse(run(['--sarif']));
  assert.equal(sarif.runs[0].results.length, baseline.findings.reduce((n, f) => n + f.sites.length, 0));
  assert.ok(sarif.runs[0].results.every(r => r.baselineState === 'unchanged'));
  result.acceptance.baseline = { new: baseline.ledger.new, debt: baseline.ledger.debt, sarifResults: sarif.runs[0].results.length };
  assert.match(run(['--agent']), /^0 new/);
  const added = join(directory, 'apps/docs/src/SurfaceAcceptance.tsx');
  await writeFile(added, 'export const SurfaceAcceptance = () => <div className="gap-10" />;');
  const agent = run(['--agent'], 1); assert.match(agent, /^1 new/); assert.match(agent, /SurfaceAcceptance.tsx/); assert.match(agent, /NEEDS-DECISION/);
  const github = run(['--format', 'github'], 1);
  assert.equal(github.split('\n').filter(line => line.startsWith('::error ')).length, 1);
  result.acceptance.addedGap = { new: 1, githubErrors: 1, agentNamesSite: true };
  run(['agent-docs']); const docs = await readFile(join(directory, 'PLUMB.md'), 'utf8');
  assert.ok(docs.includes('--spacing-mu-space-8')); result.acceptance.docsBytes = Buffer.byteLength(docs);
  assert.equal(await readFile(join(directory, '.plumb/ledger.jsonl'), 'utf8'), ledger);
  result.acceptance.ledgerUntouched = true;
  await writeFile(join(root, 'bench/metalui/layer9.run.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
} finally { await rm(directory, { recursive: true, force: true }); }
