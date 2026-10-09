import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = join(root, 'dist/cli.js');
function run(directory, args = [], status = 0, json = true) {
  const result = spawnSync(process.execPath, [cli, '--root', directory, ...args, ...(json ? ['--json'] : [])], { encoding: 'utf8', timeout: 15_000 });
  assert.ifError(result.error);
  assert.equal(result.status, status, result.stderr || result.stdout);
  return json && status !== 2 ? JSON.parse(result.stdout) : result;
}
async function copy(t, fixture = 'ledger') {
  const directory = await mkdtemp(join(root, 'fixtures/.ledger-e2e-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(join(root, 'fixtures', fixture), directory, { recursive: true });
  return directory;
}
const ledger = async directory => (await readFile(join(directory, '.plumb/ledger.jsonl'), 'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);
const save = (directory, entries) => writeFile(join(directory, '.plumb/ledger.jsonl'), entries.map(JSON.stringify).join('\n') + '\n');
function git(directory, args) {
  const result = spawnSync('git', ['-C', directory, ...args], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
async function history(directory) {
  git(directory, ['init', '-q']);
  git(directory, ['config', 'user.name', 'Ledger Test']);
  git(directory, ['config', 'user.email', 'ledger@example.test']);
  await writeFile(join(directory, '.gitignore'), '.plumb-cache/\nnode_modules/\n');
  git(directory, ['add', '.']);
  git(directory, ['commit', '-qm', 'fixture baseline']);
}
const errors = report => report.findings.filter(finding => finding.severity === 'error');
const newSites = finding => finding.sites.filter(site => site.ledger?.status === 'new');

test('habit findings flow through baseline, new-site gates and reasoned exceptions', async t => {
  const directory = await copy(t);
  const config = join(directory, 'plumb.config.ts');
  await writeFile(config, (await readFile(config, 'utf8')).replace("css: 'src/styles.css',", "css: 'src/styles.css',\n  habits: ['hover-gate'],"));
  const path = join(directory, 'src/styles.css');
  const css = await readFile(path, 'utf8');
  await writeFile(path, css + '\n.habit:hover { opacity: .5; }\n');
  const first = run(directory, [], 1).findings.find(f => f.rule === 'habits/hover-gate');
  assert.ok(first);
  assert.equal(first.status, 'new');
  assert.equal(first.sites[0].ledger.status, 'new');
  const key = first.sites[0].ledger.key;
  run(directory, ['baseline']);
  assert.ok((await ledger(directory)).some(e => e.key === key && e.rule === 'habits/hover-gate' && e.kind === 'debt'));
  const baselined = run(directory).findings.find(f => f.key === first.key);
  assert.equal(baselined.status, 'debt');
  assert.equal(baselined.sites[0].ledger.status, 'debt');
  assert.equal(baselined.severity, 'info');
  await writeFile(path, css + '\n.habit:hover { opacity: .5; }\n.new-habit:hover { opacity: .5; }\n');
  const added = run(directory, [], 1);
  assert.equal(added.ledger.new, 1);
  assert.deepEqual(errors(added).map(f => f.rule), ['habits/hover-gate']);
  const newHabit = errors(added)[0];
  assert.equal(newSites(newHabit).length, 1);
  run(directory, ['accept', newHabit.sites[0].ledger.key, '--why', 'intentional hover teaching example']);
  const accepted = run(directory);
  assert.equal(accepted.ledger.new, 0);
  assert.equal(accepted.ledger.exceptions, 1);
  assert.equal(accepted.findings.find(f => f.key === newHabit.key).status, 'exception');
});

test('spacing fix groups stay identical through baseline; one new gap-10 joins the existing 10px group', async t => {
  const directory = await copy(t, 'spacing');
  const { check } = await import('../dist/index.js');
  const unledgered = await check({ root: directory, ledger: false });
  const before = run(directory, [], 1);
  const grouping = report => report.findings.map(finding => ({
    key: finding.key, rule: finding.rule, family: finding.family, amount: finding.declaration.resolved ?? finding.declaration.value,
    sites: finding.sites.map(({ ledger, ...site }) => site),
    fix: finding.fix, decisions: finding.decisions, occurrences: finding.occurrences,
  }));
  // Layer 4 accepts the on-ladder media-variable definitions at their authored sites.
  assert.equal(before.findings.length, 5);
  assert.deepEqual(grouping(before), grouping(unledgered));
  const ten = before.findings.find(f => f.rule === 'provenance/spacing' && f.declaration.resolved === '10px');
  assert.deepEqual(ten.sites.map(s => s.text).sort(), ['margin: 10px', 'padding: 10']);
  assert.equal(new Set(ten.sites.map(s => s.ledger.key)).size, 2);
  run(directory, ['baseline']);
  const baselined = run(directory);
  assert.equal(baselined.findings.length, before.findings.length);
  assert.deepEqual(grouping(baselined), grouping(before));
  assert.equal(baselined.ledger.debt, before.ledger.new);
  assert.equal(baselined.ledger.new, 0);
  assert.ok(baselined.findings.every(f => f.status === 'debt' && f.sites.every(s => s.ledger.status === 'debt')));
  const path = join(directory, 'src/App.tsx');
  await writeFile(path, (await readFile(path, 'utf8')).replace('return <>', 'return <>\n    <div className="gap-10" />'));
  const added = run(directory, [], 1);
  assert.equal(added.findings.length, before.findings.length);
  const mixed = added.findings.find(f => f.key === ten.key);
  assert.equal(mixed.status, 'new');
  assert.equal(mixed.sites.length, 3);
  assert.equal(newSites(mixed).length, 1);
  assert.equal(newSites(mixed)[0].text, 'gap-10');
  assert.equal(mixed.sites.filter(s => s.ledger.status === 'debt').length, 2);
  assert.equal(added.ledger.new, 1);
  assert.equal(added.ledger.debt, baselined.ledger.debt);
  assert.equal(added.coverage.spacing.debt, baselined.coverage.spacing.debt);
  assert.deepEqual(errors(added).map(f => f.key), [ten.key]);
});

test('baseline records sorted authored keys, exact properties, nearest anchors and counts; check green', async t => {
  const directory = await copy(t);
  const first = run(directory, [], 1);
  assert.match(first.ledger.message, /Run plumb baseline/);
  const text = run(directory, [], 1, false).stdout;
  assert.match(text, /Run plumb baseline/);
  run(directory, ['baseline']);
  const entries = await ledger(directory);
  assert.deepEqual(entries.map(e => e.key), entries.map(e => e.key).sort());
  assert.ok(entries.some(e => e.kind === 'debt' && e.key === 'provenance/spacing:div:gap:gap-10@src/App.tsx#App' && e.count === 2 && e.resolved === '10px'));
  assert.ok(entries.some(e => e.key.endsWith('#Nested') && e.count === 1));
  assert.ok(entries.some(e => e.anchor === '.row .child' && e.prop === 'padding'));
  assert.ok(entries.some(e => e.prop === 'padding' && e.authored === 'padding: 10px' && e.anchor === 'App'));
  assert.ok(entries.some(e => e.rule === 'existence/dead-class'));
  assert.ok(entries.filter(e => e.kind === 'decision').every(e => e.inferred));
  const checked = run(directory);
  assert.deepEqual(errors(checked), []);
  assert.equal(checked.ledger.new, 0);
  assert.ok(checked.findings.every(f => f.status === 'debt'));
  assert.ok(checked.coverage.spacing.debt > 0);
});

test('one extra gap-10 yields exactly one new site; baseline refuses debt growth without force', async t => {
  const directory = await copy(t);
  run(directory, ['baseline']);
  const path = join(directory, 'src/App.tsx');
  const source = await readFile(path, 'utf8');
  await writeFile(path, source.replace('    <Nested />', '    <div className="gap-10" />\n    <Nested />'));
  const red = run(directory, [], 1);
  assert.equal(errors(red).length, 1);
  assert.equal(errors(red)[0].status, 'new');
  assert.equal(newSites(errors(red)[0]).length, 1);
  assert.equal(newSites(errors(red)[0])[0].text, 'gap-10');
  assert.ok(errors(red)[0].sites.some(s => s.ledger.status === 'debt'));
  assert.equal(red.ledger.new, 1);
  const before = await readFile(join(directory, '.plumb/ledger.jsonl'), 'utf8');
  assert.match(run(directory, ['baseline'], 2).stderr, /refuses debt growth.*--force/);
  assert.equal(await readFile(join(directory, '.plumb/ledger.jsonl'), 'utf8'), before);
  run(directory, ['baseline', '--force']);
  assert.equal(run(directory).ledger.new, 0);
});

test('accept requires why; exception count is bounded; handwritten missing why fails globally', async t => {
  const directory = await copy(t);
  run(directory, ['baseline']);
  const entry = (await ledger(directory)).find(e => e.authored === 'gap-10' && e.anchor === 'Nested');
  assert.match(run(directory, ['accept', entry.key], 2).stderr, /requires --why/);
  run(directory, ['accept', entry.key, '--why', 'nested specimen demonstrates drift']);
  let checked = run(directory);
  assert.equal(checked.ledger.exceptions, 1);
  const mixed = checked.findings.find(f => f.sites.some(s => s.ledger.key === entry.key));
  assert.equal(mixed.status, 'debt');
  assert.deepEqual(mixed.sites.find(s => s.ledger.key === entry.key).ledger,
    { key: entry.key, status: 'exception', why: 'nested specimen demonstrates drift' });
  assert.equal(checked.coverage.spacing.exceptions, 1);
  let entries = await ledger(directory);
  delete entries.find(e => e.key === entry.key).why;
  await save(directory, entries);
  assert.ok(errors(run(directory, [], 1)).some(f => f.rule === 'ledger/no-why'));
  // Even an orphaned hand-written exception needs a reason.
  entries = entries.filter(e => e.key !== entry.key);
  entries.push({ key: 'orphan-handwritten', kind: 'exception' });
  await save(directory, entries);
  assert.ok(errors(run(directory, [], 1)).some(f => f.rule === 'ledger/no-why'));
});

test('rule/site acceptance, show and why expose current rules, decisions and ledger lines', async t => {
  const directory = await copy(t);
  run(directory, ['baseline']);
  run(directory, ['accept', '--rule', 'provenance/spacing', '--site', 'src/App.tsx:3', '--why', 'nested layout demonstration']);
  const entries = await ledger(directory);
  const entry = entries.find(e => e.anchor === 'Nested');
  const shown = run(directory, ['show', entry.key]);
  assert.equal(shown.findings.length, 1);
  assert.equal(shown.ledger.find(line => line.entry.key === entry.key).entry.why, 'nested layout demonstration');
  assert.ok(shown.ledger[0].line > 0);
  const why = run(directory, ['why', 'src/App.tsx:3']);
  assert.equal(why.findings[0].rule, 'provenance/spacing');
  assert.ok(why.decisions.some(d => d.name === '--spacing-step-small'));
  assert.ok(why.ledger.some(line => line.entry.key === entry.key));
  assert.ok(run(directory, ['show', 'provenance/spacing']).findings.length > 1);
  assert.match(run(directory, ['why', 'src/App.tsx:3'], 0, false).stdout, /nested layout demonstration/);
});

test('theme decision outside configured ladder cannot silently pass; changed/vanished decisions visible', async t => {
  const directory = await copy(t);
  run(directory, ['baseline']);
  const path = join(directory, 'src/styles.css');
  const css = await readFile(path, 'utf8');
  await writeFile(path, css.replace('@theme {', '@theme {\n  --spacing-13: 13px;'));
  const changed = run(directory, [], 1);
  const decision = errors(changed).filter(f => f.rule === 'decisions/unaccepted');
  assert.equal(decision.length, 1);
  assert.match(decision[0].why, /--spacing-13/);
  run(directory, ['accept-decisions', '--why', 'new step approved']);
  assert.deepEqual(errors(run(directory)), []);
  await writeFile(path, css.replace('8px', '9px'));
  const removed = run(directory, [], 1);
  assert.ok(removed.findings.some(f => f.rule === 'decisions/vanished'));
  assert.ok(removed.findings.some(f => f.rule === 'decisions/unaccepted' && f.why.includes('--spacing-step-small')));
  run(directory, ['accept-decisions']);
  run(directory, ['ledger', '--prune']);
  assert.ok(!run(directory).findings.some(f => f.rule.startsWith('decisions/')));
});

test('authored keys survive line shifts and spacing multiplier changes', async t => {
  const directory = await copy(t);
  run(directory, ['baseline']);
  const before = (await ledger(directory)).filter(e => e.kind === 'debt').map(e => e.key);
  const path = join(directory, 'src/App.tsx');
  await writeFile(path, '\n\n// comment above components\n' + await readFile(path, 'utf8'));
  const css = join(directory, 'src/styles.css');
  await writeFile(css, (await readFile(css, 'utf8')).replace('--spacing: 1px', '--spacing: 2px'));
  const checked = run(directory);
  assert.ok(checked.findings.some(f => f.declaration.resolved === '20px' && f.status === 'debt'));
  assert.deepEqual((await ledger(directory)).filter(e => e.kind === 'debt').map(e => e.key), before);
  assert.equal(checked.ledger.new, 0);
});

test('ratchet shrinks identical counts and drops fixes; prune removes stale exceptions', async t => {
  const directory = await copy(t);
  run(directory, ['baseline']);
  run(directory, ['accept', '--rule', 'existence/dead-class', '--site', 'src/App.tsx:8', '--why', 'teaching dead class']);
  const path = join(directory, 'src/App.tsx');
  await writeFile(path, (await readFile(path, 'utf8')).replace('    <div className="gap-10" />\n', '').replace('    <div className="madeup-ledger-class" />\n', ''));
  assert.ok(run(directory).findings.some(f => f.rule === 'ledger/stale'));
  run(directory, ['ledger', '--ratchet']);
  assert.equal((await ledger(directory)).find(e => e.authored === 'gap-10' && e.anchor === 'App').count, 1);
  assert.ok(!run(directory).findings.some(f => f.rule === 'ledger/stale'));
  run(directory, ['ledger', '--prune']);
  assert.ok(!(await ledger(directory)).some(e => e.kind === 'exception'));
});

test('rebase moves renamed file/function entries and prints every move; ambiguous moves retained', async t => {
  const directory = await copy(t);
  run(directory, ['baseline']);
  await rename(join(directory, 'src/App.tsx'), join(directory, 'src/Renamed.tsx'));
  await writeFile(join(directory, 'src/Renamed.tsx'), (await readFile(join(directory, 'src/Renamed.tsx'), 'utf8')).replace('function App()', 'function Renamed()'));
  run(directory, [], 1);
  const moves = run(directory, ['ledger', '--rebase']);
  assert.ok(moves.moves.length >= 5);
  assert.ok(moves.moves.some(m => m.from.endsWith('App.tsx#App') && m.to.endsWith('Renamed.tsx#Renamed')));
  assert.deepEqual(errors(run(directory)), []);
  const text = run(directory, ['ledger', '--rebase'], 0, false).stdout;
  assert.match(text, /Ledger has/);
  await rename(join(directory, 'src/Renamed.tsx'), join(directory, 'src/Again.tsx'));
  assert.match(run(directory, ['ledger', '--rebase'], 0, false).stdout, /Moved .*Renamed.tsx.* -> .*Again.tsx/);
  // Two identical target files make move ambiguous: no accidental acceptance.
  await rename(join(directory, 'src/Again.tsx'), join(directory, 'src/One.tsx'));
  await cp(join(directory, 'src/One.tsx'), join(directory, 'src/Two.tsx'));
  assert.equal(run(directory, ['ledger', '--rebase']).moves.length, 0);
  run(directory, [], 1);
});

test('base scopes files, reports every added ledger line, and debt growth fails', async t => {
  const directory = await copy(t);
  await history(directory);
  run(directory, ['baseline']);
  const branch = run(directory, ['check', '--base', 'HEAD'], 1);
  const growth = branch.findings.filter(f => f.rule === 'ledger/grew');
  assert.equal(growth.length, (await ledger(directory)).length);
  assert.ok(growth.every(f => f.sites[0].text.startsWith('{')));
  git(directory, ['add', '.plumb']);
  git(directory, ['commit', '-qm', 'accept debt']);
  // A pre-existing finding is not judged when an unrelated file changed.
  await rm(join(directory, '.plumb/ledger.jsonl'));
  // Removing debt is allowed; source unchanged means no scoped failures.
  await writeFile(join(directory, 'README.md'), 'branch notes\n');
  assert.equal(run(directory, ['check', '--base', 'HEAD']).ledger.new, 0);
  await writeFile(join(directory, 'src/New.tsx'), 'export const New = () => <div className="gap-10" />;');
  const scoped = run(directory, ['check', '--base', 'HEAD'], 1);
  assert.equal(errors(scoped).length, 1);
  assert.equal(scoped.ledger.new, 1);
  assert.ok(errors(scoped)[0].sites.some(s => s.file.endsWith('/src/New.tsx') && s.ledger.status === 'new'));
  assert.ok(errors(scoped)[0].sites.some(s => s.file.endsWith('/src/App.tsx')), 'unchanged sites remain in their fix group');
});

test('strict ledger blocks exceptions, decision changes and config growth vs HEAD; shrink allowed', async t => {
  const directory = await copy(t);
  run(directory, ['baseline']);
  await history(directory);
  assert.equal(run(directory, ['check', '--strict-ledger']).ledger.growth, 0);
  run(directory, ['accept', '--rule', 'existence/dead-class', '--site', 'src/App.tsx:8', '--why', 'branch exception']);
  const strict = run(directory, ['check', '--strict-ledger'], 1);
  assert.ok(errors(strict).some(f => f.rule === 'ledger/grew' && f.why.includes('exception')));
  assert.ok(!errors(run(directory, ['check', '--base', 'HEAD'])).length, 'reasoned exception growth is information outside strict mode');
  git(directory, ['restore', '.plumb/ledger.jsonl']);
  const config = join(directory, 'plumb.config.ts');
  await writeFile(config, (await readFile(config, 'utf8')).replace("css: 'src/styles.css',", "css: 'src/styles.css',\n  markers: ['branch-hook'],"));
  assert.ok(errors(run(directory, ['check', '--strict-ledger'], 1)).some(f => f.why.includes('Config grew')));
  git(directory, ['restore', 'plumb.config.ts']);
  const path = join(directory, 'src/App.tsx');
  await writeFile(path, (await readFile(path, 'utf8')).replaceAll('className="gap-10"', 'className="gap-12"'));
  run(directory, ['ledger', '--ratchet']);
  assert.equal(run(directory, ['check', '--strict-ledger']).ledger.growth, 0);
});

test('init creates inferred config and decisions; baseline/check works without overwriting config', async t => {
  const directory = await copy(t);
  await rm(join(directory, 'plumb.config.ts'));
  run(directory, ['init']);
  const config = await readFile(join(directory, 'plumb.config.ts'), 'utf8');
  assert.match(config, /"inferred": true/);
  assert.ok((await ledger(directory)).filter(e => e.kind === 'decision').every(e => e.inferred));
  run(directory, ['baseline']);
  run(directory);
  assert.match(run(directory, ['init'], 2).stderr, /Config already exists/);
  assert.equal(await readFile(join(directory, 'plumb.config.ts'), 'utf8'), config);
});

test('malformed ledgers and invalid command flags fail with actionable usage errors', async t => {
  const directory = await copy(t);
  run(directory, ['baseline']);
  const entries = await ledger(directory);
  await save(directory, [...entries, entries[0]]);
  assert.match(run(directory, [], 2).stderr, /Duplicate ledger key/);
  await writeFile(join(directory, '.plumb/ledger.jsonl'), '{broken\n');
  assert.match(run(directory, [], 2).stderr, /Invalid ledger JSON/);
  assert.match(run(directory, ['check', '--why', 'no'], 2).stderr, /--why requires/);
  await save(directory, entries);
  assert.match(run(directory, ['check', '--base=--not-a-ref'], 2).stderr, /Git comparison/);
  assert.match(run(directory, ['why', 'src/App.tsx:0'], 2).stderr, /one-based/);
});


test('empty baseline still refuses later debt growth; rebase cannot transfer fixed sites in a retained anchor', async t => {
  const directory = await copy(t);
  const path = join(directory, 'src/App.tsx');
  await writeFile(path, 'export function App() { return <div />; }\n');
  await writeFile(join(directory, 'src/styles.css'), '@import "tailwindcss"; @theme { --spacing: 1px; --spacing-step-small: 8px; --spacing-step-large: 12px; }');
  run(directory, ['baseline']);
  await writeFile(path, 'export function App() { return <div className="gap-10" />; }\n');
  assert.match(run(directory, ['baseline'], 2).stderr, /refuses debt growth/);
  run(directory, ['baseline', '--force']);
  await writeFile(path, 'export function App() { return <div />; }\nexport function New() { return <div className="gap-10" />; }\n');
  assert.equal(run(directory, ['ledger', '--rebase']).moves.length, 0);
  assert.equal(errors(run(directory, [], 1)).length, 1);
  // Inspection of an accepted ladder value includes its actual decision.
  await writeFile(path, 'export function App() { return <div className="gap-12" />; }\n');
  const why = run(directory, ['why', 'src/App.tsx:1']);
  assert.ok(why.decisions.some(d => d.name === '--spacing-step-large'));
});


test('first-run site keys are authored ledger identities that accept and show consume directly', async t => {
  const directory = await copy(t);
  const first = run(directory, [], 1);
  assert.ok(first.findings.every(f => f.sites.every(s => s.ledger.status === 'new' && f.ledgerKeys.includes(s.ledger.key) && s.ledger.key.includes('@') && s.ledger.key.includes('#'))));
  const finding = first.findings.find(f => f.rule === 'existence/dead-class');
  const key = finding.sites[0].ledger.key;
  run(directory, ['accept', key, '--why', 'intentional teaching example']);
  const checked = run(directory, [], 1);
  assert.equal(checked.ledger.exceptions, 1);
  assert.ok(!errors(checked).some(f => f.key === finding.key));
  const shown = run(directory, ['show', key]);
  assert.equal(shown.findings.length, 1);
  assert.ok(shown.ledger.some(line => line.entry.why === 'intentional teaching example'));
});
