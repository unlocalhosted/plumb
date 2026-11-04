// When `npx plumber` can't go on, it says what's wrong in one line and the fix in the next, exits non-zero, and has
// started nothing: no page, no server, no files written.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, readdir, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { opener, repo, run, start } from './helpers/bare-cli.mjs';

async function scratch(t) {
  // under the OS temp folder, so no repository above it can change what Git says
  const root = await mkdtemp(join(tmpdir(), 'plumber-gate-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
const git = (cwd, ...args) => { const r = spawnSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, GIT_CEILING_DIRECTORIES: tmpdir() } }); assert.equal(r.status, 0, r.stderr); };
const viteConfig = "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nexport default defineConfig({ plugins: [react()] });\n";
async function viteApp(t) {
  // inside the repo's fixtures folder so tailwindcss resolves from its node_modules; it gets its own repository
  const root = await mkdtemp(join(repo, 'fixtures/.gate-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/onboard-framework'), root, { recursive: true });
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'app', private: true, type: 'module', dependencies: { react: '^19.0.0', tailwindcss: '^4.1.0' }, devDependencies: { vite: '^8.0.0' } }));
  await writeFile(join(root, 'vite.config.ts'), viteConfig);
  return root;
}
const terminal = async (t) => ({ PLUMBER_TERMINAL: '1', PLUMBER_OPENER: (await opener(t)).script });

function gate(result, what, fix) {
  assert.equal(result.code, 2, result.stdout + result.stderr);
  assert.equal(result.stdout, '', 'nothing on stdout: no report, no page');
  const lines = result.stderr.trimEnd().split('\n');
  assert.equal(lines.length, 2, result.stderr);
  assert.match(lines[0], what); assert.match(lines[1], fix);
  assert.doesNotMatch(result.stderr, /Opened your project/);
}

test('no React here: one line for what is wrong, one for the fix', { timeout: 120000 }, async (t) => {
  const root = await scratch(t);
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'api', private: true, dependencies: { express: '^5.0.0' } }));
  await mkdir(join(root, 'src')); await writeFile(join(root, 'src/index.js'), 'export {};\n');
  // on a terminal, and in a pipe: the same gate
  gate(run(['--root', root], await terminal(t)), /^✗ No React here\. Plumber reads React apps\.$/, /^ {2}→ Run it from your app's folder, or pass --root apps\/web\.$/);
  gate(run(['--root', root]), /^✗ No React here/, /--root apps\/web/);
  // with no package.json above the folder at all
  const empty = await scratch(t);
  const bare = spawnSync(process.execPath, [join(repo, 'dist/cli.js')], { cwd: empty, encoding: 'utf8', env: { ...process.env, GIT_CEILING_DIRECTORIES: tmpdir() } });
  gate({ code: bare.status, stdout: bare.stdout, stderr: bare.stderr }, /^✗ No React here/, /--root apps\/web/);
});

test('several apps: the gate lists them and names the command for the first', { timeout: 120000 }, async (t) => {
  const root = await mkdtemp(join(repo, 'fixtures/.gate-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/onboard-monorepo'), root, { recursive: true });
  // from the workspace folder itself (a --root that names a folder with a package.json is the person's choice)
  const result = run([], await terminal(t), undefined, root);
  assert.equal(result.code, 2, result.stderr);
  assert.equal(result.stdout, '');
  const [first, second, ...rest] = result.stderr.trimEnd().split('\n');
  assert.match(first, /^✗ Found \d+ apps: \w+\/\w+(, \w+\/\w+)*\.$/, result.stderr);
  assert.match(second, /^ {2}→ Run npx plumber --root \w+\/\w+ \(or the one you mean\)\.$/);
  assert.equal(rest.length, 0);
  // naming one of them is the way through
  const chosen = run(['--root', join(root, 'apps/web'), '--no-open']);
  assert.equal(chosen.code, 0, chosen.stderr);
  assert.match(chosen.stdout, /^Plumber · \d+ files in/);
});

test('a dev config with changes that are not committed stops a run that would set up, and nothing is written', { timeout: 120000 }, async (t) => {
  const root = await viteApp(t);
  git(root, 'init', '-q'); git(root, 'add', '.'); git(root, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'start');
  await writeFile(join(root, 'vite.config.ts'), viteConfig + '// my change\n');
  const before = await readFile(join(root, 'vite.config.ts'), 'utf8');
  gate(run(['--root', root], await terminal(t)), /^✗ vite\.config\.ts has changes you haven't committed\.$/, /^ {2}→ Commit or stash them, then run npx plumber again\.$/);
  assert.equal(await readFile(join(root, 'vite.config.ts'), 'utf8'), before);
  assert.deepEqual((await readdir(root)).sort(), ['.git', 'package.json', 'src', 'vite.config.ts']);
  // a run that only reads has nothing to protect: it says its three causes as usual
  const reading = run(['--root', root, '--no-open']);
  assert.equal(reading.code, 0, reading.stderr);
  assert.match(reading.stdout, /^Plumber · /);
});

test('a project whose plugin is already in the dev config is never stopped for it', { timeout: 120000 }, async (t) => {
  const root = await viteApp(t);
  await writeFile(join(root, 'vite.config.ts'), "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nimport { plumb } from '@unlocalhosted/react-plumber/vite';\nexport default defineConfig({ plugins: [plumb(), react()] });\n");
  git(root, 'init', '-q'); git(root, 'add', '.'); git(root, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'start');
  await writeFile(join(root, 'vite.config.ts'), (await readFile(join(root, 'vite.config.ts'), 'utf8')) + '// edited\n');
  // the page opens as usual; stop it straight away
  const running = await start(t, ['--root', root], await terminal(t));
  const done = await running.stop();
  assert.equal(done.code, 0, done.stderr);
  assert.doesNotMatch(done.stdout + done.stderr, /haven't committed/);
});
