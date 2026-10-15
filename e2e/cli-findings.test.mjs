import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
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
