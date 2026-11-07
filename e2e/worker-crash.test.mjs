// An analysis worker that dies after the Session is ready must be replaced: the next read settles with an answer.
import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Session as EngineSession } from '../dist/session/engine.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
const within = (promise, ms, what) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`${what} never settled`)), ms).unref())]);

test('a read after the analysis worker crashed restarts it and answers', async t => {
  const root = await mkdtemp(join(repo, 'fixtures/.worker-crash-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true, filter: path => !path.split('/').includes('.plumb-cache') });
  const file = join(root, 'src/App.tsx');
  await writeFile(file, 'export const App = () => <div className="py-[10px] gap-[13px]" />;\n');
  await mkdir(join(root, '.plumber'), { recursive: true });
  await writeFile(join(root, '.plumber/ledger.jsonl'), '');
  const session = await EngineSession.create({ root, watch: false });
  t.after(() => session.close());
  const before = await session.edits(file, 1);
  // The thread dies the way a crash ends it: the worker is gone, nothing in the project changed.
  await session.worker.terminate();
  const after = await within(session.edits(file, 1), 15000, 'edits() after the worker died');
  assert.deepEqual(after.edits.map(edit => edit.id), before.edits.map(edit => edit.id));
  assert.equal((await session.health()).status, 'ready');
});
