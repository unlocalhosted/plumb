import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFile, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { reportFixture } from './report-fixture.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));
const cli = join(repo, 'dist/cli.js');
const strip = text => text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replaceAll('\r', '');
function pty(root, args, columns, cache, noColor = false) {
  const env = { ...process.env, CI: '1', PLUMBER_CACHE_DIR: cache };
  delete env.NO_COLOR;
  if (noColor) env.NO_COLOR = '1';
  const result = spawnSync('python3', [join(repo, 'e2e/helpers/cli-pty.py')], { encoding: 'utf8', timeout: 60000,
    input: JSON.stringify({ command: [process.execPath, cli, '--root', root, ...args], cwd: repo, env, columns, stdoutTTY: true, timeout: 55 }) });
  assert.ifError(result.error); assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.ok([0, 1].includes(output.status), output.stderr);
  assert.equal(output.stderr, '');
  return output.stdout;
}
function bounded(output, columns) {
  const text = strip(output);
  for (const line of text.split('\n')) assert.ok([...line].length <= columns, `${columns}: ${line}`);
  const body = text.split('\n\n').filter(block => /^  [!✗·]  /.test(block));
  const offsets = [];
  for (const block of body) {
    const lines = block.split('\n');
    assert.ok(lines.length <= 3, block);
    const location = lines[0].trim().split(/ {2,}/).at(-1);
    assert.match(location, /(?:[\d,]+ sites? in [\d,]+ files?)|(?:\S.*:\d+)$/, lines[0]);
    offsets.push(lines[0].lastIndexOf(location));
    assert.ok(!lines.slice(1).some(line => /[{}]|\?\s*$/.test(line) && !line.includes('→')), block);
  }
  if (offsets.length) assert.equal(new Set(offsets).size, 1, 'fixed location column');
  return text;
}

test('finding presentation: real PTYs at 80/140, compact subjects, colour, collisions and source expressions', async t => {
  const root = await reportFixture(t), cache = await mkdtemp(join(tmpdir(), 'plumber-finding-'));
  t.after(() => rm(cache, { recursive: true, force: true }));
  for (const folder of ['a', 'b']) {
    await mkdir(join(root, `src/${folder}/shared`), { recursive: true });
    await writeFile(join(root, `src/${folder}/shared/Panel.tsx`), 'export const Panel = () => <div className="p-[13px]" />;');
  }
  await writeFile(join(root, 'src/Expression.tsx'), `export const Expression = ({ready}) => <div style={{ color: ready ?
    'var(--never-defined-with-a-long-name)' :
    'var(--never-defined-with-another-long-name)' }} />;`);
  for (const columns of [80, 140]) {
    const type = bounded(pty(root, ['--family', 'type'], columns, cache), columns);
    assert.equal((type.match(/^  !  text-xs\s/gm) ?? []).length, 1);
    assert.match(type, /text-xs\s+off your type scale.*32 sites in 32 files/);
    if (columns === 140) assert.match(type, /off your type scale \(size and line-height\)/);
    assert.doesNotMatch(type.split('Intended?')[0], /provenance\/|existence\/|config gap|type\/framework/);
    const broken = pty(root, ['--broken'], columns, cache);
    bounded(broken, columns);
    assert.match(broken, /\x1b\[31m/); assert.match(broken, /\x1b\[2m/);
    assert.doesNotMatch(strip(broken), /^\s+'var|^\s+['"]\s*}/m);
    const summary = pty(root, [], columns, cache);
    bounded(summary, columns); assert.match(summary, /\x1b\[33m/);
    const fixRows = strip(summary).split('Fix first\n')[1].split('\n').filter(line => line.includes('plumber check'));
    assert.equal(fixRows.length, 4);
    assert.equal(new Set(fixRows.map(line => line.indexOf('plumber check'))).size, 1);
    assert.ok(fixRows.every(line => !line.endsWith('…')), 'commands remain copyable');
    const coverage = strip(summary).split('On your tokens\n')[1].split('\n\n')[0].split('\n');
    assert.equal(new Set(coverage.map(line => line.lastIndexOf('off'))).size, 1);
    const names = bounded(pty(root, ['--file', 'src/{a,b}/**'], columns, cache), columns);
    assert.match(names, /a\/shared\/Panel.tsx:1 · b\/shared\/Panel.tsx:1/);
    const quiet = pty(root, ['--family', 'type'], columns, cache, true);
    bounded(quiet, columns); assert.doesNotMatch(quiet, /\x1b/);
    bounded(pty(root, ['--all'], columns, cache), columns);
  }
  const pipe = spawnSync(process.execPath, [cli, '--root', root, '--family', 'type'], { encoding: 'utf8', env: { ...process.env, COLUMNS: '80', PLUMBER_CACHE_DIR: cache } });
  assert.ifError(pipe.error); assert.doesNotMatch(pipe.stdout, /\x1b/); bounded(pipe.stdout, 100);
  assert.ok(pipe.stdout.split('\n').some(line => [...line].length > 80), 'pipes use fallback 100');
});

test('site read-only human reports fit real 80/140-column PTYs', async t => {
  const cache = await mkdtemp(join(tmpdir(), 'plumber-site-finding-'));
  t.after(() => rm(cache, { recursive: true, force: true }));
  const before = spawnSync('git', ['diff', '--', 'site'], { cwd: repo }).stdout;
  for (const columns of [80, 140]) for (const args of [[], ['--family', 'type'], ['--all']]) {
    const output = bounded(pty(join(repo, 'site'), args, columns, cache), columns);
    assert.match(output, /React Plumber/);
  }
  assert.deepEqual(spawnSync('git', ['diff', '--', 'site'], { cwd: repo }).stdout, before);
});

test('command tables share terminal budgets: decisions, habits, ledger moves and doctor', async t => {
  const root = await reportFixture(t), cache = await mkdtemp(join(tmpdir(), 'plumber-list-'));
  t.after(() => rm(cache, { recursive: true, force: true }));
  const config = join(root, 'plumber.config.ts');
  await writeFile(config, (await readFile(config, 'utf8')).replace('export default {', "export default { habits: ['hover-gate', 'focus-outline'],"));
  await appendFile(join(root, 'src/styles.css'), '\n@theme { --color-extraordinarily-long-token-name-to-exercise-terminal-columns: #123456; }');
  pty(root, ['baseline'], 100, cache, true);
  let previous = 'Page0';
  for (const columns of [80, 140]) {
    const decisions = bounded(pty(root, ['decisions'], columns, cache, true), columns);
    const decisionRows = decisions.split('\n').filter(line => /^(spacing|color|type|radius|motion|elevation|z)\s/.test(line));
    assert.ok(decisionRows.length > 5);
    const locations = decisionRows.map(line => line.lastIndexOf(line.trim().split(/ {2,}/).at(-1)));
    assert.equal(new Set(locations).size, 1);
    const habits = bounded(pty(root, ['habits'], columns, cache, true), columns);
    assert.match(habits, /hover-gate/); assert.match(habits, /focus-outline/);
    const habitRows = habits.split('\n').filter(line => /^\S/.test(line));
    assert.equal(new Set(habitRows.map(line => line.search(/\b(?:warn|error|info)\b/))).size, 1);
    const doctor = bounded(pty(root, ['doctor'], columns, cache, true), columns);
    assert.equal(doctor.trimEnd().split('\n').length, 6);
    assert.ok(doctor.trimEnd().split('\n').every(line => line.indexOf(':') < 15));
    const next = `RenamedPage${columns}`;
    await rename(join(root, `src/pages/${previous}.tsx`), join(root, `src/pages/${next}.tsx`)); previous = next;
    const ledger = bounded(pty(root, ['ledger', '--rebase'], columns, cache, true), columns);
    const moves = ledger.trimEnd().split('\n');
    assert.ok(moves.length > 1); assert.ok(moves.every(line => line.startsWith('Moved')));
    assert.equal(new Set(moves.map(line => line.indexOf('→'))).size, 1);
  }
});
