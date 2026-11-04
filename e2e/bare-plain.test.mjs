// `npx plumber` with no browser to open (a pipe, CI, --no-open): the 3 biggest causes in the words a person would use,
// then exactly one next step. What the next step is depends on whether the project is set up.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { project } from './helpers/causes-project.mjs';
import { opener, run } from './helpers/bare-cli.mjs';

// words that belong to the tool's insides; the default output never says them (docs/design/onboarding.md, "Words")
const inside = /\b(tokens?|drift|debt|ledger|baseline|capabilit\w+|decisions?|findings?|rules?|provenance|overlay|blueprint)\b/i;

function assertPlain(text, { next }) {
  const lines = text.trimEnd().split('\n');
  assert.match(lines[0], /^Plumber · 2 files in \d+\.\ds$/, text);
  assert.equal(lines.filter(line => line.startsWith('Next:')).length, 1, text);
  assert.equal(lines.at(-1), next, text);
  assert.equal(lines.at(-2), '', 'a blank line before the next step');
  assert.doesNotMatch(text, inside);
  assert.ok(lines.length <= 9, `short: ${lines.length} lines\n${text}`);
}

test('no terminal: the 3 causes of a project that is not set up, then one way forward, and no page', { timeout: 120000 }, async (t) => {
  const root = await project(t);
  const { script, opened } = await opener(t);
  const first = run(['--root', root]);
  assert.equal(first.code, 0, first.stderr);
  assertPlain(first.stdout, { next: 'Next: run npx plumber in a terminal to see this in your browser, or npx plumber --yes to set it up here.' });
  // white is one cause, written 3 ways in 6 places, 2 of which render nothing, and the theme already names it
  assert.match(first.stdout, /^ {2}You wrote white 3 ways, in 6 places\. Your theme calls it on-accent\. 2 render nothing\.$/m);
  assert.match(first.stdout, /^ {2}You set text size 15px 2 ways, in 2 places\. The closest in your type scale is body \(16px\)\.$/m);
  assert.equal(first.stdout.split('\n').filter(line => /^ {2}\S/.test(line)).length >= 2, true);
  // CI on a terminal and --no-open on a terminal say the same thing
  const same = (extra, args = []) => { const result = run(['--root', root, ...args], { PLUMBER_TERMINAL: '1', PLUMBER_OPENER: script, ...extra }); assert.equal(result.stdout.replace(/in \d+\.\ds/, ''), first.stdout.replace(/in \d+\.\ds/, '')); };
  same({ CI: 'true' });
  same({}, ['--no-open']);
  assert.equal(await opened(300), null);
});

test('a project that is set up: nothing new, how many causes are still open, and press Alt+B', { timeout: 180000 }, async (t) => {
  const root = await project(t);
  // set up the way a person does: a Vite app, then --yes (Plumber in the dev config, today's state saved)
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  await writeFile(join(root, 'package.json'), JSON.stringify({ ...manifest, type: 'module', devDependencies: { ...manifest.devDependencies, vite: '^8.0.0' } }));
  await writeFile(join(root, 'vite.config.ts'), "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nexport default defineConfig({ plugins: [react()] });\n");
  // its own repo with everything committed, like an app on a clean checkout
  for (const args of [['init', '-q'], ['add', '-A'], ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'app']]) spawnSync('git', args, { cwd: root });
  const recorded = run(['--yes', '--root', root]);
  assert.equal(recorded.code, 0, recorded.stdout + recorded.stderr);
  const second = run(['--root', root]);
  assert.equal(second.code, 0, second.stderr);
  assertPlain(second.stdout, { next: 'Next: press Alt+B on your page to fix it there.' });
  assert.match(second.stdout, /^ {2}Nothing new since you set up\. \d+ causes are still open, the biggest:$/m, second.stdout);
  assert.match(second.stdout, /You wrote white 3 ways, in 6 places/);
  // a new problem after setup (a class that renders nothing) is said first
  await appendFile(join(root, 'src/App.tsx'), 'export const Late = () => <p className="bg-white">late</p>;\n');
  const later = run(['--root', root]);
  assert.match(later.stdout, /^ {2}1 new problem since you set up\. \d+ causes are open, the biggest:$/m, later.stdout);
  assertPlain(later.stdout, { next: 'Next: press Alt+B on your page to fix it there.' });
});

test('plumber check still prints the full report, with the words the CI and agent readers know', { timeout: 120000 }, async (t) => {
  const root = await project(t);
  const checked = run(['check', '--root', root]);
  assert.match(checked.stdout, /Fix first/);
  assert.match(checked.stdout, /On your tokens/);
  assert.doesNotMatch(checked.stdout, /^Next:/m);
});
