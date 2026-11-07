// The trace log two engines share (docs/invariants/api-contract.md §3; boundaries.md B1, B2, B3): a Vite dev server and
// `plumber serve` on one project both write .plumber/cache/changes.jsonl. Ids are unique across processes, each engine
// sees the other's appends, undoing a group takes back only that group, a line that is not a record is skipped and
// counted (never thrown on) and survives a rewrite, and an undo handle from a closed engine names nothing in a new one.
// Before this, each engine counted ids from a copy it read once (both minted c1/g1), rewrote the file from that copy, and
// a line that was not a record made every trace call throw.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appendFile, cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { Session as Engine } from '../dist/session/engine.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
const APP = 'src/App.tsx';
const source = `import './styles.css';
export const App = () => <>
  <p id="one" className="px-[13px]">a</p><p id="two" className="px-[13px]">b</p>
  <div id="three" className="mt-[13px]" />
</>;
`;
const hash = text => createHash('sha256').update(text).digest('hex');
async function project(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.two-engines-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/messages'), root, { recursive: true });
  await writeFile(join(root, APP), source);
  const engine = async () => { const session = await Engine.create({ root, watch: false }); t.after(() => session.close()); return session; };
  const text = () => readFile(join(root, APP), 'utf8');
  const swap = async (session, from, to, line = 3, column = 3) => {
    const result = await session.traced(undefined, 'swaps', [{ file: APP, hash: hash(await text()), edits: [{ line, column, from, to }] }]);
    assert.deepEqual(result.refused ?? [], []);
    return result;
  };
  return { root, engine, text, swap, log: join(root, '.plumber/cache/changes.jsonl') };
}

test('two engines on one project mint different ids, see each other\'s changes, and undo only their own group', async t => {
  const { engine, text, swap } = await project(t);
  const a = await engine(), b = await engine();
  // both have read the (empty) log before either writes: a per-process counter would give both the same ids
  assert.deepEqual((await a.trace()).changes, []); assert.deepEqual((await b.trace()).changes, []);
  const fromA = await swap(a, 'px-[13px]', 'px-2');
  const fromB = await swap(b, 'mt-[13px]', 'mt-2', 4, 3);
  assert.notEqual(fromA.trace.group, fromB.trace.group, 'two engines never mint the same group');
  const seenByB = (await b.trace()).changes;
  assert.equal(seenByB.length, 2, `b sees a's change too: ${JSON.stringify(seenByB.map(c => c.label))}`);
  assert.equal(new Set(seenByB.map(c => c.id)).size, 2, 'two different change ids');
  assert.ok(seenByB.every(c => /^c[0-9a-z]{6,}/.test(c.id)), 'change ids keep their c prefix');
  // b takes back a's group: only a's change goes, b's stays
  await b.undoGroup(fromA.trace.group);
  const now = await text();
  assert.ok(now.includes('px-[13px]') && now.includes('mt-2'), now);
  const after = (await a.trace()).changes;
  assert.equal(after.find(c => c.group === fromA.trace.group)?.state, 'undone', 'a reads b\'s undo of its change');
  assert.equal(after.find(c => c.group === fromB.trace.group)?.state, 'live');
});

test('a line that is not a record is skipped and counted, never thrown on, and survives a rewrite', async t => {
  const { engine, swap, log } = await project(t);
  const a = await engine();
  const written = await swap(a, 'px-[13px]', 'px-2');
  await appendFile(log, 'null\n{}\n{"id":"c9","group":"g9"}\n{"v":2,"id":"cfuture","group":"g1","write":"w1","file":"x","line":1,"column":1,"from":"","to":"","prefix":"","suffix":"","label":"","at":"now"}\nnot json\n');
  const trace = await a.trace();
  assert.equal(trace.skipped, 5, 'five lines are not records this build can read');
  assert.equal(trace.changes.length, 1);
  // a file-level undo rewrites the log (drops the write's records): the skipped lines are kept as they are
  await a.undo(written.undo.id);
  const lines = (await readFile(log, 'utf8')).split('\n').filter(Boolean);
  assert.deepEqual(lines, ['null', '{}', '{"id":"c9","group":"g9"}', '{"v":2,"id":"cfuture","group":"g1","write":"w1","file":"x","line":1,"column":1,"from":"","to":"","prefix":"","suffix":"","label":"","at":"now"}', 'not json']);
  assert.equal((await a.trace()).skipped, 5);
  assert.equal((await a.trace()).changes.length, 0);
});

test('an undo handle from an engine that closed names nothing in the next one', async t => {
  const { engine, swap, text } = await project(t);
  const a = await engine();
  const first = await swap(a, 'px-[13px]', 'px-2');
  await a.close();
  const c = await engine();
  const second = await swap(c, 'mt-[13px]', 'mt-2', 4, 3);
  assert.notEqual(first.undo.id, second.undo.id, 'write ids never restart at w1');
  await assert.rejects(c.undo(first.undo.id), error => error.code === 'not-found' && /not in the history/.test(error.message));
  assert.ok((await text()).includes('mt-2'), 'the new engine\'s write stands');
});
