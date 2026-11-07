// The ledger two writers and two builds share (docs/invariants/api-contract.md §3; boundaries.md B12): a line this build
// cannot read (a newer build's entry, a merge conflict's marker) is skipped, counted in the report and kept verbatim across
// this build's writes; and two engines accepting at once both land their entries. Before this, one unreadable line made
// every read throw (the session failed to start), and the last of two read-modify-writes won.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Session as Engine } from '../dist/session/engine.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
const cli = join(repo, 'dist/cli.js');
function run(directory, args) {
  const result = spawnSync(process.execPath, [cli, '--root', directory, ...args, '--json'], { encoding: 'utf8', timeout: 20_000 });
  assert.ifError(result.error);
  // 0 or 1 is a report (clean, or with findings); 2 is a refusal, which a line this build cannot read must never cause
  assert.ok([0, 1].includes(result.status), `exit ${result.status}: ${(result.stderr || result.stdout).slice(0, 300)}`);
  return result;
}
async function project(t) {
  const directory = await mkdtemp(join(repo, 'fixtures/.ledger-shared-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/ledger'), directory, { recursive: true });
  return directory;
}
const ledgerFile = directory => join(directory, '.plumber/ledger.jsonl');
const lines = async directory => (await readFile(ledgerFile(directory), 'utf8')).split('\n').filter(Boolean);

test('a line this build cannot read is skipped, said in the report, and kept verbatim across a write', async t => {
  const directory = await project(t);
  run(directory, ['baseline']);
  const before = await lines(directory);
  const foreign = '{"v":2,"key":"future:thing","kind":"waiver","shape":{"new":true}}';
  const marker = '<<<<<<< HEAD';
  await writeFile(ledgerFile(directory), [foreign, marker, ...before].join('\n') + '\n');
  const checked = JSON.parse(run(directory, ['check']).stdout);
  assert.match(checked.ledger.message, /2 ledger lines could not be read and are kept as they are/);
  assert.ok(checked.notes.some(note => /ledger\.jsonl:1 skipped: written by a newer React Plumber \(v2\)/.test(note)), JSON.stringify(checked.notes));
  assert.ok(checked.notes.some(note => /ledger\.jsonl:2 skipped: not JSON/.test(note)), JSON.stringify(checked.notes));
  const entry = checked.findings.find(f => f.status === 'debt' || f.sites.some(s => s.ledger?.status === 'debt'));
  assert.ok(entry, 'the readable entries still count');
  // this build writes: the lines it could not read are still there, first, and every entry it wrote carries v: 1
  const finding = checked.findings.find(f => f.sites.some(s => s.ledger?.status === 'new')) ?? checked.findings[0];
  run(directory, ['accept', finding.sites[0].ledger.key, '--why', 'kept for the shared-ledger test']);
  const after = await lines(directory);
  assert.deepEqual(after.slice(0, 2), [foreign, marker]);
  assert.ok(after.slice(2).every(line => JSON.parse(line).v === 1), after.slice(2, 4).join('\n'));
  assert.ok(after.slice(2).some(line => JSON.parse(line).key === finding.sites[0].ledger.key && JSON.parse(line).kind === 'exception'));
});

test('two engines accepting at once both land their entries', async t => {
  const directory = await project(t);
  run(directory, ['baseline']);
  const a = await Engine.create({ root: directory, watch: false }); t.after(() => a.close());
  const b = await Engine.create({ root: directory, watch: false }); t.after(() => b.close());
  const report = await a.report();
  const candidates = report.findings.filter(f => f.sites.length && f.sites.every(s => s.ledger?.status === 'debt' || s.ledger?.status === 'new'));
  const [one, two] = [...new Map(candidates.map(f => [f.rule + f.sites[0].text, f])).values()];
  assert.ok(one && two, `two findings to accept: ${candidates.length}`);
  const site = f => f.sites.map(s => ({ file: relative(directory, s.file), line: s.line, column: s.column, text: s.text }));
  await b.report();
  const [fromA, fromB] = await Promise.all([a.accept({ rule: one.rule, sites: site(one), why: 'engine a' }), b.accept({ rule: two.rule, sites: site(two), why: 'engine b' })]);
  assert.ok(fromA.accepted >= 1 && fromB.accepted >= 1);
  const entries = (await lines(directory)).map(line => JSON.parse(line));
  assert.ok(entries.some(e => e.kind === 'exception' && e.why === 'engine a'), 'a\'s entry landed');
  assert.ok(entries.some(e => e.kind === 'exception' && e.why === 'engine b'), 'b\'s entry landed');
});
