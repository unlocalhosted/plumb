import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

// Layer 1 of docs/briefs/onboarding.md: the state reader, through the built CLI.
const root = fileURLToPath(new URL('../', import.meta.url));
const cli = join(root, 'dist/cli.js');
const expectationFile = join(root, 'e2e/fixtures/onboarding-state.json');
const fixture = name => join(root, 'fixtures', name);
function run(args, cache) {
  const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', timeout: 60_000, env: { ...process.env, NO_COLOR: '1', PLUMBER_CACHE_DIR: cache } });
  assert.ifError(result.error);
  return result;
}
async function scratch(t) {
  const cache = await mkdtemp(join(tmpdir(), 'plumber-state-'));
  t.after(() => rm(cache, { recursive: true, force: true }));
  return cache;
}
const expectations = JSON.parse(await readFile(expectationFile, 'utf8'));

// Fixture (relative to fixtures/) -> what the brief's section 7.1 says it is.
const cases = {
  'onboard-clean': { rung: 'R4', kind: 'preset', flags: [] },
  'onboard-partial': { rung: 'R3', kind: 'preset', flags: [] },
  'onboard-framework': { rung: 'R2', kind: 'tailwind', flags: [] },
  'onboard-bare': { rung: 'R1', kind: 'plain', flags: ['noisy'] },
  'onboard-chaos': { rung: 'R3', kind: 'preset', flags: ['conflicting', 'dark-split', 'dead', 'noisy', 'split'] },
  'onboard-v3': { rung: 'R0', kind: 'v3', flags: [] },
  'onboard-monorepo': { rung: 'R0', kind: 'workspace', flags: ['split'] },
  'onboard-monorepo/apps/web': { rung: 'R2', kind: 'tailwind', flags: ['tokens-from-package'] },
  'onboard-monorepo/apps/admin': { rung: 'R1', kind: 'plain', flags: [] },
  'two-entries': { rung: 'R0', kind: 'no-source', flags: ['split'] },
};

for (const [name, expected] of Object.entries(cases)) {
  test(`state of ${name} is ${expected.rung} ${expected.kind}${expected.flags.length ? ` (${expected.flags.join(', ')})` : ''}, equals its committed expectation and is byte-stable`, async t => {
    const cache = await scratch(t);
    const first = run(['state', '--root', fixture(name), '--json'], cache);
    assert.equal(first.status, 0, first.stderr);
    assert.equal(first.stderr, '');
    const state = JSON.parse(first.stdout);
    assert.equal(state.rung, expected.rung);
    assert.equal(state.kind, expected.kind);
    assert.deepEqual(state.flags, expected.flags);
    assert.deepEqual(state.flags, [...state.flags].sort(), 'flags are sorted');
    assert.deepEqual(state, expectations[name]);
    // A second run (warm cache for the report) and a run with no cache at all print the same bytes.
    assert.equal(run(['state', '--root', fixture(name), '--json'], cache).stdout, first.stdout);
    assert.equal(run(['state', '--root', fixture(name), '--json'], await scratch(t)).stdout, first.stdout);
    // The human output is the sentence first.
    const text = run(['state', '--root', fixture(name)], cache);
    assert.equal(text.status, 0);
    assert.equal(text.stdout.split('\n')[0], state.sentence);
  });
}

test('the state sentence is the line under the check header, in every view of the report', async t => {
  const cache = await scratch(t);
  for (const name of ['onboard-clean', 'onboard-partial', 'onboard-framework', 'onboard-bare', 'onboard-chaos']) {
    for (const args of [[], ['--rule', 'provenance']]) {
      const result = run(['--root', fixture(name), ...args], cache);
      assert.ok([0, 1].includes(result.status), result.stderr);
      const header = result.stdout.split('\n\n')[0].split('\n');
      assert.match(header[0], /^React Plumber {2}/);
      assert.equal(header.slice(1).join(' '), expectations[name].sentence, `${name} ${args.join(' ')}`);
    }
    // The JSON report is untouched by the sentence.
    const json = run(['--root', fixture(name), '--json'], cache);
    assert.ok(!('state' in JSON.parse(json.stdout)));
  }
});

test('state reads a project check refuses: two Tailwind entries and a workspace root', async t => {
  const cache = await scratch(t);
  const check = run(['--root', fixture('two-entries')], cache);
  assert.equal(check.status, 2, 'check keeps its behaviour');
  assert.match(check.stderr, /Multiple Tailwind entry files/);
  const state = run(['state', '--root', fixture('two-entries'), '--json'], cache);
  assert.equal(state.status, 0, state.stderr);
  assert.ok(JSON.parse(state.stdout).flags.includes('split'));
  const workspace = run(['--root', fixture('onboard-monorepo')], cache);
  assert.equal(workspace.status, 2, 'check still asks for one app');
  const listed = run(['state', '--root', fixture('onboard-monorepo'), '--json'], cache);
  assert.equal(listed.status, 0, listed.stderr);
  assert.deepEqual(JSON.parse(listed.stdout).numbers.apps.map(app => app.path), ['apps/admin', 'apps/web', 'packages/ui']);
});

test('state writes nothing into the project', async t => {
  const cache = await scratch(t);
  const before = spawnSync('git', ['status', '--porcelain', '--', 'fixtures/onboard-clean', 'fixtures/onboard-v3'], { cwd: root, encoding: 'utf8' }).stdout;
  run(['state', '--root', fixture('onboard-clean'), '--json'], cache);
  run(['state', '--root', fixture('onboard-v3'), '--json'], cache);
  const after = spawnSync('git', ['status', '--porcelain', '--', 'fixtures/onboard-clean', 'fixtures/onboard-v3'], { cwd: root, encoding: 'utf8' }).stdout;
  assert.equal(after, before);
});

test('state rejects flags it does not take and unknown roots as a usage error', async t => {
  const cache = await scratch(t);
  const result = run(['state', '--root', fixture('onboard-clean'), '--base', 'HEAD'], cache);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /--base requires/);
  assert.equal(run(['state', '--root', join(root, 'fixtures/does-not-exist')], cache).status, 2);
});

async function project(t, files) {
  const dir = await mkdtemp(join(root, 'fixtures/.state-e2e-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  for (const [name, text] of Object.entries(files)) {
    await mkdir(join(dir, name, '..'), { recursive: true });
    await writeFile(join(dir, name), text);
  }
  return dir;
}
const stateOf = (dir, cache) => { const result = run(['state', '--root', dir, '--json'], cache); assert.equal(result.status, 0, result.stderr); return JSON.parse(result.stdout); };

test('styles that live in CSS-in-JS templates are named, and prose that mentions css in a comment is not mistaken for them', async t => {
  const cache = await scratch(t);
  const styled = await project(t, {
    'package.json': JSON.stringify({ name: 'styled', private: true, dependencies: { react: '^19.0.0', 'styled-components': '^6.0.0' } }),
    'src/App.tsx': "import styled from 'styled-components';\nconst Box = styled.div`padding: 13px;`;\nexport const App = () => <Box />;\n",
  });
  const state = stateOf(styled, cache);
  assert.equal(state.rung, 'R0');
  assert.equal(state.kind, 'styled-in-js');
  assert.deepEqual(state.flags, ['styled-in-js']);
  assert.match(state.sentence, /^Styles live in styled-components/);
  const prose = await project(t, {
    'package.json': JSON.stringify({ name: 'prose', private: true, dependencies: { react: '^19.0.0' } }),
    'src/styles.css': '.a { padding: 13px; }\n',
    'src/App.tsx': "import './styles.css';\n// the rules live in index.css `theme-iris`, see there\nexport const App = () => <p className=\"a\" />;\n",
  });
  assert.deepEqual(stateOf(prose, cache).flags, []);
});

test('plumber state speaks plain words; the rung codes stay in --json', async t => {
  const cache = await scratch(t);
  const text = run(['state', '--root', fixture('onboard-chaos')], cache);
  assert.equal(text.status, 0, text.stderr);
  assert.doesNotMatch(text.stdout, /\bR[0-9]\b|Partial|Framework\b|\bnoisy\b|\bsplit\b|\bdtcg\b|dark-split/);
  assert.match(text.stdout, /^A system, half in use · from a preset · .*many one-off values/m);
  const json = JSON.parse(run(['state', '--root', fixture('onboard-chaos'), '--json'], cache).stdout);
  assert.equal(json.rung, 'R3');
  assert.deepEqual(json.flags, ['conflicting', 'dark-split', 'dead', 'noisy', 'split']);
  const spec = run(['spec'], cache);
  assert.doesNotMatch(spec.stdout, /tier [0-9]/);
});
