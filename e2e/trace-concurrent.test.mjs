// Writes in flight at the same time keep their own trace: each change is recorded under the group of the write that
// made it, and an undo in progress marks only its own inverse as an undo. The host Session feeds the engine one write at
// a time; a caller of the engine itself (a library user, a cohort) does not, and must not see its changes cross groups.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Session as EngineSession } from '../dist/session/engine.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
const hash = text => createHash('sha256').update(text).digest('hex');
const source = name => `import './styles.css';\nexport const ${name} = () => <>\n  <div className="p-[13px]" />\n  <div className="mt-[10px]" />\n</>;\n`;

async function engine(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.trace-concurrent-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true, filter: path => !path.split('/').includes('.plumb-cache') });
  await writeFile(join(root, 'src/App.tsx'), source('App'));
  await writeFile(join(root, 'src/Other.tsx'), source('Other'));
  await writeFile(join(root, 'src/Third.tsx'), source('Third'));
  const session = await EngineSession.create({ root, watch: false });
  t.after(() => session.close());
  const swap = async (file, line, from, to, group) => session.traced({ group }, 'swaps', [{ file, hash: hash(await readFile(join(root, file), 'utf8')), edits: [{ line, column: 3, from, to }] }]);
  return { session, swap };
}

test('two traced writes started together each record their change under their own group', async t => {
  const { session, swap } = await engine(t);
  await Promise.all([swap('src/App.tsx', 3, 'p-[13px]', 'p-3', 'first'), swap('src/Other.tsx', 3, 'p-[13px]', 'p-3', 'second')]);
  const { changes } = await session.trace();
  assert.deepEqual(changes.map(c => [c.file, c.group]).sort(), [['src/App.tsx', 'first'], ['src/Other.tsx', 'second']]);
});

test('a write made while an undo is in progress is not recorded as part of that undo', async t => {
  const { session, swap } = await engine(t);
  // one step over two files, so its undo is two guarded writes with room for another write between them
  await swap('src/App.tsx', 3, 'p-[13px]', 'p-3', 'made');
  await swap('src/Other.tsx', 3, 'p-[13px]', 'p-3', 'made');
  await Promise.all([session.undoGroup('made'), swap('src/Third.tsx', 4, 'mt-[10px]', 'mt-2.5', 'beside')]);
  const { changes } = await session.trace();
  const beside = changes.filter(c => c.file === 'src/Third.tsx');
  assert.deepEqual(beside.map(c => [c.group, c.state, c.undoes ?? null]), [['beside', 'live', null]], JSON.stringify(changes));
  assert.deepEqual((await session.trace('made')).changes.map(c => c.state).sort(), ['undone', 'undone']);
});
