// Project detection (docs/briefs/project-detection-design.md section 5): a matrix of real-looking layouts, each judged
// through the real CLI. Nested checkouts are built with real `git worktree add` / `git submodule add`.
import assert from 'node:assert/strict';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

import { checkFacts, fixture, git, installTailwind, json, put, run, sameFacts, viteApp, viteReadiness } from './helpers/layouts.mjs';

test('nested-worktrees: agent worktrees under .claude/worktrees are other checkouts; state sees one Tailwind entry', { timeout: 120000 }, async t => {
  const project = await fixture(t, viteApp());
  await installTailwind(project.root);
  await put(project.root, { '.gitignore': 'node_modules\n' });
  git(project.root, 'init', '-q'); git(project.root, 'add', '-A'); git(project.root, 'commit', '-q', '-m', 'app');
  for (const name of ['agent-a', 'agent-b']) git(project.root, 'worktree', 'add', '-q', join('.claude/worktrees', name), '-b', name);
  for (const name of ['agent-a', 'agent-b']) assert.match(await readFile(join(project.root, '.claude/worktrees', name, '.git'), 'utf8'), /^gitdir: /, 'a real worktree has a .git file');
  const state = json(await run(project, ['state', '--json']));
  assert.equal(state.numbers.entries, 1, 'one Tailwind entry, not three');
  assert.ok(!state.flags.includes('split'), state.flags);
  assert.equal(state.numbers.files.css, 1);
  // Run inside a worktree: its own .git file fences it; the parent is never consulted.
  const inside = json(await run(project, ['state', '--json', '--root', '.claude/worktrees/agent-a']));
  assert.equal(inside.numbers.entries, 1);
  assert.equal(inside.numbers.files.css, 1);
});

test('submodule-app: a real git submodule is excluded at the root and is its own project inside', { timeout: 120000 }, async t => {
  const ui = await fixture(t, { 'package.json': { name: 'ui', dependencies: { react: '*', tailwindcss: '^4' } }, 'src/index.css': '@import "tailwindcss";\n', 'src/Button.jsx': 'export const Button = () => <button className="p-4" />;\n' });
  git(ui.root, 'init', '-q'); git(ui.root, 'add', '-A'); git(ui.root, 'commit', '-q', '-m', 'ui');
  const project = await fixture(t, viteApp());
  await installTailwind(project.root);
  await put(project.root, { '.gitignore': 'node_modules\n' });
  git(project.root, 'init', '-q'); git(project.root, 'add', '-A'); git(project.root, 'commit', '-q', '-m', 'app');
  git(project.root, '-c', 'protocol.file.allow=always', 'submodule', 'add', '-q', ui.root, 'vendor/ui');
  assert.match(await readFile(join(project.root, 'vendor/ui/.git'), 'utf8'), /^gitdir: .*\.git\/modules\/vendor\/ui/);
  const state = json(await run(project, ['state', '--json']));
  assert.equal(state.numbers.entries, 1);
  assert.equal(state.numbers.files.css, 1, 'vendor/ui/src/index.css is not this project’s');
  assert.equal(state.numbers.files.source, 1);
  const inside = json(await run(project, ['state', '--json', '--root', 'vendor/ui']));
  assert.equal(inside.numbers.files.source, 1);
});

test('vendored-clone: a cloned repo under tmp/ with its own .git directory is excluded', { timeout: 60000 }, async t => {
  const project = await fixture(t, viteApp({
    'tmp/other/package.json': { name: 'other', dependencies: { react: '*' } },
    'tmp/other/src/index.css': '@import "tailwindcss";\n',
    'tmp/other/src/App.jsx': 'export const App = () => <div />;\n',
  }));
  await installTailwind(project.root);
  git(join(project.root, 'tmp/other'), 'init', '-q');
  const state = json(await run(project, ['state', '--json']));
  assert.equal(state.numbers.entries, 1);
  assert.ok(!state.flags.includes('split'));
  assert.equal(state.numbers.files.css, 1);
  // Still a plain nested folder when there is no .git: both entries count, as before.
  await rm(join(project.root, 'tmp/other/.git'), { recursive: true, force: true });
  const plain = json(await run(project, ['state', '--json']));
  assert.equal(plain.numbers.entries, 2, 'without .git the folder is part of the tree and both entries count');
  assert.ok(plain.flags.includes('split'));
});

test('workspace-pnpm-empty: a declared workspace with no React app under its patterns is a notice with the evidence, never "0 apps"', async t => {
  const project = await fixture(t, { 'package.json': {}, 'pnpm-workspace.yaml': "packages:\n  - 'apps/*'\n", 'packages/ui/package.json': { dependencies: { react: '*' } } });
  const result = await run(project, [], 2);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '✗ Workspace (pnpm, apps/*) with no React app under those patterns: pnpm-workspace.yaml:1, packages: apps/*.\n  → run in an app: npx plumber --root path/to/app\n');
  assert.doesNotMatch(result.stderr, /0 apps/);
});

test('workspace-pnpm-unparsable: an unreadable packages: key is unknown; the folder runs as one project with one notice', async t => {
  const project = await fixture(t, viteApp({ 'pnpm-workspace.yaml': 'packages: {oops\n' }));
  await installTailwind(project.root);
  const result = await run(project, ['--json'], 0);
  assert.ok(json(result));
  assert.equal(result.stderr, 'Could not read pnpm-workspace.yaml:1 (could not parse packages: {oops); checking this folder as one project.\n');
});

test('override-wins: --root at a declared workspace root runs there instead of refusing', async t => {
  const project = await fixture(t, viteApp({ 'package.json': { name: 'root', workspaces: ['apps/*'], dependencies: { react: '*', vite: '*', tailwindcss: '^4' } }, 'apps/web/package.json': { dependencies: { react: '*' } }, 'apps/web/src/App.jsx': 'export const App = () => <div />;\n' }));
  await installTailwind(project.root);
  const refused = await run(project, [], 2);
  assert.match(refused.stderr, /^This is a workspace with 1 app\. Pick one:/);
  for (const root of ['.', project.root]) {
    const result = await run(project, ['--json', '--root', root], 0);
    assert.equal(result.stderr, '');
    assert.ok(json(result));
  }
  // --root into a subfolder without package.json still walks up and is not an override.
  await mkdir(join(project.root, 'src/deep'), { recursive: true });
  const walked = await run(project, ['--root', 'src/deep'], 2);
  assert.match(walked.stderr, /This is a workspace/);
});

test('lockfile-vs-packageManager: the declared manager wins the install hint; the lockfile is a kept conflict', async t => {
  const project = await fixture(t, { 'package.json': { packageManager: 'yarn@4.5.0', dependencies: { react: '*', tailwindcss: '^4' } }, 'pnpm-lock.yaml': '', 'src/App.jsx': 'export const App = () => <div />;\n' });
  const result = await run(project, [], 2);
  assert.equal(result.stderr, '✗ Tailwind 4 is in package.json but not installed.\n  → yarn install\n');
});

test('checkout-as-app: a submodule under apps/ is listed as an app and runs with its own boundary', { timeout: 120000 }, async t => {
  const vendored = await fixture(t, viteApp());
  git(vendored.root, 'init', '-q'); git(vendored.root, 'add', '-A'); git(vendored.root, 'commit', '-q', '-m', 'vendored');
  const project = await fixture(t, { 'package.json': { workspaces: ['apps/*'] }, 'apps/web/package.json': { dependencies: { react: '*', next: '*' } }, '.gitignore': 'node_modules\n' });
  git(project.root, 'init', '-q'); git(project.root, 'add', '-A'); git(project.root, 'commit', '-q', '-m', 'root');
  git(project.root, '-c', 'protocol.file.allow=always', 'submodule', 'add', '-q', vendored.root, 'apps/vendored');
  await installTailwind(join(project.root, 'apps/vendored'));
  const listed = await run(project, [], 2);
  assert.match(listed.stderr, /npx plumber --root apps\/vendored\s+Vite · Tailwind 4/);
  assert.match(listed.stderr, /npx plumber --root apps\/web\s+Next\.js · no Tailwind/);
  const inside = json(await run(project, ['state', '--json', '--root', 'apps/vendored']));
  assert.equal(inside.numbers.files.source, 1);
  assert.equal(inside.numbers.entries, 1);
});

test('two-host-configs: vite wins by registry order, next.config.js is kept as a conflict; locate.host is ok, not unknown', async t => {
  const project = await fixture(t, viteApp({
    'vite.config.ts': "import { defineConfig } from 'vite';\nexport default defineConfig({ plugins: [] });\n",
    'next.config.js': 'module.exports = {};\n',
  }));
  await installTailwind(project.root);
  const doctor = await run(project, ['doctor'], 1);
  assert.match(doctor.stdout, /ok vite config found; runtime not observed \[locate\.host\]/);
  assert.match(doctor.stdout, /vite\.config\.ts:1[^\n]*also next\.config\.js, ignored/);
  assert.doesNotMatch(doctor.stdout, /Host could not be established/);
});

test('tailwind-declared-not-installed: one message from one place; state names the rung', async t => {
  const project = await fixture(t, viteApp());
  for (const args of [[], ['--json']]) {
    const result = await run(project, args, 2);
    assert.equal(result.stderr, '✗ Tailwind 4 is in package.json but not installed.\n  → npm install\n');
  }
  const state = json(await run(project, ['state', '--json']));
  assert.equal(state.rung, 'R0'); assert.equal(state.kind, 'not-installed');
  assert.equal(state.sentence, 'Tailwind 4 is in package.json but not installed.');
});

test('plain-css-react: a React app with stylesheets and no Tailwind is judged as plain CSS', async t => {
  const project = await fixture(t, { 'package.json': { dependencies: { react: '*' } }, 'src/App.jsx': "import './styles.css'; export const App = () => <div className=\"card\" />;\n", 'src/styles.css': ':root { --space-4: 1rem; }\n.card { padding: var(--space-4); }\n' });
  const result = await run(project, ['--json'], 0);
  assert.equal(result.stderr, '');
  const report = json(result);
  assert.equal(report.tailwind.entry, null);
  const state = json(await run(project, ['state', '--json']));
  assert.equal(state.numbers.tailwind.major, null);
});

test('facts are public: state --json, doctor and the readiness route show the same facts with evidence (nested-worktrees)', { timeout: 180000 }, async t => {
  const project = await fixture(t, viteApp());
  await installTailwind(project.root);
  await put(project.root, { '.gitignore': 'node_modules\nvite.config.mjs\n' });
  git(project.root, 'init', '-q'); git(project.root, 'add', '-A'); git(project.root, 'commit', '-q', '-m', 'app');
  for (const name of ['a', 'b']) git(project.root, 'worktree', 'add', '-q', join('.claude/worktrees', name), '-b', name);
  const state = json(await run(project, ['state', '--json']));
  await checkFacts(project.root, state.facts);
  assert.deepEqual(state.facts.checkouts.value.map(item => [item.path, item.kind, item.evidence.file]), [['.claude/worktrees/a', 'worktree', '.claude/worktrees/a/.git'], ['.claude/worktrees/b', 'worktree', '.claude/worktrees/b/.git']]);
  assert.equal(state.facts.checkouts.source, 'observed');
  assert.match(state.facts.checkouts.value[0].evidence.text, /^gitdir: /);
  assert.deepEqual([state.facts.root.value, state.facts.boundary.value, state.facts.repo.value, state.facts.workspace.value, state.facts.packageManager.value, state.facts.host.value.id], ['.', '.', '.', null, 'npm', 'vite']);
  assert.equal(state.facts.styling.value.systems[0].id, 'tailwind');
  assert.equal(state.facts.styling.value.systems[0].support, 'supported');
  assert.equal(state.facts.styling.value.tokens.kind, '@theme');
  const doctor = await run(project, ['doctor'], 1);
  const projectTable = doctor.stdout.split('\nProject\n')[1].split('\nDiagnostics\n')[0];
  assert.match(projectTable, /^Root:\s+\.\s+declared: package\.json:1/m);
  assert.match(projectTable, /^Workspace:\s+none\s+inferred: package\.json:1 no workspaces key/m);
  assert.match(projectTable, /^Checkouts:\s+2 nested, excluded\s+\.claude\/worktrees\/a \(worktree/m);
  assert.match(projectTable, /^Styling:\s+Tailwind 4/m);
  const ready = await viteReadiness(t, project.root);
  sameFacts(json(await run(project, ['state', '--json'])).facts, ready.project);
  assert.ok(ready.project.checkouts.value.length === 2);
  const source = ready.requirements.find(item => item.id === 'locate.source');
  assert.equal(source.status, 'ok');
  assert.ok(source.evidence.every(item => !item.file.startsWith('.claude/')), 'nothing from the worktrees');
  // Inside a worktree, its own .git file is the fence: boundary and repo are that folder.
  const inside = json(await run(project, ['state', '--json', '--root', '.claude/worktrees/a']));
  assert.deepEqual([inside.facts.boundary.value, inside.facts.repo.value, inside.facts.checkouts.value], ['.', '.', []]);
});

test('override-wins through Vite: plumb({ root }) is an override the readiness project block reports', { timeout: 180000 }, async t => {
  const project = await fixture(t, viteApp({ 'package.json': { name: 'root', type: 'module', workspaces: ['apps/*'], dependencies: { react: '*', vite: '*', tailwindcss: '^4' } }, 'apps/web/package.json': { dependencies: { react: '*' } } }));
  await installTailwind(project.root);
  const ready = await viteReadiness(t, project.root, ", root: '.'");
  assert.equal(ready.project.root.source, 'override');
  assert.equal(ready.project.root.value, '.');
  assert.equal(ready.project.workspace.value.tool, 'npm');
  assert.equal(ready.requirements.find(item => item.id === 'locate.host').status, 'ok');
  const plain = await viteReadiness(t, project.root);
  assert.equal(plain.project.root.source, 'declared');
});
