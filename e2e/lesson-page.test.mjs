// @tier browser
// The project page as Plumber's onboarding lesson (docs/design/onboarding.md, "The lesson"), walked in a browser the
// way a newcomer walks it: Welcome, a screen per kind with one choice each, your rules filling in, then Set it up.
// Each test is a failure seen on 2026-11-14 (docs/journey.md, entry 34): steps labelled with token names a newcomer
// can't read, and a tidy that would have written a whole text style as its size alone.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { serve } from '../dist/session/server.js';
import { fixture } from './helpers/layouts.mjs';
import { open } from './helpers/browser.mjs';

const TOKENS = `:root {
  --space-1: 4px; --space-2: 8px; --space-4: 16px; --space-6: 24px;
  --gap-sm: 8px; --gap-md: 16px; --gap-lg: 24px; --gap-xl: 32px;
  --t-sm: 400 13px/18px system-ui, sans-serif; --t-md: 400 16px/24px system-ui, sans-serif; --t-lg: 600 24px/32px system-ui, sans-serif;
  --fs-sm: 13px; --fs-md: 16px;
  --radius-sm: 6px; --radius-md: 12px;
  --ink: #1d1b17; --pink: #f24a9f;
}
`;
const STYLES = `@import "./tokens.css";
.card { padding: var(--space-4); gap: var(--gap-md); margin: var(--gap-xl); border-radius: var(--radius-md); color: var(--ink); font: var(--t-md); }
.card h3 { font: var(--t-lg); font-size: var(--fs-md); }
.note { padding: 10px; gap: 18px; font-size: 15px; }
`;

async function lesson(t) {
  const project = await fixture(t, {
    'package.json': { name: 'lesson-app', private: true, dependencies: { react: '19.0.0' } },
    'src/tokens.css': TOKENS, 'src/card.css': STYLES,
    'src/main.jsx': "import './card.css';\nexport default function App() { return <section className=\"card\"><h3>Pro</h3></section>; }\n",
  });
  const server = await serve({ root: project.root, watch: false, page: true }); t.after(() => server.close());
  const { page, errors } = await open(t, `http://127.0.0.1:${server.info.port}/`);
  const lessonRoot = page.locator('#lesson');
  await lessonRoot.locator('.trail').waitFor();
  return { root: project.root, page, errors, at: lessonRoot };
}

test('Welcome says what happens in plain words, and each screen keeps the newcomer in one place', { timeout: 120000 }, async (t) => {
  const { at, errors } = await lesson(t);
  await assert.doesNotReject(at.getByText('Nothing changes in your files until the last step.').waitFor());
  assert.deepEqual(await at.locator('.trail button').allInnerTexts(), ['Welcome', 'Spacing', 'Colours', 'Text', 'Corners', 'Your rules']);
  assert.equal(await at.locator('.screen').count(), 1, 'one screen at a time');
  assert.deepEqual(errors, []);
});

test('the spacing drawing names a step by its size, once, not by its token names', { timeout: 120000 }, async (t) => {
  // before: Gravity's steps read pl-space-1, pl-card-gap, s-4: three names for one 16px, none of them meaningful
  const { at } = await lesson(t);
  await at.locator('[data-go="spacing"]').first().click();
  const table = at.locator('#gv-table');
  await table.waitFor({ state: 'attached' });
  const steps = await table.locator('tr td:first-child').allInnerTexts();
  assert.ok(steps.length > 0, 'steps are drawn');
  assert.ok(steps.every((name) => /^\d+(?:\.\d+)?px$/.test(name)), `steps by size: ${steps}`);
  assert.equal(steps.filter((name) => name === '16px').length, 1, '16px is one step, though two lists name it');
  await assert.doesNotReject(at.getByText(/You have 2 separate lists of gaps and paddings/).waitFor());
});

test('each answer adds a plain-words rule beside the lesson', { timeout: 120000 }, async (t) => {
  const { at } = await lesson(t);
  await at.locator('[data-go="spacing"]').first().click();
  await at.getByRole('radio', { name: /One list of/ }).waitFor();
  assert.equal(await at.getByRole('radio', { name: /One list of/ }).getAttribute('aria-checked'), 'true', 'the tidy answer is picked already');
  await at.locator('[data-next="spacing"]').click();
  const rule = at.locator('.rules li', { hasText: 'Spacing' });
  await assert.doesNotReject(rule.getByText(/Every gap and padding uses one of these \d+\. Anything else, Plumber points out\./).waitFor());
  assert.match(await rule.locator('code').innerText(), /spacing: \{ from: \['css:src\/tokens\.css#--spacing-\*'\] \}/);
});

test('Set it up writes the tokens as chosen, your rules and today\'s state, and a text style keeps its whole value', { timeout: 180000 }, async (t) => {
  // before: a tidied text step was written as its size alone (--t-md: 16px), breaking every font: var(--t-md)
  const { root, at, errors } = await lesson(t);
  await at.locator('[data-go="spacing"]').first().click();
  for (const screen of ['spacing', 'colour', 'text', 'corners']) await at.locator(`[data-next="${screen}"]`).click();
  await at.locator('[data-setup]').click();
  await assert.doesNotReject(at.getByText(/Done\. Your rules are in plumber\.config/).waitFor({ timeout: 60000 }));
  assert.match(await at.locator('[data-said]').innerText(), /problems? already in your code remembered, so you'll only hear about new ones/);

  const tokens = await readFile(join(root, 'src/tokens.css'), 'utf8');
  assert.match(tokens, /--space-4: var\(--spacing-4\)/, 'old spacing names point at the new list');
  assert.match(tokens, /--gap-xl: var\(--spacing-8\)/);
  const style = /--text-16:\s*([^;]+);/.exec(tokens)?.[1];
  assert.ok(style, 'the 16px text step is written');
  assert.match(style, /^400 16px\/24px/, `a whole style, not its size alone: ${style}`);
  assert.match(tokens, /--t-md: var\(--text-16\)/);

  const config = await readFile(join(root, 'plumber.config.ts'), 'utf8');
  assert.match(config, /"css:src\/tokens\.css#--spacing-\*"/);
  assert.match(config, /"css:src\/tokens\.css#--text-\*"/);
  assert.ok((await readFile(join(root, '.plumber/ledger.jsonl'), 'utf8')).includes('"debt"'), 'today\'s problems are remembered');
  assert.deepEqual(errors, []);
});
