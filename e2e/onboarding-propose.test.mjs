import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readdir, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

// Layer 2 of docs/briefs/onboarding.md: harvest, cluster, ladder, names, through `plumber propose`.
const root = fileURLToPath(new URL('../', import.meta.url));
const cli = join(root, 'dist/cli.js');
const expectationFile = join(root, 'e2e/fixtures/onboarding-propose.json');
const fixture = name => join(root, 'fixtures', name);
function run(args, cache, cwd = root) {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8', timeout: 60_000, env: { ...process.env, NO_COLOR: '1', PLUMBER_CACHE_DIR: cache } });
  assert.ifError(result.error);
  return result;
}
async function scratch(t) {
  const cache = await mkdtemp(join(tmpdir(), 'plumber-propose-'));
  t.after(() => rm(cache, { recursive: true, force: true }));
  return cache;
}
const propose = (dir, cache, ...more) => { const result = run(['propose', '--root', dir, '--json', ...more], cache); assert.equal(result.status, 0, result.stderr); return result; };
const names = ['onboard-bare', 'onboard-framework', 'onboard-partial', 'onboard-chaos', 'onboard-clean', 'onboard-v3'];
let expectations = {};
if (process.env.UPDATE_EXPECTATIONS) {
  const cache = await mkdtemp(join(tmpdir(), 'plumber-propose-'));
  for (const name of names) expectations[name] = JSON.parse(propose(fixture(name), cache).stdout);
  await writeFile(expectationFile, `${JSON.stringify(expectations, null, 2)}\n`);
  await rm(cache, { recursive: true, force: true });
} else expectations = JSON.parse(await readFile(expectationFile, 'utf8'));

for (const name of names) {
  test(`propose for ${name} equals its committed proposal and is byte-stable`, async t => {
    const cache = await scratch(t);
    const first = propose(fixture(name), cache);
    assert.equal(first.stderr, '');
    assert.deepEqual(JSON.parse(first.stdout), expectations[name]);
    // Warm cache, and no cache at all, print the same bytes.
    assert.equal(propose(fixture(name), cache).stdout, first.stdout);
    assert.equal(propose(fixture(name), await scratch(t)).stdout, first.stdout);
  });
}

async function copyShuffled(t, name) {
  // Same project, other place: files created in reverse order with scrambled times, so nothing about
  // the disk repeats the original's read order.
  // Inside the repository, so Tailwind resolves from its node_modules as it does for the fixture itself.
  const target = await mkdtemp(join(root, 'fixtures/.propose-e2e-'));
  t.after(() => rm(target, { recursive: true, force: true }));
  const files = [];
  const walk = async dir => { for (const entry of (await readdir(join(fixture(name), dir), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(dir, entry.name);
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    if (entry.isDirectory()) await walk(path); else files.push(path);
  } };
  await walk('');
  let when = 1_700_000_000;
  for (const path of files.reverse()) {
    await mkdir(join(target, dirname(path)), { recursive: true });
    await cp(join(fixture(name), path), join(target, path));
    when += (path.length * 7919) % 5000;
    await utimes(join(target, path), when, when);
  }
  return target;
}

test('the proposal does not depend on where the project is or the order its files were written', async t => {
  const cache = await scratch(t);
  for (const name of ['onboard-bare', 'onboard-framework', 'onboard-chaos']) {
    const copy = await copyShuffled(t, name);
    const here = JSON.parse(propose(fixture(name), cache).stdout), there = JSON.parse(propose(copy, await scratch(t)).stdout);
    assert.deepEqual(there, here, name);
  }
});

test('propose reads only: it writes nothing into the project', async t => {
  const cache = await scratch(t);
  const watched = ['fixtures/onboard-bare', 'fixtures/onboard-framework', 'fixtures/onboard-chaos'];
  const status = () => spawnSync('git', ['status', '--porcelain', '--', ...watched], { cwd: root, encoding: 'utf8' }).stdout;
  const before = status();
  for (const name of ['onboard-bare', 'onboard-framework', 'onboard-chaos']) run(['propose', '--root', fixture(name)], cache);
  assert.equal(status(), before);
  await assert.rejects(stat(join(fixture('onboard-bare'), 'src/theme.css')), { code: 'ENOENT' });
});

test('onboard-bare: near values merge, the scale is named, every step says why', async t => {
  const cache = await scratch(t);
  const proposal = JSON.parse(propose(fixture('onboard-bare'), cache).stdout);
  assert.equal(proposal.shape, 'root');
  assert.deepEqual(proposal.target, { file: 'src/theme.css', create: true, importedFrom: 'src/styles.css' });
  assert.match(proposal.hash, /^[0-9a-f]{12}$/);
  const spacing = proposal.families.find(family => family.family === 'spacing').scales[0];
  assert.equal(spacing.ladder, 'grid-4');
  assert.deepEqual(spacing.steps.map(step => step.name), ['--spacing-xs', '--spacing-sm', '--spacing-md', '--spacing-lg', '--spacing-xl']);
  const md = spacing.steps.find(step => step.name === '--spacing-md');
  assert.equal(md.value, '12px');
  assert.deepEqual(md.absorbs.map(item => item.value), ['10px', '11px', '13px', '14px']);
  assert.ok(spacing.merged.some(item => item.value === '13px' && item.into === '12px'));
  const colour = proposal.families.find(family => family.family === 'color').scales[0];
  assert.ok(colour.merged.some(item => item.value === '#676767' && item.into === '#666'), 'the grey that is a hair off the other grey is merged');
  for (const family of proposal.families) for (const scale of family.scales) for (const step of scale.steps) {
    assert.match(step.why, /\(drafted\)$/);
    assert.ok(step.sites >= 1 && step.files >= 1 && step.examples.length >= 1);
  }
  const type = proposal.families.find(family => family.family === 'type').scales.find(scale => scale.measure === 'type-size');
  assert.equal(type.steps.find(step => step.name === '--text-sm').value, '0.875rem', 'the body size (14px) sits in the middle of the type scale');
  assert.deepEqual(type.steps.map(step => step.name).slice(0, 3), ['--text-xs', '--text-sm', '--text-base']);
});

test('onboard-framework: the keys in use become yours, with the names they already have', async t => {
  const cache = await scratch(t);
  const proposal = JSON.parse(propose(fixture('onboard-framework'), cache).stdout);
  assert.equal(proposal.shape, 'theme');
  assert.deepEqual(proposal.target, { file: 'src/index.css', create: false, importedFrom: null });
  const tokens = Object.fromEntries(proposal.families.flatMap(family => family.scales.flatMap(scale => scale.tokens)).map(token => [token.name, token.value]));
  assert.equal(tokens['--text-sm'], '0.875rem');
  assert.equal(tokens['--text-2xl'], '1.5rem');
  assert.equal(tokens['--radius-lg'], '0.5rem');
  assert.match(tokens['--color-blue-600'], /^oklch\(/);
  assert.match(tokens['--shadow-sm'], /^0 1px 3px/);
  assert.equal(tokens['--spacing'], '0.25rem', 'the numeric ruler stays open: one base, not a token per step');
  assert.ok(!Object.keys(tokens).some(name => /^--spacing-/.test(name)));
  const spacing = proposal.families.find(family => family.family === 'spacing').scales[0];
  assert.equal(spacing.ladder, 'tailwind-numeric');
  assert.deepEqual(spacing.steps.map(step => step.name), ['--spacing-2', '--spacing-3', '--spacing-4', '--spacing-6']);
  assert.ok(spacing.steps.every(step => step.written === false));
  assert.deepEqual(spacing.steps.find(step => step.name === '--spacing-3').absorbs.map(item => item.value), ['13px'], 'p-[13px] snaps to the nearest step; it is listed, not edited');
});

test('onboard-chaos: merges and near pairs are reported, and the cascade picks the --radius that wins', async t => {
  const cache = await scratch(t);
  const proposal = JSON.parse(propose(fixture('onboard-chaos'), cache).stdout);
  const spacing = proposal.families.find(family => family.family === 'spacing').scales[0];
  assert.ok(spacing.merged.length >= 2 && spacing.near.length >= 1);
  assert.ok(proposal.skipped.some(item => item.family === 'color'), 'colour already has your tokens');
  assert.ok(proposal.skipped.some(item => item.family === 'radius'));
  const note = proposal.notes.find(item => item.startsWith('--radius is set 2 times'));
  assert.ok(note, proposal.notes.join('\n'));
  assert.match(note, /8px in src\/legacy\.css:3, 6px in src\/index\.css:19/);
  assert.match(note, /ends on 6px/);
});

test('a project that already has every token has nothing to propose, and a Tailwind 3 project says what to do first', async t => {
  const cache = await scratch(t);
  const clean = JSON.parse(propose(fixture('onboard-clean'), cache).stdout);
  assert.deepEqual(clean.families, []);
  assert.equal(clean.shape, null);
  const text = run(['propose', '--root', fixture('onboard-clean')], cache);
  assert.equal(text.status, 0);
  assert.match(text.stdout, /^Nothing to propose\./);
  const v3 = JSON.parse(propose(fixture('onboard-v3'), cache).stdout);
  assert.match(v3.blocked.sentence, /^Tailwind 3\.4/);
  assert.equal(v3.blocked.next, 'npx @tailwindcss/upgrade');
});

test('propose --family shows one family; the table says steps in plain words', async t => {
  const cache = await scratch(t);
  const one = JSON.parse(propose(fixture('onboard-bare'), cache, '--family', 'type').stdout);
  assert.deepEqual(one.families.map(family => family.family), ['type']);
  const text = run(['propose', '--root', fixture('onboard-bare'), '--family', 'spacing'], cache);
  assert.equal(text.status, 0, text.stderr);
  assert.match(text.stdout, /^Spacing: 11 values in use snap to 5 steps \(xs…xl\)\./);
  assert.match(text.stdout, /--spacing-md\s+12px\s+6\s+1\s+src\/styles\.css:\d+\s+takes 10px, 11px, 13px \+1/);
  assert.match(text.stdout, /merged 13px into 12px/);
  assert.match(text.stdout, /plumber propose --write puts these in a new src\/theme\.css\./);
  for (const banned of ['cluster', 'provenance', 'rung', 'slot', 'decision']) assert.ok(!text.stdout.toLowerCase().includes(banned), banned);
  const bad = run(['propose', '--root', fixture('onboard-bare'), '--family', 'nope'], cache);
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /--family takes one of spacing, color/);
});

test('changing one value changes the hash and the step it belongs to', async t => {
  const cache = await scratch(t);
  const copy = await copyShuffled(t, 'onboard-bare');
  const before = JSON.parse(propose(copy, cache).stdout);
  const css = join(copy, 'src/styles.css');
  await writeFile(css, (await readFile(css, 'utf8')).replace('gap: 10px', 'gap: 40px'));
  const after = JSON.parse(propose(copy, await scratch(t)).stdout);
  assert.notEqual(after.hash, before.hash);
  const values = proposal => proposal.families.find(family => family.family === 'spacing').scales[0].steps.map(step => step.value);
  assert.ok(values(after).includes('40px'));
  assert.ok(!values(before).includes('40px'));
});
