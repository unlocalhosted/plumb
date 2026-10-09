import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
const root = process.env.METALUI_ROOT ?? '/Users/vijaysingh/unlocalhosted/metalui';
const cache = resolve('bench/metalui/.cache/layer8');
// Same source revision as layer 7; concurrent MetalUI commits cannot move input.
const commit = process.env.METALUI_COMMIT ?? 'faa2036e4634e4f6c8d49feaa2dac87a77559501';
assert.match(commit, /^[a-f0-9]{40}$/);
const snapshot = resolve(cache, 'input', commit);
// Clear only this layer's compiler/module receipts; keep immutable source input.
if (existsSync(cache)) for (const entry of readdirSync(cache)) if (entry !== 'input') rmSync(resolve(cache, entry), { recursive: true, force: true });
if (!existsSync(resolve(snapshot, 'package.json'))) {
  mkdirSync(snapshot, { recursive: true });
  const archive = spawnSync('git', ['-C', root, 'archive', commit, 'package.json', 'apps/docs/src', 'apps/docs/tsconfig.json', 'apps/docs/package.json', 'packages/metalui/src', 'packages/metalui/package.json', 'tokens'], { maxBuffer: 32 * 1024 * 1024 });
  assert.ifError(archive.error); assert.equal(archive.status, 0, archive.stderr.toString());
  const extracted = spawnSync('tar', ['-xf', '-', '-C', snapshot], { input: archive.stdout });
  assert.equal(extracted.status, 0, extracted.stderr.toString());
}
if (!existsSync(resolve(snapshot, 'node_modules'))) symlinkSync(resolve(root, 'node_modules'), resolve(snapshot, 'node_modules'), 'dir');
// Inherited preset reads live token inputs: prove they equal pinned bytes.
for (const file of ['tokens/tokens.json', 'packages/metalui/src/components/theme.css', 'packages/metalui/src/components/tokens.css', 'apps/docs/src/styles.css']) assert.deepEqual(readFileSync(resolve(root, file)), readFileSync(resolve(snapshot, file)), `preset input ${file} drifted`);
const env = { ...process.env, PLUMB_CACHE_DIR: cache }, measurements = {};
function run(args) {
  const start = performance.now();
  // Check the rule report before ledger classification. The inherited ledger
  // crashes on duplicate compiler-fallback dead-var sites in pinned kds.css,
  // even with no imitation config. Layer 8 does not change layer 6 to hide that.
  const command = args.includes('--suggest') ? ['dist/cli.js', ...args, '--root', snapshot, '--config', resolve('bench/metalui/imitation.config.ts'), '--json'] :
    ['--input-type=module', '-e', `import {check} from './dist/index.js'; const report=await check({root:process.argv[1],config:process.argv[2],ledger:false}); console.log(JSON.stringify(report));`, snapshot, resolve('bench/metalui/imitation.config.ts')];
  const result = spawnSync(process.execPath, command, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env });
  assert.ifError(result.error); assert.equal(result.stderr, '');
  assert.equal(result.status, 0);
  return { value: JSON.parse(result.stdout), wallMs: performance.now() - start };
}
let first, report;
for (const temperature of ['cold', 'warm']) {
  const result = run(['check']); report = result.value;
  measurements[temperature] = { wallMs: result.wallMs, timing: report.timing };
  if (!first) first = report;
  else for (const field of ['findings', 'declarations', 'decisions', 'coverage']) assert.deepEqual(report[field], first[field], `warm ${field}`);
}
const findings = report.findings.filter(f => f.rule.startsWith('imitation/'));
const expected = ['ColourCue', 'CueDocumentProof', 'DateCue', 'EnumCue', 'LinkCue', 'NumericCue', 'PersonCue', 'TagCue'];
const pages = [...new Set(findings.flatMap(f => f.sites).filter(s => s.file.includes('/pages/components/') && expected.some(name => s.file.endsWith(`/${name}.tsx`))).map(s => s.file.split('/').at(-1).replace('.tsx', '')))].sort();
assert.deepEqual(pages, expected);
assert.equal(findings.flatMap(f => f.sites).filter(s => expected.some(name => s.file.endsWith(`/${name}.tsx`))).length, 8);
assert.ok(findings.every(f => f.sites.every(s => !s.file.includes('/packages/metalui/'))));
const suggestions = run(['imitation', '--suggest']);
measurements.suggest = { wallMs: suggestions.wallMs };
const normalized = value => JSON.parse(JSON.stringify(value).replaceAll(snapshot, root));
const sha256 = createHash('sha256');
for (const file of [...new Set([...report.declarations.map(d => d.site.file), ...suggestions.value.map(p => p.component.source.file)])].sort()) sha256.update(file.slice(snapshot.length)).update('\0').update(readFileSync(file)).update('\0');
writeFileSync('bench/metalui/layer8.imitation.json', JSON.stringify({ root, commit, snapshot: true, sourceSha256: sha256.digest('hex'), findings: normalized(findings) }, null, 2) + '\n');
writeFileSync('bench/metalui/layer8.suggestions.json', JSON.stringify({ root, commit, proposals: normalized(suggestions.value) }, null, 2) + '\n');
writeFileSync('bench/metalui/layer8.run.json', JSON.stringify(measurements, null, 2) + '\n');
console.log(JSON.stringify({ commit, measurements, groups: findings.length, sites: findings.reduce((n, f) => n + f.sites.length, 0), proposals: suggestions.value.length }));
