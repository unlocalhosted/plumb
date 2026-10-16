import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFile, cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { reportFixture } from './report-fixture.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));
const cli = join(repo, 'dist/cli.js');
const strip = text => text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replaceAll('\r', '');
async function fixture(t, name = 'adoption') {
  const root = await mkdtemp(join(tmpdir(), 'plumb-report-nits-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures', name), root, { recursive: true });
  if (name === 'adoption') for (const file of ['plumber.config.ts', '.plumber']) await rm(join(root, file), { recursive: true, force: true });
  return root;
}
function run(root, args = [], columns = 80, tty = false) {
  const env = { ...process.env, CI: '1', COLUMNS: String(columns), PLUMBER_CACHE_DIR: join(root, '.cache') };
  delete env.NO_COLOR;
  const command = [process.execPath, cli, 'check', '--root', root, ...args];
  const result = tty
    ? spawnSync('python3', [join(repo, 'e2e/helpers/cli-pty.py')], { encoding: 'utf8', timeout: 20000,
      input: JSON.stringify({ command, cwd: repo, env, columns, stdoutTTY: true }) })
    : spawnSync(command[0], command.slice(1), { encoding: 'utf8', timeout: 20000, cwd: repo, env });
  assert.ifError(result.error);
  if (tty) assert.equal(result.status, 0, result.stderr);
  const output = tty ? JSON.parse(result.stdout) : result;
  assert.ok([0, 1].includes(output.status), output.stderr);
  assert.equal(output.stderr, '');
  return strip(output.stdout);
}

test('Fix first reasons stay whole in pipes and PTYs; narrow tables omit reasons', async t => {
  const root = await fixture(t);
  for (const tty of [false, true]) {
    const rows = run(root, [], 80, tty).split('Fix first\n')[1].split('\n\n')[0].split('\n').filter(line => line.includes('plumber check'));
    assert.equal(rows.length, 2);
    assert.match(rows[0], /tokens missing\s+plumber check --rule config$/);
    assert.match(rows[1], /most in spacing\s+plumber check --rule provenance$/);
    assert.ok(rows.every(row => !row.trim().split(/ {2,}/)[1].includes('…')), rows.join('\n'));
  }
  const narrow = run(root, [], 60, true).split('Fix first\n')[1].split('\n\n')[0];
  assert.doesNotMatch(narrow, /tokens missing|most in/);
  assert.ok(narrow.split('\n').filter(line => line.includes('plumber check')).every(line => line.trim().split(/ {2,}/).length === 2));
  assert.match(narrow, /plumber check --rule config\n/);
  assert.match(narrow, /plumber check --rule provenance/);
});

test('top declarations and classes mark counts with × in pipes and PTYs', async t => {
  const root = await fixture(t), classes = await reportFixture(t);
  await writeFile(join(classes, 'src/Many.tsx'), `export const Many = () => <>${'<div className="font-mono text-xs" />'.repeat(1024)}</>;`);
  for (const tty of [false, true]) {
    assert.match(run(root, [], 80, tty), /gap: 10px ×1 · margin-left: 10px ×1/);
    const output = run(classes, [], 140, tty);
    assert.match(output, /font-mono ×1,056/);
    assert.match(output, /text-xs ×1,056/, 'size and line-height count each authored class site once');
  }
});

test('compact sites sort by file then numeric line before taking four, in pipes and PTYs', async t => {
  const root = await fixture(t, 'habits');
  for (const tty of [false, true]) {
    const output = run(root, ['--rule', 'habits'], 80, tty);
    assert.match(output, /styles.css:1 · styles.css:3 · styles.css:5 · styles.css:6 · \+2/);
    assert.match(output, /styles.css:30 · styles.css:32/);
  }
  await writeFile(join(root, 'src/A.css'), '.a:hover { color: red; }');
  await writeFile(join(root, 'src/z.css'), '.z:hover { color: red; }');
  for (const tty of [false, true]) {
    assert.match(run(root, ['--rule', 'habits'], 80, tty), /A.css:1 · styles.css:1 · styles.css:3 · styles.css:5 · \+4/);
  }
});

test('habit fixes name complete declarations and wrap without losing replacements in pipes and PTYs', async t => {
  const root = await fixture(t, 'habits');
  await appendFile(join(root, 'src/styles.css'), '\n.extra { text-align: right; float: left; clear: right; margin: 1px 2px 3px 4px; inset: 1px 2px 3px 4px; }\n');
  await appendFile(join(root, 'src/App.tsx'), '\nexport const Inline = () => <div style={{textAlign: "left", marginRight: 2}} />;\n');
  const expected = [
    'Use text-align: start', 'Use text-align: end', 'Use float: inline-start', 'Use clear: inline-end',
    'Use inset-inline-start: 10px', 'Use margin-inline-end: 2px',
    'Use border-inline-start-width: 1px', 'Use border-start-start-radius: 2px',
    ...['padding', 'margin', 'inset'].map(prop => `Use ${prop}-block-start: 1px; ${prop}-inline-end: 2px; ${prop}-block-end: 3px; ${prop}-inline-start: 4px`),
    'Use height: calc(100dvh - 2px) (changing viewport) · height: calc(100svh - 2px) (smallest) · height: calc(100lvh - 2px) (largest)',
    'Use width: 100dvw (changing viewport) · width: 100svw (smallest) · width: 100lvw (largest)',
    'Use padding: env(safe-area-inset-top, 0px)', 'Use margin: var(--space, env(safe-area-inset-bottom, 0px))',
    'Use overflow: clip if nothing scrolls it', 'Add overscroll-behavior-y: contain', 'Add overscroll-behavior: contain',
  ];
  for (const tty of [false, true]) {
    const output = run(root, ['--rule', 'habits'], 80, tty);
    const text = output.replace(/\s+/g, ' ');
    for (const action of expected) assert.ok(text.includes('→ ' + action), action);
    assert.doesNotMatch(output, /→ Use (?:start|end|inset-inline-start|margin-inline-end)\n/);
    const lines = output.split('\n');
    for (const line of lines) assert.ok([...line].length <= (tty ? 80 : 100), line);
    for (let i = 0; i < lines.length; i++) if (lines[i].includes('→')) {
      do { assert.ok(!lines[i].includes('…'), lines[i]); i++; } while (lines[i]?.trim() && !lines[i].includes('→'));
    }
  }
});
