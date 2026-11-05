// `npx plumber` on a terminal: it reads the app, serves a page about it on localhost, opens it, and waits for Ctrl+C.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { project, check } from './helpers/causes-project.mjs';
import { cli, env, opener, repo, run, start, strip } from './helpers/bare-cli.mjs';

const terminal = (script) => ({ PLUMBER_TERMINAL: '1', PLUMBER_OPENER: script });

test('bare plumber on a terminal prints the short report, opens the page, serves it and its numbers, and says nothing changed', { timeout: 120000 }, async (t) => {
  const root = await project(t);
  const { script, opened } = await opener(t);
  const before = await readFile(join(root, 'src/App.tsx'), 'utf8');
  const running = await start(t, ['--root', root], terminal(script));
  const lines = running.output();
  assert.match(lines, /^Plumber · reading your app…\n {2}✓ .*Tailwind 4 \(theme in src\/styles\.css\)\n {2}✓ \d+ files in \d+\.\ds\n\nOpened your project in the browser: http:\/\/localhost:\d+\nPress Ctrl\+C here when you're done\.\n$/, lines);
  const url = /http:\/\/localhost:\d+/.exec(lines)[0];
  assert.equal(await opened(), url);
  // the page and its numbers, the way the browser asks for them
  const html = await (await fetch(url)).text();
  const token = /'x-plumb-token': "([0-9a-f]{64})"/.exec(html)[1];
  const data = await (await fetch(url + '/__plumb/system', { headers: { 'x-plumb-token': token } })).json();
  assert.deepEqual(data.causes.map(c => c.id), check(root).causes.slice(0, 3).map(c => c.id));
  // every module the page imports is served, or the browser draws nothing
  const seen = new Set(), queue = ['project-page.js'];
  while (queue.length) {
    const name = queue.shift();
    if (seen.has(name)) continue;
    seen.add(name);
    const res = await fetch(`${url}/__plumb/src/${name}`);
    assert.equal(res.status, 200, `${name} isn't served`);
    for (const [, dep] of (await res.text()).matchAll(/from '\.\/([\w-]+\.js)'/g)) queue.push(dep);
  }
  assert.ok(seen.has('gravity.js') && seen.has('specimen.js') && seen.has('cause-list.js') && seen.has('motion.js'), [...seen].join(', '));
  const done = await running.stop();
  assert.equal(done.code, 0, done.stderr);
  assert.match(done.stdout, /Press Ctrl\+C here when you're done\.\n\nNo changes made\.\n$/);
  assert.equal(done.stderr, '');
  assert.equal(await readFile(join(root, 'src/App.tsx'), 'utf8'), before);
  // the server is gone with the command
  await assert.rejects(fetch(url));
});

test('the page takes port 7331, or the next free one when something else has it', { timeout: 120000 }, async (t) => {
  const root = await project(t);
  const { script } = await opener(t);
  const busy = createServer(); t.after(() => busy.close());
  const taken = await new Promise(done => busy.listen(7331, '127.0.0.1', () => done(true)).on('error', () => done(false)));
  const running = await start(t, ['--root', root], terminal(script));
  const port = Number(/localhost:(\d+)/.exec(running.output())[1]);
  assert.ok(taken ? port > 7331 : port === 7331, `port ${port}, 7331 held by the test: ${taken}`);
  await running.stop();
});

test('on a real terminal, with no CI around it, it opens the page; with --no-open or CI it does not', { timeout: 180000 }, async (t) => {
  const root = await project(t);
  const { script, opened } = await opener(t);
  const pty = (args, extra, interrupt) => {
    const result = spawnSync('python3', [join(repo, 'e2e/helpers/cli-pty.py')], { encoding: 'utf8', timeout: 100000,
      input: JSON.stringify({ command: [process.execPath, cli, ...args], cwd: repo, env: env(extra), columns: 100, stdoutTTY: true, timeout: 90, ...(interrupt ? { interruptOnStdout: interrupt } : {}) }) });
    assert.ifError(result.error); assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout); output.stdout = strip(output.stdout); return output;
  };
  const page = pty(['--root', root], { PLUMBER_OPENER: script }, 'Press Ctrl+C');
  assert.match(page.stdout, /Opened your project in the browser: http:\/\/localhost:\d+\n/, page.stdout);
  assert.match(page.stdout, /No changes made\.\n$/);
  assert.match(await opened(), /^http:\/\/localhost:\d+$/);
  // no page for CI: the report as before
  const ci = pty(['--root', root], { PLUMBER_OPENER: script, CI: '1' });
  assert.ok(!ci.stdout.includes('Opened your project'), ci.stdout);
});

test('plumber check and the machine formats are what they were: a report, no page', { timeout: 120000 }, async (t) => {
  const root = await project(t);
  const { script, opened } = await opener(t);
  const extra = terminal(script);
  const checked = run(['check', '--root', root], extra);
  assert.ok([0, 1].includes(checked.code), checked.stderr);
  assert.ok(!checked.stdout.includes('Opened your project'), checked.stdout);
  assert.match(checked.stdout, /Fix first/);
  for (const flag of ['--json', '--agent', '--sarif']) {
    const result = run(['--root', root, flag], extra);
    assert.ok([0, 1].includes(result.code), `${flag}: ${result.stderr}`);
    assert.ok(!result.stdout.includes('Opened your project'), flag);
  }
  assert.equal(JSON.parse(run(['--root', root, '--json'], extra).stdout).schemaVersion, 1);
  assert.equal(await opened(300), null);
});
