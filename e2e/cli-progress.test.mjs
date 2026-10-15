import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../', import.meta.url));
const cli = join(repo, 'dist/cli.js');
const helper = join(repo, 'e2e/helpers/cli-pty.py');
const plain = text => text.replace(/\x1b\[[\d;]*m/g, '');
const finalScreen = text => {
  let line = [], cursor = 0, screen = '';
  for (const token of plain(text).match(/\x1b\[2K|\r|\n|[^\x1b\r\n]+/g) ?? []) {
    if (token === '\x1b[2K') line = [];
    else if (token === '\r') cursor = 0;
    else if (token === '\n') { screen += line.join('') + '\n'; line = []; cursor = 0; }
    else for (const character of token) line[cursor++] = character;
  }
  return screen + line.join('');
};
const normalizeTiming = text => text.replace(/(files [^\n]+  )[\d.]+ms/g, '$1<TIME>ms').replace(/ · \d+\.\ds\n/, ' · <TIME>s\n');
const frames = stderr => plain(stderr).split('\r\x1b[2K').filter(line => /^(?:[━─#-]+) +\d+%/.test(line));
function assertBar(result, columns = 120) {
  const lines = frames(result.stderr);
  assert.ok(lines.length >= 2, result.stderr);
  const percentages = lines.map(line => Number(/ +(\d+)%/.exec(line)[1]));
  assert.deepEqual(percentages, [...percentages].sort((a, b) => a - b));
  assert.equal(percentages.at(-1), 100);
  assert.equal(percentages.filter(value => value === 100).length, 1);
  const counts = new Map();
  for (const line of lines) {
    assert.ok([...line].length < columns, line);
    const bar = /^[━─#-]+/.exec(line)[0];
    if (columns >= 80) assert.ok(bar.length >= 24 && bar.length <= 36, line);
    const counted = /% +([^:\r\n]+): ([\d,]+)(?= of [\d,]+ | modules?\b)/.exec(line);
    if (counted) {
      const [, label, current] = counted;
      const value = Number(current.replaceAll(',', ''));
      assert.ok(value >= (counts.get(label) ?? 0), `${label} count decreased: ${line}`);
      counts.set(label, value);
    }
  }
  assert.equal(finalScreen(result.stderr), '');
  return lines;
}

async function fixture(t, delay = 180, rows = 1) {
  const root = await mkdtemp(join(repo, 'fixtures/.cli-progress-'));
  const cache = await mkdtemp(join(tmpdir(), 'plumber-progress-cache-'));
  t.after(async () => { await rm(root, { recursive: true, force: true }); await rm(cache, { recursive: true, force: true }); });
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true });
  await Promise.all(Array.from({ length: 65 }, (_, index) => writeFile(join(root, `src/Extra${index}.tsx`),
    `export const Extra${index} = () => <>${'<div className="gap-[13px]"/>'.repeat(rows)}</>;\n`)));
  const config = join(root, 'plumber.config.mjs');
  await rm(join(root, 'plumber.config.ts'));
  await writeFile(config, `await new Promise(resolve => setTimeout(resolve, ${delay}));\nexport default {};\n`);
  const env = { ...process.env, PLUMBER_CACHE_DIR: cache, NO_COLOR: '1', PLUMBER_TEST_PROGRESS_DELAY_MS: '0', PLUMBER_TEST_CACHE_NOTICE_MS: '60000' };
  delete env.CI;
  return { root, cache, config, env };
}

function run(project, args = [], options = {}) {
  const env = { ...project.env, ...options.env };
  const command = [process.execPath, ...(options.preload ? ['--import', options.preload] : []), cli, ...args, '--root', project.root];
  return new Promise((resolve, reject) => {
    const child = options.pipe ? spawn(command[0], command.slice(1), { cwd: repo, env }) : spawn('python3', [helper], { cwd: repo });
    let stdout = '', stderr = '';
    child.stdout.on('data', data => { stdout += data; });
    child.stderr.on('data', data => { stderr += data; });
    child.on('error', reject);
    child.on('close', status => {
      if (options.pipe) resolve({ stdout, stderr, status });
      else if (status) reject(new Error(stderr));
      else { try { resolve(JSON.parse(stdout)); } catch (error) { reject(error); } }
    });
    child.stdin.end(options.pipe ? '' : JSON.stringify({ command, cwd: repo, env, columns: options.columns ?? 120, interruptOn: options.interruptOn }));
  });
}

test('real CLI bar advances monotonically, fits 80 columns, erases, preserves stdout', async t => {
  const project = await fixture(t, 180, 256);
  // Presets can inspect components while config loads, before the actual step.
  await writeFile(project.config, `
import { discoverComponents } from ${JSON.stringify(new URL('../dist/ownership/components.js', import.meta.url).href)};
import { onProgress } from ${JSON.stringify(new URL('../dist/profile.js', import.meta.url).href)};
// Keep both real file passes visible even on fast machines.
onProgress(event => {
  if (['phase:parse', 'phase:collect'].includes(event.phase) && event.current !== undefined)
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 90);
});
await new Promise(resolve => setTimeout(resolve, 180));
discoverComponents(${JSON.stringify(project.root)}, [${JSON.stringify(join(project.root, 'src/Extra0.tsx'))}], {}, new Map(), false, new Map(), true);
export default {};
`);
  const tty = await run(project, [], { columns: 80 });
  const lines = assertBar(tty, 80);
  const output = plain(tty.stderr);
  // Rendering samples current work at ~14 Hz, so short phases can be coalesced.
  const phases = ['Reading your project', 'Reading styles:', 'Tracing computed classes', 'Compiling Tailwind',
    'Tracing stylesheet imports', 'Following stylesheet imports', 'Reading stylesheets', 'Checking tokens:',
    'Matching components', 'Checking component styles', 'Checking ledger', 'Done'];
  let previous = -1;
  for (const phase of phases) {
    const index = output.indexOf(phase);
    if (index === -1) continue;
    assert.ok(index > previous, `out-of-order ${phase}: ${output}`);
    previous = index;
  }
  assert.match(output, /Reading styles: \d+ of/);
  const sourceFrame = lines.find(line => /Reading styles:/.test(line));
  assert.ok(Number(/ +(\d+)%/.exec(sourceFrame)[1]) <= 22, sourceFrame);
  assert.ok(lines.some(line => /\b(?:[1-9]|[1-8]\d|9[0-9])%/.test(line)), output);
  assert.match(lines[0], /^-{24} +0%/);
  assert.match(lines.at(-1), /^#{24} +100% +Done$/);
  assert.doesNotMatch(tty.stderr, /\x1b\[2m/);
  const piped = await run(project, [], { pipe: true });
  assert.equal(piped.stderr, '');
  assert.equal(tty.status, piped.status);
  assert.equal(normalizeTiming(tty.stdout), normalizeTiming(piped.stdout));
  // This report has no timing fields: byte-for-byte stdout equality too.
  const decisions = await run(project, ['decisions']);
  const pipedDecisions = await run(project, ['decisions'], { pipe: true });
  assert.equal(decisions.stdout, pipedDecisions.stdout);
});

test('machine/CI/piped runs add no stderr bytes', async t => {
  const project = await fixture(t);
  for (const args of [['--json'], ['--agent'], ['--sarif']]) {
    const tty = await run(project, args);
    const piped = await run(project, args, { pipe: true });
    assert.equal(tty.stderr, piped.stderr);
    assert.equal(tty.stderr, '');
    if (args[0] === '--json') assert.equal(JSON.parse(tty.stdout).schemaVersion, 1);
  }
  for (const CI of ['1', '']) assert.equal((await run(project, [], { env: { CI } })).stderr, '');
  assert.equal((await run(project, [], { pipe: true })).stderr, '');
});

test('cold result cache reports validation and serialization before completion', async t => {
  const project = await fixture(t, 0);
  await writeFile(project.config, "export default { css: 'src/styles.css' };\n");
  const preload = join(project.root, 'observe-progress.mjs');
  await writeFile(preload, `
import { onProgress } from ${JSON.stringify(new URL('../dist/profile.js', import.meta.url).href)};
onProgress(event => {
  // Sample real work boundaries without relying on a slow disk or large report.
  if (event.phase.startsWith('phase:cache-') && event.current === undefined ||
      event.phase === 'phase:cache-stamps' && event.current !== undefined ||
      ['phase:parse', 'phase:collect'].includes(event.phase) && event.current !== undefined)
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 90);
});
`);
  const args = ['--config', project.config];
  const cold = await run(project, args, { preload });
  const lines = assertBar(cold);
  assert.match(plain(cold.stderr), /Tracing computed classes: \d+ of \d+ files/);
  const labels = ['Checking project files for cache', 'Validating source cache', 'Validating component cache',
    'Validating module cache', 'Validating cache inputs:', 'Saving analysis cache', 'Saving report cache',
    'Writing report cache', 'Finishing cache', 'Done'];
  let previous = -1;
  for (const label of labels) {
    const index = lines.findIndex(line => line.includes(label));
    assert.ok(index > previous, `missing or out-of-order ${label}: ${cold.stderr}`);
    previous = index;
  }
  assert.ok(lines.filter(line => /(?:Validating|Saving|Writing)/.test(line)).every(line => Number(/ +(\d+)%/.exec(line)[1]) < 99));
  const warm = await run(project, args, { preload });
  assertBar(warm);
  assert.doesNotMatch(warm.stderr, /Tracing computed classes|Validating|Saving|Writing/);
  assert.equal(cold.status, warm.status);
  assert.equal(normalizeTiming(cold.stdout), normalizeTiming(warm.stdout));
});

test('cold-cache notice appears once, uses the actual override, stays after clearing', async t => {
  const project = await fixture(t);
  const options = { env: { PLUMBER_TEST_CACHE_NOTICE_MS: '20' } };
  const cold = await run(project, ['decisions'], options);
  const lines = finalScreen(cold.stderr).trim().split('\n');
  assert.equal(lines.length, 1);
  assert.match(lines[0], /^First run builds a cache in .*plumber-progress-cache-.*; later runs are faster\.$/);
  assert.equal((cold.stderr.match(/First run builds a cache/g) ?? []).length, 1);
  const warm = await run(project, ['decisions'], options);
  assert.doesNotMatch(warm.stderr, /First run builds a cache/);
  assertBar(warm);
  // A whole-report cache hit skips all inner phases and still completes.
  const check = await run(project);
  assertBar(check);
  const cached = await run(project);
  assertBar(cached);
  assert.doesNotMatch(cached.stderr, /Reading styles:|Matching components|Checking tokens:/);
});

test('short runs never flash; terminal width, Unicode and locale fallbacks hold', async t => {
  const project = await fixture(t, 0);
  await run(project, ['decisions'], { pipe: true });
  const fast = await run(project, ['decisions'], { env: { PLUMBER_TEST_PROGRESS_DELAY_MS: '300' } });
  assert.equal(fast.stderr, '');
  const narrow = await run(project, ['decisions'], { columns: 18, env: { NO_COLOR: undefined } });
  assert.match(narrow.stderr, /\x1b\[2m/);
  for (const line of plain(narrow.stderr).split('\r\x1b[2K').filter(Boolean)) assert.ok([...line].length < 18, line);
  assert.equal(finalScreen(narrow.stderr), '');
  const unicode = await run(project, ['decisions'], { columns: 120, env: { NO_COLOR: undefined, LC_ALL: 'en_US.UTF-8' } });
  assertBar(unicode);
  assert.match(unicode.stderr, /━{36} +100%/);
  assert.match(unicode.stderr, /\x1b\[2m/);
  for (const env of [{ NO_COLOR: '1', LC_ALL: 'en_US.UTF-8' }, { NO_COLOR: undefined, LC_ALL: 'C' },
    { NO_COLOR: undefined, LC_ALL: '', LC_CTYPE: 'C', LANG: 'en_US.UTF-8' }]) {
    const ascii = await run(project, ['decisions'], { columns: 80, env });
    assertBar(ascii, 80);
    assert.doesNotMatch(ascii.stderr, /[━─]/);
    assert.match(ascii.stderr, /#{24} +100%/);
  }
});

test('elapsed clock advances during synchronous analysis and Ctrl+C clears the line', async t => {
  const project = await fixture(t);
  await writeFile(project.config, `Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 4150); export default {};\n`);
  const slow = await run(project, ['decisions']);
  assert.match(slow.stderr, /\| 3s/);
  assert.match(slow.stderr, /\| 4s/);
  assertBar(slow);
  assert.equal(finalScreen(slow.stderr), '');
  await writeFile(project.config, `await new Promise(resolve => setTimeout(resolve, 30000)); export default {};\n`);
  const interrupted = await run(project, ['decisions'], { interruptOn: 'Reading your project' });
  assert.equal(interrupted.status, 130);
  assert.equal(interrupted.stdout, '');
  assert.equal(finalScreen(interrupted.stderr), '');
  assert.doesNotMatch(interrupted.stderr, /100%/);
});

test('analysis errors erase progress before the diagnostic; nested init and doctor share the display', async t => {
  const project = await fixture(t);
  await writeFile(project.config, `await new Promise(resolve => setTimeout(resolve, 180)); throw new Error('broken progress fixture');\n`);
  const failed = await run(project, ['decisions']);
  assert.equal(failed.status, 2);
  assert.match(failed.stderr, /Reading your project/);
  assert.match(finalScreen(failed.stderr), /^✗ .*broken progress fixture/);
  assert.doesNotMatch(failed.stderr, /100%/);
  await rm(project.config);
  const initialized = await run(project, ['init']);
  assert.equal(initialized.status, 0, initialized.stderr);
  assert.match(initialized.stdout, /Wrote plumber.config.ts/);
  assertBar(initialized);
  const doctor = await run(project, ['doctor']);
  assertBar(doctor);
  assert.match(doctor.stdout, /Cache/);
});
