import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = join(root, 'dist/cli.js');
function run(directory, cache) {
  const result = spawnSync(process.execPath, [cli, '--root', directory, '--json'], {
    encoding: 'utf8', timeout: 15_000, env: { ...process.env, PLUMB_CACHE_DIR: cache },
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null, result.stderr);
  assert.equal(result.stderr, '');
  assert.equal(result.status, 0);
  return JSON.parse(result.stdout);
}
async function setup(t) {
  const directory = await mkdtemp(join(root, 'fixtures/.false-positives-e2e-'));
  const cache = await mkdtemp(join(tmpdir(), 'plumb-cache-false-positives-'));
  t.after(() => Promise.all([rm(directory, { recursive: true, force: true }), rm(cache, { recursive: true, force: true })]));
  await cp(join(root, 'fixtures/tailwind-false-positives'), directory, { recursive: true, filter: path => !path.includes('.plumb-cache') });
  return { directory, cache };
}

test('template whitespace separates classes while glued interpolations stay dynamic', async t => {
  const { directory, cache } = await setup(t);
  const { findings } = run(directory, cache);
  const existence = findings.filter(f => f.rule.startsWith('existence/') && f.rule !== 'existence/dead-var');
  assert.deepEqual(existence.filter(f => f.rule === 'existence/dynamic-class').map(f => f.declaration.value).sort(), ['${x}-500', 'bg-${x}']);
  assert.deepEqual(existence.filter(f => f.rule === 'existence/dead-class').map(f => f.declaration.value).sort(), ['border-brnad', 'text-brnad']);
});

test('Tailwind internals neither fail variable existence nor appear as suggestions', async t => {
  const { directory, cache } = await setup(t);
  const { findings } = run(directory, cache);
  const missing = findings.filter(f => f.rule === 'existence/dead-var');
  assert.deepEqual(missing.map(f => f.key).sort(), ['existence/dead-var:--color-brnad', 'existence/dead-var:--t-shadow']);
  assert.match(missing.find(f => f.key.endsWith(':--color-brnad')).action, /--color-brand/);
  assert.ok(findings.every(f => !/Did you mean.*--tw-/.test(f.action ?? '')));
});

test('project shadow decisions own their literals while call-site raw colours still fail', async t => {
  const { directory, cache } = await setup(t);
  const { findings } = run(directory, cache);
  const colors = findings.filter(f => f.family === 'color' && f.rule.startsWith('provenance/'));
  assert.ok(!colors.some(f => f.sites.some(s => s.text === 'shadow-lift' || s.text.includes('box-shadow: var(--shadow-lift);'))));
  assert.ok(!colors.some(f => f.title.includes('rgb(28 33 48 / 0.05)')));
  for (const token of ['shadow-[0_1px_1px_rgb(1_2_3)]', 'text-[#123456]']) {
    assert.ok(colors.some(f => f.sites.some(s => s.text === token)), token);
  }
  assert.ok(colors.some(f => f.title.includes('rgb(4 5 6)')), 'raw colour alongside a token still fails');
});

test('Tailwind rings are colour indicators, while adjacent shadows remain elevation', async t => {
  const { directory, cache } = await setup(t);
  const { findings } = run(directory, cache);
  const elevation = findings.filter(f => f.family === 'elevation' && f.rule.startsWith('provenance/'));
  const colors = findings.filter(f => f.family === 'color' && f.rule.startsWith('provenance/'));
  const sites = list => list.flatMap(f => f.sites).filter(s => s.file.endsWith('/Rings.jsx'));
  assert.ok(!sites(elevation).some(s => /^(?:focus-visible:|aria-invalid:|inset-)?ring-/.test(s.text)), 'ring layers are not elevation');
  assert.ok(!elevation.some(f => /box-shadow 0(?:px)? 0(?:px)? (?:transparent|#0000)/.test(f.title)), 'placeholder layers are not elevation');
  assert.ok(!sites(colors).some(s => s.text.includes('ring-brand/')), 'project ring colour passes');
  assert.ok(!sites(colors).some(s => /^(?:focus-visible:|aria-invalid:|inset-)?ring-1$/.test(s.text)), 'ring geometry supplies no raw colour');
  for (const token of ['ring-[#123456]', 'inset-ring-[#123456]']) {
    assert.ok(sites(colors).some(s => s.text === token), `${token} still fails colour provenance`);
  }
  for (const token of ['shadow-[0_4px_8px_rgba(0,0,0,.2)]', 'shadow-md', 'inset-shadow-sm']) {
    assert.ok(sites(elevation).some(s => s.text === token), `${token} still fails elevation provenance`);
  }
  assert.ok(!sites(elevation).some(s => s.text === 'shadow-lift' || s.text === 'token-shadow'), 'project shadow tokens pass');
  assert.ok(sites(elevation).some(s => s.text.includes('boxShadow')), 'inline raw shadow still fails');
  assert.ok(elevation.some(f => f.sites.some(s => s.text.includes('box-shadow: var(--shadow-lift),'))), 'CSS raw shadow alongside token still fails');
});
