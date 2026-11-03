// `plumber doctor` is three lines: can it read your code, does it show on your page, does it guard new code. Each is a
// tick, a cross with the one command that fixes it, or a dash. The old detail is `doctor --verbose`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { repo, run } from './helpers/bare-cli.mjs';

const viteConfig = "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nexport default defineConfig({ plugins: [react()] });\n";
const git = (cwd, ...args) => { const r = spawnSync('git', args, { cwd, encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); };
async function app(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.doctor-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/onboard-framework'), root, { recursive: true });
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'app', private: true, type: 'module', dependencies: { react: '^19.0.0', tailwindcss: '^4.1.0' }, devDependencies: { vite: '^8.0.0' } }));
  await writeFile(join(root, 'vite.config.ts'), viteConfig);
  await writeFile(join(root, '.gitignore'), 'node_modules\n.plumber/cache\n');
  git(root, 'init', '-q'); git(root, 'add', '.'); git(root, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'start');
  return root;
}
const rows = (text) => text.trimEnd().split('\n');

test('before setup: reads your code, but Plumber is not on your page: one cross with its one command, and exit 1', { timeout: 120000 }, async (t) => {
  const root = await app(t);
  const result = run(['doctor', '--root', root]);
  assert.equal(result.code, 1, result.stdout + result.stderr);
  assert.equal(result.stderr, '');
  const lines = rows(result.stdout);
  assert.equal(lines.length, 4, result.stdout);
  assert.equal(lines[0], 'Plumber');
  assert.match(lines[1], /^ {2}✓ Reads your code {7}Vite \d+, React \d+, Tailwind 4$/);
  assert.equal(lines[2], "  ✗ Shows on your page    Plumber isn't in vite.config.ts → plumber install --overlay --write");
  assert.equal(lines[3], '  – Guards new code       not set up → plumber install --ci');
  // none of the tool's own words
  assert.doesNotMatch(result.stdout, /\b(capabilit\w+|requirement|locate\.|read\.|ledger|baseline|token)/i);
});

test('after npx plumber --yes the second line is a tick and doctor exits 0; the third waits for install --ci', { timeout: 240000 }, async (t) => {
  const root = await app(t);
  assert.equal(run(['--yes', '--root', root]).code, 0);
  const result = run(['doctor', '--root', root]);
  assert.equal(result.code, 0, result.stdout + result.stderr);
  const lines = rows(result.stdout);
  assert.equal(lines.length, 4);
  assert.match(lines[1], /^ {2}✓ Reads your code/);
  assert.equal(lines[2], '  ✓ Shows on your page    Plumber is in vite.config.ts');
  assert.equal(lines[3], '  – Guards new code       not set up → plumber install --ci');
  // a dash on the optional line never fails doctor; once CI is set up it is a tick
  const ci = run(['install', '--ci', '--root', root]);
  assert.equal(ci.code, 0, ci.stderr + ci.stdout);
  const after = run(['doctor', '--root', root]);
  assert.equal(after.code, 0, after.stdout);
  assert.equal(rows(after.stdout)[3], '  ✓ Guards new code       pull requests are checked');
});

test('doctor --verbose keeps the whole detail; --json is still refused', { timeout: 120000 }, async (t) => {
  const root = await app(t);
  const verbose = run(['doctor', '--verbose', '--root', root]);
  assert.match(verbose.stdout, /^Readiness: /m);
  assert.match(verbose.stdout, /\nDiagnostics\n/);
  assert.match(verbose.stdout, /\[locate\.plugin\]/);
  assert.equal(verbose.code, 1, 'its exit status is what it was: this app has no plugin and no baseline yet');
  const json = run(['doctor', '--json', '--root', root]);
  assert.equal(json.code, 2);
  assert.match(json.stderr, /plumber doctor prints text; remove --json/);
});
