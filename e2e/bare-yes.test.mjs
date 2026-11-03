// `npx plumber --yes`: set up here with no page and no question. Adds Plumber to the dev config, saves today's state,
// never touches the theme, and a second run changes nothing.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { opener, repo, run } from './helpers/bare-cli.mjs';

const viteConfig = "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nexport default defineConfig({ plugins: [react()] });\n";
const git = (cwd, ...args) => { const r = spawnSync('git', args, { cwd, encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); };

// a Vite app that has never seen Plumber, in its own repository with everything committed
async function app(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.yes-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/onboard-framework'), root, { recursive: true });
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'app', private: true, type: 'module', dependencies: { react: '^19.0.0', tailwindcss: '^4.1.0' }, devDependencies: { vite: '^8.0.0' } }));
  await writeFile(join(root, 'vite.config.ts'), viteConfig);
  await writeFile(join(root, '.gitignore'), 'node_modules\n');
  git(root, 'init', '-q'); git(root, 'add', '.'); git(root, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'start');
  return root;
}
// the analysis cache under .plumber is not the person's files
const path_ignored = (dir, name) => dir.endsWith('.plumber') && name === 'cache';
const snapshot = async (root) => {
  const out = {};
  const walk = async (dir) => { for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || path_ignored(dir, entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path); else out[path.slice(root.length)] = await readFile(path, 'utf8');
  } };
  await walk(root); return out;
};

test('--yes adds Plumber to the dev config and saves today\'s state, leaves the theme alone, and opens nothing', { timeout: 180000 }, async (t) => {
  const root = await app(t);
  const { script, opened } = await opener(t);
  const theme = await readFile(join(root, 'src/index.css'), 'utf8');
  const before = await snapshot(root);
  const result = run(['--root', root, '--yes'], { PLUMBER_TERMINAL: '1', PLUMBER_OPENER: script });
  assert.equal(result.code, 0, result.stderr + result.stdout);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /^Plumber · set up\n {2}✓ Added Plumber to vite\.config\.ts\n {2}✓ Saved today's state( \(\d+ places?\))?, so only new problems fail from now on\n {2}Your theme is untouched\.\n\nNext: start your app \(npm run dev\) and press Alt\+B on your page\.\n$/, result.stdout);
  assert.equal(result.stdout.split('\n').filter(line => line.startsWith('Next:')).length, 1);
  // what it wrote
  const config = await readFile(join(root, 'vite.config.ts'), 'utf8');
  assert.match(config, /import \{ plumb \} from '@unlocalhosted\/react-plumber\/vite'/);
  assert.match(config, /plugins: \[plumb\(\), react\(\)\]/);
  assert.match(await readFile(join(root, 'plumber.config.ts'), 'utf8'), /export default/);
  assert.ok((await readFile(join(root, '.plumber/ledger.jsonl'), 'utf8')).length > 0);
  // what it did not: the theme, the source, a page
  assert.equal(await readFile(join(root, 'src/index.css'), 'utf8'), theme);
  const after = await snapshot(root);
  for (const path of Object.keys(before)) if (!['/vite.config.ts'].includes(path)) assert.equal(after[path], before[path], path);
  assert.deepEqual(Object.keys(after).filter(path => !(path in before)).sort(), ['/.plumber/ledger.jsonl', '/plumber.config.ts'].sort());
  assert.equal(await opened(300), null);
});

test('--yes again changes nothing and says so; the plain version then has nothing new', { timeout: 240000 }, async (t) => {
  const root = await app(t);
  assert.equal(run(['--root', root, '--yes']).code, 0);
  const done = await snapshot(root);
  const again = run(['--root', root, '--yes']);
  assert.equal(again.code, 0, again.stderr);
  assert.equal(again.stdout, 'Plumber is already set up here.\n\nNext: press Alt+B on your page to fix it there.\n');
  assert.deepEqual(await snapshot(root), done);
  const plain = run(['--root', root, '--no-open']);
  assert.match(plain.stdout, /^ {2}Nothing new since you set up\./m, plain.stdout);
});

test('--yes stops at the same gates: a dev config with uncommitted changes, and a folder with no React', { timeout: 120000 }, async (t) => {
  const root = await app(t);
  await writeFile(join(root, 'vite.config.ts'), viteConfig + '// mine\n');
  const before = await snapshot(root);
  const dirty = run(['--root', root, '--yes']);
  assert.equal(dirty.code, 2);
  assert.equal(dirty.stderr, "✗ vite.config.ts has changes you haven't committed.\n  → Commit or stash them, then run npx plumber again.\n");
  assert.deepEqual(await snapshot(root), before, 'a stopped run writes nothing');
  const bare = await mkdtemp(join(tmpdir(), 'plumber-yes-')); // outside the repo, so no react resolves from above
  t.after(() => rm(bare, { recursive: true, force: true }));
  await writeFile(join(bare, 'package.json'), JSON.stringify({ name: 'api', private: true }));
  const noReact = run(['--root', bare, '--yes']);
  assert.equal(noReact.code, 2);
  assert.match(noReact.stderr, /^✗ No React here\./);
});

test('--yes on a host Plumber cannot edit says so and writes nothing', { timeout: 120000 }, async (t) => {
  const root = await app(t);
  await writeFile(join(root, 'vite.config.ts'), "import { defineConfig } from 'vite';\nexport default defineConfig(() => ({ plugins: [] }));\n");
  git(root, 'add', '.'); git(root, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'composed');
  const before = await snapshot(root);
  const result = run(['--root', root, '--yes']);
  assert.equal(result.code, 2, result.stdout);
  assert.match(result.stderr, /^✗ /);
  assert.deepEqual(await snapshot(root), before);
});
