// The check cache is keyed by the built code itself: a rebuild that changes what the pipeline collects is never served
// the previous build's result, with or without a version bump. Real CLI, twice: this build, then a copy of it whose
// collector is changed, against the same cache directory.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const repo = fileURLToPath(new URL('../', import.meta.url));
function run(cli, directory, cache) {
  const result = spawnSync(process.execPath, [cli, 'check', '--root', directory, '--json'], { encoding: 'utf8', timeout: 30_000, env: { ...process.env, PLUMBER_CACHE_DIR: cache }, maxBuffer: 32 * 1024 * 1024 });
  assert.ifError(result.error);
  assert.equal(result.stderr, '');
  assert.ok([0, 1].includes(result.status), result.stdout);
  return JSON.parse(result.stdout);
}

test('a rebuild whose collector changes invalidates every cached result', { timeout: 120_000 }, async t => {
  const directory = await mkdtemp(join(repo, 'fixtures/.build-cache-'));
  const cache = await mkdtemp(join(tmpdir(), 'plumb-build-cache-'));
  const build = await mkdtemp(join(repo, 'fixtures/.build-'));
  t.after(() => Promise.all([directory, cache, build].map(path => rm(path, { recursive: true, force: true }))));
  await cp(join(repo, 'fixtures/messages'), directory, { recursive: true });
  // a class outside any component is anchored to the module: the collector names that anchor
  await writeFile(join(directory, 'src/App.tsx'), `import './styles.css';\nexport const banner = <div className="p-[9px]" />;\n`);
  const owner = report => report.declarations.find(d => d.site.text === 'p-[9px]')?.site.anchor;
  const cold = run(join(repo, 'dist/cli.js'), directory, cache), warm = run(join(repo, 'dist/cli.js'), directory, cache);
  assert.equal(owner(cold), '<module>');
  assert.deepEqual(warm.findings, cold.findings);
  assert.ok(Object.values(warm.timing.phases).every(ms => ms === 0), 'the second run is served from the cache');
  // the same code, rebuilt with one change in the collector, next to its package.json as the real build is
  await cp(join(repo, 'dist'), join(build, 'dist'), { recursive: true });
  await cp(join(repo, 'package.json'), join(build, 'package.json'));
  await cp(join(repo, 'overlay/src'), join(build, 'overlay/src'), { recursive: true });
  const collector = join(build, 'dist/collect/source.js'), text = await readFile(collector, 'utf8');
  assert.ok(text.includes("'<module>'"));
  await writeFile(collector, text.replaceAll("'<module>'", "'<rebuilt>'"));
  const rebuilt = run(join(build, 'dist/cli.js'), directory, cache);
  assert.equal(owner(rebuilt), '<rebuilt>', 'the rebuilt collector is read, not the cached result of the old one');
  const again = run(join(build, 'dist/cli.js'), directory, cache);
  assert.equal(owner(again), '<rebuilt>');
  assert.ok(Object.values(again.timing.phases).every(ms => ms === 0), 'the rebuilt code gets its own cache');
});
