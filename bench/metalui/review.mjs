// Item 8 acceptance over an immutable MetalUI archive. All writes stay in this item's cache.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const source = '/Users/vijaysingh/unlocalhosted/metalui';
const cache = resolve(root, 'bench/metalui/.cache/8-review');
const input = join(cache, 'input');
function execute(command, args, options = {}) {
  const result = spawnSync(command, args, { maxBuffer: 128 * 1024 * 1024, ...options });
  assert.ifError(result.error); assert.equal(result.status, 0, result.stderr?.toString()); return result.stdout;
}
const sourceHead = execute('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
await rm(cache, { recursive: true, force: true }); await mkdir(input, { recursive: true });
const archive = execute('git', ['-C', source, 'archive', sourceHead, 'package.json', 'apps/docs/src', 'apps/docs/tsconfig.json', 'apps/docs/package.json', 'packages/metalui/src', 'packages/metalui/package.json', 'tokens']);
execute('tar', ['-xf', '-', '-C', input], { input: archive });
await symlink(join(source, 'node_modules'), join(input, 'node_modules'), 'dir');
const config = join(root, 'bench/metalui/plumb.config.ts');
const presetInputs = ['tokens/tokens.json', 'packages/metalui/src/components/theme.css', 'packages/metalui/src/components/tokens.css', 'apps/docs/src/styles.css'];
for (const path of presetInputs) assert.deepEqual(await readFile(join(source, path)), await readFile(join(input, path)), `Preset input changed since ${sourceHead}: ${path}`);
const runs = {};
function run(name, args, status = 0) {
  const start = performance.now();
  const result = spawnSync(process.execPath, [join(root, 'dist/cli.js'), '--root', input, '--config', config, ...args],
    { encoding: 'utf8', timeout: 60000, maxBuffer: 128 * 1024 * 1024, env: { ...process.env, PLUMB_CACHE_DIR: cache } });
  assert.ifError(result.error); assert.equal(result.status, status, result.stderr || result.stdout.slice(-2000));
  runs[name] = { wallMs: performance.now() - start, exitCode: result.status }; return result.stdout;
}
const specimen = join(input, 'apps/docs/src/ReviewTrend.tsx');
await writeFile(specimen, 'export const ReviewTrend = () => <div className="gap-10" />;\n');
run('baseline', ['baseline']);
execute('git', ['-C', input, 'init', '-q']);
execute('git', ['-C', input, 'config', 'user.name', 'Plumb benchmark']);
execute('git', ['-C', input, 'config', 'user.email', 'bench@example.test']);
await writeFile(join(input, '.gitignore'), 'node_modules/\nplumb/\n');
execute('git', ['-C', input, 'add', '.']); execute('git', ['-C', input, 'commit', '-qm', 'benchmark baseline']);
const first = JSON.parse(run('reportAfterBaseline', ['report', '--json']));
const warm = JSON.parse(run('reportWarm', ['report', '--json']));
for (const key of ['coverage', 'findings', 'ledger', 'identities']) assert.deepEqual(first[key], warm[key], `Warm ${key}`);
await writeFile(specimen, 'export const ReviewTrend = () => <div className="gap-8" />;\n');
execute('git', ['-C', input, 'add', 'apps/docs/src/ReviewTrend.tsx']); execute('git', ['-C', input, 'commit', '-qm', 'benchmark fixes spacing']);
const fixed = JSON.parse(run('reportFixed', ['report', '--json']));
assert.equal(fixed.changes.fixed, 1); assert.equal(fixed.changes.new, 0);
const markdown = run('trendSince', ['report', '--since', first.commit, '--markdown']);
assert.ok(markdown.includes('spacing delta (pp)')); assert.ok(markdown.includes(fixed.commit.slice(0, 12)));
await writeFile(join(cache, 'trend.md'), markdown);
// Parity inspects real decisions; an empty export must list every project token as extra.
await writeFile(join(input, 'empty.tokens.json'), '{}');
const parity = JSON.parse(run('parity', ['parity', 'empty.tokens.json', '--strict', '--json'], 1));
assert.ok(parity.findings.length > 0); assert.ok(parity.findings.every(finding => finding.rule === 'parity/extra'));
assert.equal(execute('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), sourceHead);
for (const path of presetInputs) assert.deepEqual(await readFile(join(source, path)), await readFile(join(input, path)), `Preset changed during benchmark: ${path}`);
const receipt = { sourceHead, sourceReadOnly: true, immutableArchive: true, cache, runs,
  acceptance: { warmSnapshotEqual: true, fixed: fixed.changes.fixed, spacingBefore: first.coverage.spacing, spacingAfter: fixed.coverage.spacing, parityExtras: parity.findings.length } };
await writeFile(join(root, 'bench/metalui/8-review.run.json'), JSON.stringify(receipt, null, 2) + '\n');
process.stdout.write(JSON.stringify(receipt, null, 2) + '\n');
