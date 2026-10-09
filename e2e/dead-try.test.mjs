import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { formatAgent } from '../dist/surfaces/agent.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = join(root, 'dist/cli.js');
async function project(t) {
  const directory = await mkdtemp(join(root, 'fixtures/.layer10-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(join(root, 'fixtures/dead-try'), directory, { recursive: true });
  return directory;
}
function run(directory, args = [], input) {
  const result = spawnSync(process.execPath, [cli, ...args, '--root', directory], { input, encoding: 'utf8', timeout: 15_000 });
  assert.ifError(result.error);
  assert.equal(result.signal, null, result.stderr);
  assert.equal(result.stderr, '', result.stderr);
  return result;
}
const json = result => JSON.parse(result.stdout);
const dead = report => report.findings.filter(f => f.rule.startsWith('dead/')).flatMap(f => f.decisions.map(d => d.name)).sort();
async function snapshot(directory) {
  const files = {};
  for (const item of await readdir(directory, { recursive: true, withFileTypes: true })) {
    if (item.isFile()) {
      const file = join(item.parentPath, item.name);
      files[file] = (await readFile(file)).toString('base64');
    } else if (item.isDirectory()) files[join(item.parentPath, item.name)] = '<directory>';
  }
  return files;
}

test('dead decisions group per family, exclude framework, and retain semantic dependencies including inline compiler keys', async t => {
  const directory = await project(t);
  const result = run(directory, ['--json']);
  assert.equal(result.status, 0);
  const report = json(result);
  assert.deepEqual(dead(report), ['--color-orphan', '--color-unused', '--spacing-s2', '--spacing-s4', '--spacing-unused']);
  assert.ok(report.findings.every(f => f.severity === 'info'));
  assert.deepEqual(report.deadDecisions.color, { total: 4, used: 2, exported: 0, dead: 2 });
  assert.deepEqual(report.deadDecisions.spacing, { total: 4, used: 1, exported: 0, dead: 3 });
  assert.match(run(directory).stdout, /unused .*\b3 spacing\b.*tokens are never used in your source/);
  assert.deepEqual(dead(json(run(directory, ['--json']))), dead(report));
  await writeFile(join(directory, 'plumb.config.ts'), "export default { css: 'src/styles.css', decisions: { spacing: { exported: true }, color: { exported: true } } };");
  assert.deepEqual(dead(json(run(directory, ['--json']))), []);
});

test('export globs match names and sources; published semantic decisions retain primitives; equal literals do not count as references', async t => {
  const directory = await project(t);
  await writeFile(join(directory, 'src/App.tsx'), '<div style={{ gap: 12 }} />;');
  await writeFile(join(directory, 'plumb.config.ts'), "export default { css: 'src/styles.css', exported: ['--color-{ink,orphan}', '--spacing-unused'] };");
  const report = json(run(directory, ['--json']));
  assert.deepEqual(dead(report), ['--spacing-s2', '--spacing-s3', '--spacing-s4']);
  assert.deepEqual(report.deadDecisions.color, { total: 4, used: 2, exported: 2, dead: 0 });
  await writeFile(join(directory, 'plumb.config.ts'), "export default { css: 'src/styles.css', exported: ['src/*.css'] };");
  assert.deepEqual(dead(json(run(directory, ['--json']))), []);
});

test('named @apply decisions survive inline compiler rewriting and keep their primitives alive', async t => {
  const directory = await project(t);
  const css = join(directory, 'src/styles.css');
  await writeFile(css, (await readFile(css, 'utf8')) + '\n.used { @apply text-ink; }');
  await writeFile(join(directory, 'src/App.tsx'), 'import "./styles.css"; <div />;');
  const result = run(directory, ['--json']);
  assert.equal(result.status, 0);
  assert.ok(!dead(json(result)).includes('--color-ink'));
  assert.ok(!dead(json(result)).includes('--color-base'));
  assert.equal(run(directory, ['try', '--lang', 'css', '--json'], '.used { @apply text-ink; }').status, 0);
});

test('usage follows nondecision aliases across source boundaries, handles cycles, and does not count outside source consumers', async t => {
  const directory = await project(t);
  await mkdir(join(directory, 'outside'));
  await writeFile(join(directory, 'outside/alias.css'), ':root { --alias: var(--color-ink); --cycle-a: var(--cycle-b); --cycle-b: var(--cycle-a); } .outside { gap: var(--spacing-unused); }');
  await writeFile(join(directory, 'src/App.tsx'), 'import "../outside/alias.css"; <div style={{ color: "var(--alias)" }} />;');
  const report = json(run(directory, ['--json']));
  assert.ok(!dead(report).includes('--color-base'));
  assert.ok(!dead(report).includes('--color-ink'));
  assert.ok(dead(report).includes('--spacing-unused'));
});

test('dead checks compose with ledger classification when CSS is emitted through multiple import contexts', async t => {
  const directory = await project(t);
  await writeFile(join(directory, 'src/extra.css'), '.row { background: var(--missing-a, var(--missing-b)); }');
  const css = join(directory, 'src/styles.css');
  await writeFile(css, (await readFile(css, 'utf8')) + '\n@import "./extra.css";');
  await writeFile(join(directory, 'src/App.tsx'), 'import "./styles.css"; import "./extra.css"; <div className="gap-s3" />;');
  const result = run(directory, ['--json']);
  assert.equal(result.status, 1);
  assert.ok(dead(json(result)).length);
  for (const finding of json(result).findings.filter(f => f.rule === 'existence/dead-var')) {
    assert.equal(finding.sites.length, 1);
    assert.ok(finding.sites[0].ledger.key);
  }
});

test('try TSX names nearest decisions, passes named gap, supports agent/text, uses virtual locations and never applies baseline debt', async t => {
  const directory = await project(t);
  const result = run(directory, ['try', '--json'], '<div className="gap-10" />');
  assert.equal(result.status, 1);
  const report = json(result);
  assert.equal(report.deadDecisions, undefined);
  assert.equal(report.findings.length, 1);
  assert.deepEqual(report.findings[0].decisions.map(d => d.name), ['--spacing-s2', '--spacing-s3']);
  assert.equal(report.findings[0].sites[0].file, join(directory, 'src/__plumb_try__.tsx'));
  assert.equal(run(directory, ['try', '--json'], '<div className="gap-s3" />').status, 0);
  const agent = run(directory, ['try', '--agent'], '<div className="gap-10" />').stdout;
  assert.equal(agent, formatAgent(report));
  assert.match(agent, /replace `gap-10` with `gap-s2`/);
  assert.match(agent, /replace `gap-10` with `gap-s3`/);
  const clean = json(run(directory, ['try', '--json'], '<div className="gap-s3" />'));
  assert.equal(run(directory, ['try', '--agent'], '<div className="gap-s3" />').stdout, formatAgent(clean));
  assert.match(formatAgent(clean), /^0 new\n/);
  assert.match(run(directory, ['try'], '<div className="gap-10" />').stdout, /gap-10/);
  await writeFile(join(directory, 'src/App.tsx'), 'export const App = () => <div className="gap-10" />;');
  assert.equal(run(directory, ['baseline']).status, 0);
  assert.equal(run(directory, ['try', '--as', 'src/App.tsx', '--json'], 'export const App = () => <div className="gap-10" />;').status, 1);
});

test('try shares per-site agent instructions and preserves hover oracle and ownership without cache writes', async t => {
  const directory = await project(t);
  const css = join(directory, 'src/styles.css');
  await writeFile(css, (await readFile(css, 'utf8')) + '\n@custom-variant fine-hover { &:hover { @media (hover: hover) and (pointer: fine) { @slot; } } }');
  await writeFile(join(directory, 'src/Button.tsx'), 'export function Button(props: { className?: string }) { return <button className={props.className} />; }');
  await writeFile(join(directory, 'plumb.config.ts'), "export default { css: 'src/styles.css', habits: ['hover-gate'], components: { from: 'src/Button.tsx' }, decisions: { spacing: { identity: 'value', callers: ['primitive', 'semantic'] } } };");
  const snippet = 'import { Button } from "./Button"; <><div className="gap-10" /><div className="gap-10" /><Button className="hover:opacity-50 bg-base" /></>;';
  const verify = () => {
    const report = json(run(directory, ['try', '--json'], snippet));
    const output = run(directory, ['try', '--agent'], snippet).stdout;
    assert.equal(output, formatAgent(report));
    const spacing = report.findings.find(f => f.rule === 'provenance/spacing');
    assert.equal(spacing.sites.length, 2);
    for (const site of spacing.sites) assert.ok(output.includes(`then edit at src/__plumb_try__.tsx:${site.line}:${site.column}:`));
    assert.match(report.findings.find(f => f.rule === 'habits/hover-gate').fix, /Use `pointer-hover:`/);
    assert.ok(report.findings.some(f => f.rule === 'ownership/Button'));
  };
  const cold = await snapshot(directory);
  verify();
  assert.deepEqual(await snapshot(directory), cold);
  run(directory, ['--json']);
  const warm = await snapshot(directory);
  verify();
  assert.deepEqual(await snapshot(directory), warm);
});

test('try CSS supports inference, explicit language, imports, @apply, inline TSX and project class registry', async t => {
  const directory = await project(t);
  for (const args of [[], ['--lang', 'css'], ['--as', 'src/new.css']]) {
    const bad = run(directory, ['try', '--json', ...args], '.row { gap: 10px; }');
    assert.equal(bad.status, 1);
    assert.equal(json(bad).findings[0].declaration.resolved, '10px');
    assert.equal(run(directory, ['try', '--json', ...args], '.row { gap: var(--spacing-s3); }').status, 0);
  }
  assert.equal(run(directory, ['try', '--lang', 'css', '--json'], '.row { @apply gap-s3; }').status, 0);
  assert.equal(run(directory, ['try', '--json'], '<div style={{ gap: 10 }} />').status, 1);
  await writeFile(join(directory, 'src/custom.css'), '.custom { gap: var(--spacing-s3); }');
  assert.equal(run(directory, ['try', '--json'], '<div className="custom" />').status, 0);
  assert.equal(run(directory, ['try', '--as', 'src/new.css', '--json'], '@import "./custom.css"; .row { gap: var(--spacing-s3); }').status, 0);
});

test('try writes neither sources nor caches, including cold and warm runs, failures and imported TSX constants', async t => {
  const directory = await project(t);
  await writeFile(join(directory, 'src/classes.tsx'), 'export const GAP = "gap-s3";');
  const before = await snapshot(directory);
  for (const [args, snippet] of [
    [[], '<div className="gap-10" />'],
    [[], 'import { GAP } from "./classes"; <div className={GAP} />;'],
    [['--lang', 'css'], '.row { @apply gap-s3; }'],
  ]) run(directory, ['try', '--json', ...args], snippet);
  assert.deepEqual(await snapshot(directory), before);
  run(directory, ['--json']);
  const warm = await snapshot(directory);
  run(directory, ['try', '--json'], '<div className="gap-s3" />');
  assert.deepEqual(await snapshot(directory), warm);
});

test('try rejects invalid language/path/flag combinations and syntax without writing', async t => {
  const directory = await project(t);
  for (const args of [['try', '--lang', 'html'], ['try', '--as', '../escape.tsx'], ['try', '--as', 'outside/a.tsx'], ['try', '--as', 'src/a.css', '--lang', 'tsx'], ['try', '--json', '--agent'], ['check', '--lang', 'css']]) {
    const result = spawnSync(process.execPath, [cli, ...args, '--root', directory], { input: '<div />', encoding: 'utf8' });
    assert.equal(result.status, 2, result.stdout + result.stderr);
    assert.match(result.stderr, /plumb:/);
  }
  assert.equal(spawnSync(process.execPath, [cli, 'try', '--lang', 'tsx', '--root', directory], { input: '<div', encoding: 'utf8' }).status, 2);
});
