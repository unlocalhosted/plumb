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
const normalizeTiming = text => text.replace(/(files [^\n]+  )[\d.]+ms/g, '$1<TIME>ms');

async function fixture(t, delay = 180) {
  const root = await mkdtemp(join(repo, 'fixtures/.cli-progress-'));
  const cache = await mkdtemp(join(tmpdir(), 'plumber-progress-cache-'));
  t.after(async () => { await rm(root, { recursive: true, force: true }); await rm(cache, { recursive: true, force: true }); });
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true });
  await Promise.all(Array.from({ length: 65 }, (_, index) => writeFile(join(root, `src/Extra${index}.tsx`),
    `export const Extra${index} = () => <div className="gap-[13px]"/>;\n`)));
  const config = join(root, 'plumber.config.mjs');
  await rm(join(root, 'plumber.config.ts'));
  await writeFile(config, `await new Promise(resolve => setTimeout(resolve, ${delay}));\nexport default {};\n`);
  const env = { ...process.env, PLUMBER_CACHE_DIR: cache, NO_COLOR: '1', PLUMBER_TEST_PROGRESS_DELAY_MS: '0', PLUMBER_TEST_CACHE_NOTICE_MS: '60000' };
  delete env.CI;
  return { root, cache, config, env };
}

function run(project, args = [], options = {}) {
  const env = { ...project.env, ...options.env };
  const command = [process.execPath, cli, ...args, '--root', project.root];
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

test('real CLI shows ordered phases on stderr, erases them, preserves stdout', async t => {
  const project = await fixture(t);
  const tty = await run(project);
  const output = plain(tty.stderr);
  const phases = ['Reading your project', 'Reading styles: 0 of', 'Compiling Tailwind from src/styles.css', 'Checking ', 'Matching components'];
  let previous = -1;
  for (const phase of phases) {
    const index = output.indexOf(phase);
    assert.ok(index > previous, `missing/out-of-order ${phase}: ${output}`);
    previous = index;
  }
  assert.match(output, /Reading styles: 32 of/);
  assert.equal(finalScreen(tty.stderr), '');
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
  assert.equal(finalScreen(warm.stderr), '');
});

test('short runs never flash; narrow terminals truncate; default text can be dim', async t => {
  const project = await fixture(t, 0);
  await run(project, ['decisions'], { pipe: true });
  const fast = await run(project, ['decisions'], { env: { PLUMBER_TEST_PROGRESS_DELAY_MS: '300' } });
  assert.equal(fast.stderr, '');
  const narrow = await run(project, ['decisions'], { columns: 18, env: { NO_COLOR: undefined } });
  assert.match(narrow.stderr, /\x1b\[2m/);
  for (const line of plain(narrow.stderr).split('\r\x1b[2K').filter(Boolean)) assert.ok([...line].length < 18, line);
  assert.equal(finalScreen(narrow.stderr), '');
});

test('elapsed clock advances during synchronous analysis and Ctrl+C clears the line', async t => {
  const project = await fixture(t);
  await writeFile(project.config, `Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 4150); export default {};\n`);
  const slow = await run(project, ['decisions']);
  assert.match(slow.stderr, /… 3s/);
  assert.match(slow.stderr, /… 4s/);
  assert.equal(finalScreen(slow.stderr), '');
  await writeFile(project.config, `await new Promise(resolve => setTimeout(resolve, 30000)); export default {};\n`);
  const interrupted = await run(project, ['decisions'], { interruptOn: 'Reading your project' });
  assert.equal(interrupted.status, 130);
  assert.equal(interrupted.stdout, '');
  assert.equal(finalScreen(interrupted.stderr), '');
});

test('analysis errors erase progress before the diagnostic; nested init and doctor share the display', async t => {
  const project = await fixture(t);
  await writeFile(project.config, `await new Promise(resolve => setTimeout(resolve, 180)); throw new Error('broken progress fixture');\n`);
  const failed = await run(project, ['decisions']);
  assert.equal(failed.status, 2);
  assert.match(failed.stderr, /Reading your project/);
  assert.match(finalScreen(failed.stderr), /^plumber: .*broken progress fixture/);
  await rm(project.config);
  const initialized = await run(project, ['init']);
  assert.equal(initialized.status, 0, initialized.stderr);
  assert.match(initialized.stdout, /Wrote plumber.config.ts/);
  assert.equal(finalScreen(initialized.stderr), '');
  const doctor = await run(project, ['doctor']);
  assert.match(doctor.stderr, /Checking .*values/);
  assert.equal(finalScreen(doctor.stderr), '');
  assert.match(doctor.stdout, /Cache/);
});
