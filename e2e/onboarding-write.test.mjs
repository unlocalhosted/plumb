import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

// Layer 3 of docs/briefs/onboarding.md: write the proposal, and the new `init` order, through the built CLI.
const root = fileURLToPath(new URL('../', import.meta.url));
const cli = join(root, 'dist/cli.js');
const pty = join(root, 'e2e/helpers/cli-pty-input.py');
const expectedTheme = join(root, 'e2e/fixtures/onboarding-theme-bare.css');
async function copy(t, name) {
  // Inside the repository, so Tailwind resolves from its node_modules as it does for the fixture itself.
  const dir = await mkdtemp(join(root, 'fixtures/.write-e2e-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await cp(join(root, 'fixtures', name), dir, { recursive: true });
  return dir;
}
async function env(t) {
  const cache = await mkdtemp(join(tmpdir(), 'plumber-write-'));
  t.after(() => rm(cache, { recursive: true, force: true }));
  return { ...process.env, NO_COLOR: '1', PLUMBER_CACHE_DIR: cache, GIT_CEILING_DIRECTORIES: tmpdir() };
}
function run(dir, environment, args, status = 0) {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd: dir, encoding: 'utf8', timeout: 90_000, env: environment, input: '' });
  assert.ifError(result.error);
  assert.equal(result.status, status, result.stderr || result.stdout);
  return result;
}
const ledger = async dir => (await readFile(join(dir, '.plumber/ledger.jsonl'), 'utf8')).split('\n').filter(Boolean).map(line => JSON.parse(line));
const json = (dir, environment, args, status = 0) => JSON.parse(run(dir, environment, args, status).stdout);

test('init --yes on a project with no system: propose, write the theme, then baseline; check is green', async t => {
  const dir = await copy(t, 'onboard-bare'), environment = await env(t);
  const result = run(dir, environment, ['init', '--yes']);
  assert.match(result.stdout, /^No system yet:/);
  assert.match(result.stdout, /\n1\/5 {2}Spacing: 11 values in use snap to 5 steps \(xs…xl\)\. Keep these as your tokens\? {2}yes\n/);
  assert.match(result.stdout, /Wrote 27 tokens to src\/theme\.css \(:root\): 5 spacing, 12 colour, 2 radius, 6 type, 2 motion\. Imported it from src\/styles\.css\./);
  assert.match(result.stdout, /Baseline: \d+ debt entries/);
  assert.match(result.stdout, /Accepted 27 tokens as inferred\./);
  if (process.env.UPDATE_EXPECTATIONS) await writeFile(expectedTheme, await readFile(join(dir, 'src/theme.css'), 'utf8'));
  assert.equal(await readFile(join(dir, 'src/theme.css'), 'utf8'), await readFile(expectedTheme, 'utf8'));
  assert.match(await readFile(join(dir, 'src/styles.css'), 'utf8'), /^@import "\.\/theme\.css";\n:root \{\n {2}--page: #ffffff;/);
  const entries = await ledger(dir);
  assert.equal(entries.filter(entry => entry.rule === 'config/no-tokens' || entry.key.startsWith('config/no-tokens')).length, 0);
  assert.ok(entries.filter(entry => entry.kind === 'debt').length > 0 && entries.filter(entry => entry.kind === 'debt').length < 80, 'a ledger a person can read');
  run(dir, environment, ['check']);
  // The proposed tokens are the project's tokens now, with their drafted reasons, accepted as inferred.
  const decisions = json(dir, environment, ['decisions', '--json']);
  for (const name of ['--spacing-md', '--text-sm', '--radius-md', '--color-blue-1', '--duration-base']) {
    const decision = decisions.find(item => item.name === name);
    assert.ok(decision, name);
    assert.match(decision.why || decision.groupWhy, /\(drafted\)$/);
    assert.equal(entries.find(entry => entry.key === `decision:${decision.family}:${name}`).inferred, true);
  }
  // Nothing left to propose; a second write has nothing to do.
  assert.match(run(dir, environment, ['propose', '--write']).stdout, /^Nothing to write\./);
});

test('init --yes --family type=skip leaves type as a setup gap that doctor names, not debt', async t => {
  const dir = await copy(t, 'onboard-bare'), environment = await env(t);
  const result = run(dir, environment, ['init', '--yes', '--family', 'type=skip']);
  assert.match(result.stdout, /Type: .* Keep these as your tokens\? {2}skipped/);
  assert.match(result.stdout, /Left for later: type\./);
  assert.doesNotMatch(await readFile(join(dir, 'src/theme.css'), 'utf8'), /--text-/);
  assert.equal((await ledger(dir)).filter(entry => /no-tokens/.test(entry.key)).length, 0);
  const doctor = run(dir, environment, ['doctor']).stdout;
  assert.match(doctor, /fix type tokens .*\[read\.tokens\.type\]|\[read\.tokens\.type\]/);
  assert.doesNotMatch(doctor.split('[read.tokens.type]')[0].split('\n').at(-1), /^\s+ok /);
  assert.match(run(dir, environment, ['check']).stdout, /no tokens|setup gap/);
});

test('init asks one question at a time in a terminal: Enter keeps, s shows the steps, n skips', async t => {
  const dir = await copy(t, 'onboard-bare'), environment = await env(t);
  const result = spawnSync('python3', [pty], { encoding: 'utf8', timeout: 120_000,
    input: JSON.stringify({ command: [process.execPath, cli, 'init'], cwd: dir, env: environment, answers: ['', 's', '', 'n', '', 'y'] }) });
  assert.equal(result.status, 0, result.stderr);
  const out = JSON.parse(result.stdout);
  assert.equal(out.status, 0, out.stderr + out.stdout);
  assert.match(out.stdout, /1\/5 {2}Spacing:/);
  assert.match(out.stdout, /Enter: yes · s: show the steps · n: skip/);
  assert.match(out.stdout, /--color-gray-1 {2}#fff {2}3 places/, 's shows the steps and asks again');
  assert.equal((out.stdout.match(/2\/5 {2}Colour:/g) ?? []).length, 2);
  assert.match(out.stdout, /Left for later: radius\./);
  const theme = await readFile(join(dir, 'src/theme.css'), 'utf8');
  assert.match(theme, /--spacing-md: 12px/);
  assert.doesNotMatch(theme, /--radius-/);
});

test('init with answers on the command line asks nothing and says what it took', async t => {
  const dir = await copy(t, 'onboard-bare'), environment = await env(t);
  const bad = run(dir, environment, ['init', '--family', 'nope=skip'], 2);
  assert.match(bad.stderr, /--family nope=skip: use a family/);
  assert.match(run(dir, environment, ['init', '--family', 'type=maybe'], 2).stderr, /keep or skip/);
  const result = run(dir, environment, ['init', '--family', 'type=skip', '--family', 'motion=skip', '--yes']);
  assert.match(result.stdout, /Left for later: type, motion\./);
});

test('onboard-partial: the shadcn shape is extended in place and what was there is untouched', async t => {
  const dir = await copy(t, 'onboard-partial'), environment = await env(t);
  const css = join(dir, 'src/index.css');
  const before = await readFile(css, 'utf8');
  const result = run(dir, environment, ['propose', '--write']);
  assert.match(result.stdout, /\+\+\+ src\/index\.css\n/);
  assert.match(result.stdout, /Wrote \d+ tokens to src\/index\.css \(@theme inline\): /);
  const after = await readFile(css, 'utf8');
  // Every line that was there is still there, in order; the new ones went inside the existing `@theme inline` block.
  let at = 0;
  for (const line of before.split('\n').filter(Boolean)) { at = after.indexOf(line, at); assert.ok(at >= 0, line); }
  assert.match(after, /--color-primary: var\(--primary\);/);
  assert.match(after, /--primary: oklch\(0\.205 0 0\);/);
  const inline = after.slice(after.indexOf('@theme inline'));
  assert.match(inline, /--text-sm: 0\.875rem;/);
  assert.match(inline, /--radius-lg: 0\.5rem;/);
  assert.match(inline, /--spacing: 0\.25rem;/);
  assert.equal((after.match(/@theme/g) ?? []).length, 1, 'no second block');
  const decisions = json(dir, environment, ['decisions', '--json', '--family', 'type']);
  assert.ok(decisions.some(item => item.name === '--text-sm' && /\(drafted\)$/.test(item.why || item.groupWhy)));
  run(dir, environment, ['check']);
});

test('onboard-framework: the keys in use are adopted in an @theme block, and no family is left without tokens', async t => {
  const dir = await copy(t, 'onboard-framework'), environment = await env(t);
  run(dir, environment, ['init', '--yes']);
  const css = await readFile(join(dir, 'src/index.css'), 'utf8');
  assert.match(css, /^@import "tailwindcss";\n\n\/\* React Plumber proposal [0-9a-f]{12}: .*\*\/\n@theme \{/);
  assert.match(css, /--text-sm: 0\.875rem;/);
  assert.match(css, /--shadow-sm: 0 1px 3px 0 rgb\(0 0 0 \/ 0\.1\), 0 1px 2px -1px rgb\(0 0 0 \/ 0\.1\);/);
  assert.match(css, /--spacing: 0\.25rem;/);
  const report = json(dir, environment, ['check', '--json']);
  assert.ok(!report.findings.some(finding => finding.rule === 'config/no-tokens'));
  assert.ok(report.findings.some(finding => finding.rule === 'provenance/arbitrary' || finding.family === 'spacing'), 'p-[13px] is real drift against a real ruler');
});

test('baseline never records a family with no tokens as debt', async t => {
  const dir = await copy(t, 'onboard-bare'), environment = await env(t);
  run(dir, environment, ['check']);
  run(dir, environment, ['baseline']);
  const entries = await ledger(dir);
  assert.equal(entries.filter(entry => /no-tokens/.test(entry.key)).length, 0);
  assert.equal(entries.length, 0, 'nothing but setup gaps to carry');
});

test('a declined value is written to the ledger as declined and is never proposed again', async t => {
  const dir = await copy(t, 'onboard-bare'), environment = await env(t);
  const spacing = args => json(dir, environment, ['propose', '--json', ...args]).families.find(family => family.family === 'spacing').scales[0].steps.map(step => step.value);
  assert.ok(spacing([]).includes('20px'));
  const result = run(dir, environment, ['propose', '--decline', 'spacing=20px']);
  assert.match(result.stdout, /^Declined spacing 20px\. It won't be proposed again\./);
  assert.deepEqual((await ledger(dir)).map(entry => [entry.kind, entry.key, entry.family, entry.value]), [['declined', 'declined:spacing:20', 'spacing', '20px']]);
  assert.ok(!spacing([]).includes('20px'));
  assert.match(run(dir, environment, ['propose', '--decline', 'spacing=1.25rem']).stdout, /already declined/, 'the same value, spelled another way');
  // The ledger still reads, and init and prune keep the line.
  run(dir, environment, ['init', '--yes']);
  run(dir, environment, ['ledger', '--prune']);
  assert.ok((await ledger(dir)).some(entry => entry.kind === 'declined' && entry.value === '20px'));
  assert.doesNotMatch(await readFile(join(dir, 'src/theme.css'), 'utf8'), /20px/);
  assert.equal(run(dir, environment, ['propose', '--decline', 'nope=1'], 2).status, 2);
});

test('propose names a negative step with an n, never a double dash, and writes it', async t => {
  const dir = await copy(t, 'onboard-bare'), environment = await env(t);
  await writeFile(join(dir, 'src/layers.css'), '.under { z-index: -10; }\n.under2 { z-index: -10; }\n.over { z-index: 50; }\n.over2 { z-index: 50; }\n');
  const proposed = json(dir, environment, ['propose', '--json']);
  const names = JSON.stringify(proposed);
  assert.match(names, /--z-n10/);
  assert.doesNotMatch(names, /--[a-z-]+--\d/);
  assert.match(run(dir, environment, ['propose']).stdout, /--z-n10 +-10/);
  run(dir, environment, ['propose', '--write']);
  assert.match(await readFile(join(dir, 'src/theme.css'), 'utf8'), /--z-n10: -10;/);
});
