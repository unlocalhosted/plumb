import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const cli = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
async function fixture(t, files = {}) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'plumber-cli-setup-')));
  const cache = await mkdtemp(join(tmpdir(), 'plumber-cli-cache-'));
  t.after(() => Promise.all([root, cache].map(path => rm(path, { recursive: true, force: true }))));
  await put(root, files);
  return { root, cache };
}
async function put(root, files) {
  for (const [path, text] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), typeof text === 'string' ? text : JSON.stringify(text));
  }
}
async function snapshot(root) {
  const result = {};
  for (const item of (await readdir(root, { recursive: true, withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(item.parentPath, item.name);
    result[path] = item.isFile() ? (await readFile(path)).toString('base64') : '<folder>';
  }
  return result;
}
async function run(project, args, stderr, status = 2, cwd = project.root) {
  const before = await snapshot(project.root);
  const result = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8', timeout: 20000,
    env: { ...process.env, NO_COLOR: '1', PLUMBER_CACHE_DIR: project.cache } });
  assert.ifError(result.error);
  assert.equal(result.status, status, result.stderr || result.stdout);
  assert.equal(result.stderr, stderr);
  if (status === 2) {
    assert.equal(result.stdout, '');
    assert.deepEqual(await snapshot(project.cache), {}, 'setup errors write no caches');
  }
  assert.deepEqual(await snapshot(project.root), before, 'no project files or folders written');
  return result;
}
const app = { 'package.json': { name: 'site', type: 'module' }, 'src/App.jsx': 'export const App = () => <div />;' };
const workspaceRow = (path, description) => `  ${`npx plumber --root ${path}`.padEnd(64)}  ${description}\n`;

test('setup: no project here (also stops at home)', async t => {
  const project = await fixture(t);
  await run(project, [], '✗ No project here. React Plumber reads a React app: a folder with package.json.\n  → cd into your app, or: npx plumber --root path/to/app\n');
  // A synthetic HOME is only a discovery boundary; parent package must not leak in.
  await put(project.root, { 'package.json': {} });
  const home = join(project.root, 'home'); await mkdir(home);
  const result = spawnSync(process.execPath, [cli], { cwd: home, encoding: 'utf8', env: { ...process.env, HOME: home, USERPROFILE: home } });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /^✗ No project here\./);
});

test('setup: subfolder and explicit subfolder use nearest project, with same report', async t => {
  const project = await fixture(t, app);
  await mkdir(join(project.root, 'src/hero'), { recursive: true });
  const root = await run(project, ['--json'], '', 0);
  for (const [args, cwd] of [[['--json'], join(project.root, 'src/hero')], [['--json', '--root', 'src/hero'], project.root]]) {
    const child = await run(project, args, `Using the project at ../.. (${project.root.split('/').at(-1)}, package.json).\n`, 0, cwd);
    const stable = text => {
      const { timing, moduleGraph: { cacheHits, cacheMisses, parseMs, totalMs, ...moduleGraph }, ...report } = JSON.parse(text);
      return { ...report, moduleGraph };
    };
    assert.deepEqual(stable(child.stdout), stable(root.stdout));
  }
});

test('setup: workspace lists Next, Vite and library with commands; chosen app runs', async t => {
  const project = await fixture(t, {
    'package.json': { workspaces: ['apps/*', 'packages/*'] },
    'apps/web/package.json': { dependencies: { next: '*', react: '*', tailwindcss: '^4' } },
    'apps/docs/package.json': { dependencies: { vite: '*', react: '*', tailwindcss: '^4' } },
    'packages/ui/package.json': { peerDependencies: { react: '*', tailwindcss: '^4' } },
  });
  await run(project, [], 'This is a workspace with 3 apps. Pick one:\n' + workspaceRow('apps/docs', 'Vite · Tailwind 4') + workspaceRow('apps/web', 'Next.js · Tailwind 4') + workspaceRow('packages/ui', 'library · Tailwind 4'));
  for (const columns of [80, 140]) {
    const result = spawnSync('python3', [fileURLToPath(new URL('./helpers/cli-pty.py', import.meta.url))], {
      encoding: 'utf8', input: JSON.stringify({ command: [process.execPath, cli], cwd: project.root, columns,
        env: { ...process.env, NO_COLOR: '1', PLUMBER_CACHE_DIR: project.cache } }),
    });
    assert.ifError(result.error); assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.status, 2);
    const rows = output.stderr.replaceAll('\r', '').trimEnd().split('\n').slice(1);
    assert.ok(rows.every(line => [...line].length <= columns));
    const offsets = rows.map(line => line.search(/(?:Vite|Next.js|library) ·/));
    assert.ok(offsets[0] > 0); assert.equal(new Set(offsets).size, 1);
  }
  await put(project.root, { 'apps/docs/package.json': { dependencies: { vite: '*', react: '*' } }, 'apps/docs/src/App.jsx': 'export const App = () => <div/>;' });
  await run(project, ['--root', 'apps/docs', '--json'], '', 0);
  for (const workspace of ['pnpm', 'implicit']) {
    const other = await fixture(t, {
      'package.json': {}, ...(workspace === 'pnpm' ? { 'pnpm-workspace.yaml': "packages:\n  - 'apps/*'\n  - 'packages/*'\n" } : {}),
      'apps/web/package.json': { dependencies: { next: '*', react: '*' } },
      'packages/ui/package.json': { peerDependencies: { react: '*' } },
    });
    await run(other, [], 'This is a workspace with 2 apps. Pick one:\n' + workspaceRow('apps/web', 'Next.js · no Tailwind') + workspaceRow('packages/ui', 'library · no Tailwind'));
  }
});

test('setup: a pnpm-workspace.yaml without packages is settings, so the folder is one project', async t => {
  const settings = "allowBuilds:\n  esbuild: set this to true or false\n  workerd: set this to true or false\nminimumReleaseAgeExclude:\n  - '@unlocalhosted/react-plumber@0.2.0'\n";
  const project = await fixture(t, { ...app, 'package.json': { name: 'site', type: 'module', dependencies: { react: '*', vite: '*' } }, 'pnpm-workspace.yaml': settings });
  for (const args of [['--json'], ['--json', '--root', '.']]) {
    const result = await run(project, args, '', 0);
    assert.ok(JSON.parse(result.stdout));
  }
});

test('setup: no source names configured globs, and never reports success', async t => {
  const project = await fixture(t, { 'package.json': { type: 'module' }, 'plumber.config.mjs': "export default { source: ['src/**'] };" });
  await run(project, [], "✗ Found no .tsx, .jsx or .css files under src/. Is this the right folder?\n  Looked in: src/** (from plumber.config.mjs `source`)\n  → change `source`, or run in your app's folder\n");
  for (const args of [['--agent'], ['--json'], ['init'], ['baseline']]) {
    await run(project, args, "✗ Found no .tsx, .jsx or .css files under src/. Is this the right folder?\n  Looked in: src/** (from plumber.config.mjs `source`)\n  → change `source`, or run in your app's folder\n");
  }
});

test('setup: declared Tailwind missing, install uses each lockfile', async t => {
  for (const [lock, manager] of [['package-lock.json', 'npm'], ['pnpm-lock.yaml', 'pnpm'], ['yarn.lock', 'yarn'], ['bun.lock', 'bun'], ['bun.lockb', 'bun']]) {
    const project = await fixture(t, { ...app, 'package.json': { dependencies: { tailwindcss: '^4.1' } }, [lock]: '' });
    for (const args of [[], ['--json'], ['--agent']]) await run(project, args, `✗ Tailwind 4 is in package.json but not installed.\n  → ${manager} install\n`);
    assert.deepEqual(await snapshot(project.cache), {}, 'setup failure writes no caches');
  }
});

test('setup: Tailwind 3 upgrade message includes version and guide', async t => {
  const project = await fixture(t, { ...app, 'src/styles.css': '@tailwind base;', 'package.json': { dependencies: { tailwindcss: '^3.4' } },
    'node_modules/tailwindcss/package.json': { name: 'tailwindcss', version: '3.4.17' } });
  await run(project, [], '✗ React Plumber needs Tailwind 4; this project has 3.4.17.\n  → upgrade: npx @tailwindcss/upgrade   (https://tailwindcss.com/docs/upgrade-guide)\n');
});

test('setup: Tailwind-looking classes advise once; plain CSS still checks broken variables', async t => {
  const classes = ['p-[13px]', 'flex', 'gap-4', ...Array.from({ length: 41 }, (_, i) => `mt-${i + 1}`)];
  const project = await fixture(t, { ...app, 'package.json': { dependencies: { react: '*' } },
    'src/App.jsx': `import './styles.css'; export const App = () => <div className="${classes.join(' ')}"/>;`,
    'src/styles.css': '.card { color: var(--missing); }' });
  const advisory = '! These classes look like Tailwind, but Tailwind isn\'t set up: p-[13px], flex, gap-4 (+41 more).\n  → npm install tailwindcss @tailwindcss/vite, then @import "tailwindcss"; in your CSS entry\n  Checking plain CSS only for now.\n';
  for (const args of [[], ['--broken'], ['--json'], ['--agent']]) {
    const result = await run(project, args, advisory, 0);
    assert.doesNotMatch(result.stdout, /does nothing|Tailwind never generates/);
    if (args.includes('--json')) assert.ok(JSON.parse(result.stdout).findings.some(f => f.rule === 'existence/dead-var'));
    else if (args.includes('--agent') || args.includes('--broken')) assert.match(result.stdout, /--missing/);
    else assert.match(result.stdout, /1 broken style\s+browser drops them\s+plumber check --broken/);
  }
});

test('setup: command and flag suggestions, no distant guesses, clean invalid roots', async t => {
  const project = await fixture(t, app);
  await run(project, ['chek'], '✗ Unknown command chek. Did you mean check?\n');
  await run(project, ['check', '--jsno'], '✗ Unknown option --jsno. Did you mean --json?\n');
  await run(project, ['check', '--unrelated'], '✗ Unknown option --unrelated.\n  → plumber --help\n');
  await run(project, ['unrelated'], '✗ Unknown command unrelated.\n  → plumber --help\n');
  await run(project, ['check', '--root', 'does-not-exist'], `✗ --root does-not-exist: no such folder (from ${project.root}).\n`);
  await run(project, ['check', '--root', 'package.json'], `✗ --root package.json: not a folder (from ${project.root}).\n`);
  await run(project, ['--root'], '✗ Option --root needs a value.\n  → plumber --help\n');
  await run(project, ['-j'], '✗ Unknown option -j.\n  → plumber --help\n');
});

test('setup: malformed config, missing files and invalid install options have clean boundaries', async t => {
  const project = await fixture(t, app);
  await run(project, ['--config', 'missing.mjs'], `✗ Fix or create config ${project.root}/missing.mjs: Could not load '${project.root}/missing.mjs'\n  → \${EDITOR:-vi} "${project.root}/missing.mjs"\n`);
  await run(project, ['install', '--agent', 'unknown'], '✗ Unknown agent "unknown"; choose claude, cursor, codex, copilot, gemini, windsurf, generic.\n  → plumber install --list\n');
  await put(project.root, { 'plumber.config.mjs': 'export default { css: "missing.css" };' });
  await run(project, [], `✗ Set css to a readable .css file in plumber.config.ts: ${project.root}/missing.css.\n  no such file or folder.\n  → \${EDITOR:-vi} plumber.config.ts\n`);
  await put(project.root, { 'package.json': '{ broken json' });
  await run(project, [], `✗ Could not read package.json at ${project.root}.\n  The file is not valid JSON.\n  → plumber doctor --root "${project.root}"\n`);
});
