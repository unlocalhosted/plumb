// A host Session whose coordinator thread dies after it was ready must come back: the dev server keeps one Session for
// its whole life (the Vite registry, the Next handler), so a Session that stays failed means every request fails until
// the dev server is killed.
import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Session } from '../dist/session/index.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
const within = (promise, ms, what) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`${what} never settled`)), ms).unref())]);
const sleep = ms => new Promise(done => setTimeout(done, ms));

async function project(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.session-crash-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true, filter: path => !path.split('/').includes('.plumb-cache') });
  const file = join(root, 'src/App.tsx');
  await writeFile(file, 'export const App = () => <div className="py-[10px] gap-[13px]" />;\n');
  await mkdir(join(root, '.plumber'), { recursive: true });
  await writeFile(join(root, '.plumber/ledger.jsonl'), '');
  const session = await Session.create({ root, watch: false });
  t.after(() => session.close());
  return { session, file };
}
/** The coordinator thread dies the way a crash ends it: it is gone, nothing in the project changed. */
const crash = session => (session.life?.worker ?? session.worker).terminate();

test('a read after the coordinator crashed starts a new one and answers', async t => {
  const { session, file } = await project(t);
  const before = await session.edits(file, 1);
  await crash(session);
  const after = await within(session.edits(file, 1), 20000, 'edits() after the coordinator died');
  assert.deepEqual(after.edits.map(edit => edit.id), before.edits.map(edit => edit.id));
  assert.equal((await session.health()).status, 'ready');
});

test('asking for health after a crash is enough to bring the Session back', async t => {
  // the overlay stops sending reads once it hears "failed"; it only keeps asking for health
  const { session, file } = await project(t);
  await session.edits(file, 1);
  await crash(session);
  let status = '';
  for (const start = Date.now(); Date.now() - start < 20000 && status !== 'ready'; await sleep(100)) status = (await session.health()).status;
  assert.equal(status, 'ready');
});

test('a call in flight when the coordinator dies is rejected, and events still arrive after the restart', async t => {
  const { session, file } = await project(t);
  const changes = [];
  session.on('change', () => changes.push(1));
  const inFlight = session.report();
  await crash(session);
  await assert.rejects(within(inFlight, 5000, 'the call in flight'));
  await session.edits(file, 1);
  await writeFile(file, 'export const App = () => <div className="py-[10px] gap-[14px]" />;\n');
  await session.refresh();
  assert.ok(changes.length > 0, 'no change event after the restart');
});

test('a closed Session stays closed', async t => {
  const { session } = await project(t);
  await session.close();
  await assert.rejects(session.report(), /closed/);
  await assert.rejects(session.health(), /closed/);
});
