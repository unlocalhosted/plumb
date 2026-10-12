import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { test } from 'node:test';
import { Session } from '../dist/session/index.js';
const repo = fileURLToPath(new URL('../', import.meta.url));
const run = root => {
  const r = spawnSync(process.execPath, [join(repo, 'dist/cli.js'), '--root', root, '--json'], { encoding: 'utf8', timeout: 15000 });
  assert.ifError(r.error); assert.equal(r.stderr, ''); assert.ok([0, 1].includes(r.status), r.stdout);
  return JSON.parse(r.stdout);
};
async function project(t, theme = '', source = '<div className="gap-3 gap-[13px] p-[13px]" />;') {
  const root = await mkdtemp(join(repo, 'fixtures/.numeric-spacing-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/tailwind-min'), root, { recursive: true, filter: p => !p.includes('.plumb-cache') });
  await writeFile(join(root, 'src/styles.css'), `@import "tailwindcss"; ${theme}`);
  await writeFile(join(root, 'src/App.tsx'), `import './styles.css'; ${source}`);
  await writeFile(join(root, 'src/Button.tsx'), ''); await writeFile(join(root, 'src/Card.tsx'), '');
  return root;
}
const spacing = report => report.findings.filter(f => f.family === 'spacing' && !f.rule.startsWith('dead/'));
test('default numeric spacing passes and off-scale gaps/padding name nearest half steps', async t => {
  const root = await project(t);
  let report = run(root);
  assert.ok(!spacing(report).some(f => f.sites.some(s => s.text === 'gap-3')));
  const gap = spacing(report).find(f => f.sites.some(s => s.text === 'gap-[13px]'));
  assert.equal(gap.rule, 'provenance/arbitrary');
  assert.deepEqual(gap.decisions.map(d => d.use.class), ['gap-3', 'gap-3.5']);
  assert.deepEqual(gap.decisions.map(d => d.resolved), ['12px', '14px']);
  assert.ok(spacing(report).some(f => f.fix.includes('p-3.5')));
  assert.deepEqual(run(root).findings, report.findings);
  await writeFile(join(root, 'src/styles.css'), '@import "tailwindcss"; @theme { --spacing: 2px; } .explicit { gap: calc(var(--spacing) * 3); margin: calc(-3 * var(--spacing)); padding: calc(var(--spacing) * 3 + 1px); }');
  report = run(root);
  assert.ok(!spacing(report).some(f => f.sites.some(s => s.text === 'gap-3' || s.text === 'gap: calc(var(--spacing) * 3)' || s.text === 'margin: calc(-3 * var(--spacing))')));
  assert.deepEqual(spacing(report).find(f => f.sites.some(s => s.text === 'gap-[13px]')).decisions.map(d => d.use.class), ['gap-6.5']);
  assert.ok(spacing(report).some(f => f.sites.some(s => s.text === 'padding: calc(var(--spacing) * 3 + 1px)')));
});
test('layout dimensions alone do not replace numeric spacing; one named step does', async t => {
  const root = await project(t, '@theme { --spacing-page: 14px; --spacing-page-x: 14px; --spacing-page-t: 40px; --spacing-page-b: 32px; --spacing-rail-w: 220px; --spacing-content-max: 56rem; }');
  assert.ok(!spacing(run(root)).some(f => f.sites.some(s => s.text === 'gap-3')));
  await writeFile(join(root, 'src/styles.css'), '@import "tailwindcss"; @theme { --spacing: 1px; --spacing-small: 8px; }');
  const report = run(root);
  assert.ok(spacing(report).some(f => f.sites.some(s => s.text === 'gap-3')));
  assert.deepEqual(spacing(report).find(f => f.sites.some(s => s.text === 'gap-[13px]')).decisions.map(d => d.use.class), ['gap-small']);
});
test('spacing namespace reset disables numeric choices even when unit is reintroduced', async t => {
  const root = await project(t, '@theme { --spacing-*: initial; --spacing: 1px; --spacing-small: 8px; --spacing-large: 16px; }');
  const report = run(root);
  assert.ok(spacing(report).some(f => f.sites.some(s => s.text === 'gap-3')));
  assert.deepEqual(spacing(report).find(f => f.sites.some(s => s.text === 'gap-[13px]')).decisions.map(d => d.use.class), ['gap-small', 'gap-large']);
});

test('numeric choices apply to variants, inline values and plain CSS through the session edit transport', async t => {
  const root = await project(t, '', '<div className="hover:gap-[13px] -mt-[13px]" style={{ padding: 13 }} />;');
  await writeFile(join(root, 'src/plain.css'), '.plain { gap: 13px !important; }');
  await writeFile(join(root, 'src/App.tsx'), "import './styles.css'; import './plain.css'; <div className=\"hover:gap-[13px] -mt-[13px]\" style={{ padding: 13 }} />;");
  const session = await Session.create({ root, watch: false });
  t.after(() => session.close());
  for (const [file, from, to] of [
    ['src/App.tsx', 'hover:gap-[13px]', 'hover:gap-3'],
    ['src/App.tsx', '-mt-[13px]', '-mt-3'],
    ['src/App.tsx', 'padding: 13', 'padding: "calc(var(--spacing) * 3)"'],
    ['src/plain.css', '13px', 'calc(var(--spacing) * 3)'],
  ]) {
    const choices = await session.edits(file, 1);
    const edit = choices.edits.find(edit => edit.from === from && edit.to === to);
    assert.ok(edit, JSON.stringify(choices.edits));
    const before = await readFile(join(root, file), 'utf8');
    await session.apply({ file, hash: choices.hash, edits: [{ id: edit.id }] });
    assert.equal(await readFile(join(root, file), 'utf8'), before.slice(0, edit.start) + to + before.slice(edit.end));
  }
  assert.ok(!spacing(await session.report()).some(f => f.rule.startsWith('provenance/')));
});
