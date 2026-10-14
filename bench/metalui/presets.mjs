import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const metalui = resolve(process.env.METALUI_ROOT ?? '/Users/vijaysingh/unlocalhosted/metalui');
const cache = resolve(root, 'bench/metalui/.cache/5-presets');
await mkdir(cache, { recursive: true });
const temporary = await mkdtemp(join(cache, 'consumer-'));
const project = join(temporary, 'consumer'), library = join(temporary, 'metalui');
async function link(target, path) { await mkdir(join(path, '..'), { recursive: true }); await symlink(target, path); }
const git = args => spawnSync('git', ['-C', metalui, ...args], {encoding:'utf8'}).stdout.trim();
const statusBefore = git(['status','--porcelain']);
try {
  await cp(join(root, 'fixtures/metalui-consumer'), project, { recursive: true });
  await cp(join(metalui, 'packages/metalui'), library, { recursive: true, filter: path => !path.split('/').includes('node_modules') });
  await cp(join(root, 'bench/metalui/preset'), join(library, 'plumb'), { recursive: true });
  const metadata = JSON.parse(await readFile(join(library, 'package.json'), 'utf8'));
  metadata.plumb = './plumb/index.mjs'; metadata.exports['./plumb'] = './plumb/index.mjs';
  await writeFile(join(library, 'package.json'), JSON.stringify(metadata, null, 2));
  await link(root, join(library, 'node_modules/@unlocalhosted/react-plumber'));
  await link(library, join(project, 'node_modules/@unlocalhosted/metalui'));
  const runs = [];
  for (const lane of ['cold', 'warm']) {
    const start = performance.now();
    const process = spawnSync(globalThis.process.execPath, [join(root, 'dist/cli.js'), '--root', project, '--json'], {
      encoding: 'utf8', timeout: 30000, env: { ...globalThis.process.env, PLUMB_CACHE_DIR: cache },
    });
    assert.ifError(process.error); assert.equal(process.stderr, ''); assert.ok([0, 1].includes(process.status));
    const result = JSON.parse(process.stdout), ownership = result.findings.filter(finding => finding.rule.startsWith('ownership/'));
    assert.equal(result.config.path, null);
    assert.ok(result.decisions.length > 1000); assert.ok(result.decisions.every(token => token.exported));
    assert.equal(result.findings.filter(finding => finding.rule.startsWith('dead/')).length, 0);
    assert.ok(ownership.some(finding => finding.rule === 'ownership/Button'));
    assert.ok(!ownership.some(finding => finding.rule === 'ownership/Surface' && finding.family === 'padding'));
    runs.push({ lane, processMs: +(performance.now() - start).toFixed(1), reportMs: +result.timing.totalMs.toFixed(1),
      presets: result.presets.map(({name, decisions, exported, components, imitation, habits}) => ({name, decisions, exported, contracts: components.contracts.length, fingerprints: imitation.length, habits: habits.length})),
      tokens: result.decisions.length, deadTokens: 0,
      ownership: ownership.map(finding => ({ rule: finding.rule, property: finding.declaration.prop, variants: finding.component.variants })) });
  }
  assert.deepEqual(runs[0].ownership, runs[1].ownership);
  assert.equal(git(['status','--porcelain']), statusBefore);
  const evidence = { commit: git(['rev-parse','HEAD']), packageVersion: metadata.version, consumer: 'fixtures/metalui-consumer', cache: 'bench/metalui/.cache/5-presets', runs };
  await writeFile(join(root, 'bench/metalui/presets.run.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence, null, 2));
} finally { await rm(temporary, { recursive: true, force: true }); }
