// The record-file lock (src/write/lock.ts) between real processes: the ledger and the change log are shared by every
// plumber process on a project, so two of them must never be inside the lock of one file at once. Each child takes
// the lock, writes `in`, works, writes `out`; the log must read in, out, in, out.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const lockModule = fileURLToPath(new URL('../dist/write/lock.js', import.meta.url));
const child = `
  import { appendFileSync } from 'node:fs';
  import { setTimeout as sleep } from 'node:timers/promises';
  const [module, record, log, id, form, work, stale, delay] = process.argv.slice(1);
  const { lock, lockSync } = await import(module);
  const say = word => appendFileSync(log, word + ' ' + id + '\\n');
  const options = { stale: +stale, wait: 5000 };
  await sleep(+delay);
  if (form === 'sync') lockSync(record, () => { say('in'); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, +work); say('out'); }, options);
  else await lock(record, async () => { say('in'); await sleep(+work); say('out'); }, options);
`;

async function scratch(t) {
  const directory = await mkdtemp(join(tmpdir(), 'plumb-lock-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return { record: join(directory, 'record.jsonl'), log: join(directory, 'log') };
}
function run({ record, log }, id, { form = 'async', work, stale, delay = 0 }) {
  return new Promise((resolve, reject) => {
    const process = spawn(globalThis.process.execPath, ['--input-type=module', '-e', child, lockModule, record, log, id, form, String(work), String(stale), String(delay)], { stdio: ['ignore', 'ignore', 'pipe'] });
    let errors = '';
    process.stderr.on('data', chunk => { errors += chunk; });
    process.once('error', reject);
    process.once('exit', code => (code === 0 ? resolve() : reject(new Error(`${id} exited ${code}: ${errors}`))));
  });
}
/** The log, and the ids that were inside the lock together (none, when the lock held). */
async function together(log) {
  const lines = (await readFile(log, 'utf8')).trim().split('\n').map(line => line.split(' '));
  const inside = new Set(), overlaps = [];
  for (const [word, id] of lines) {
    if (word === 'out') { inside.delete(id); continue; }
    if (inside.size) overlaps.push([...inside, id].join('+'));
    inside.add(id);
  }
  return { lines: lines.map(line => line.join(' ')), overlaps };
}

test('work that takes longer than the stale time keeps its lock', async t => {
  const files = await scratch(t);
  // `a` works for four stale times; `b` arrives while it works and must wait for it to finish
  await Promise.all([run(files, 'a', { work: 1200, stale: 300 }), run(files, 'b', { work: 50, stale: 300, delay: 250 })]);
  const { lines, overlaps } = await together(files.log);
  assert.deepEqual(overlaps, [], lines.join(', '));
  assert.deepEqual(lines, ['in a', 'out a', 'in b', 'out b']);
});

test('a holder whose lock was taken over leaves the new holder\'s lock alone', async t => {
  const files = await scratch(t);
  // `a` blocks its whole process (no heartbeat can run), so `b` rightly takes the lock over. `a` then finishes while
  // `b` still works: its release must not let `c` in beside `b`.
  await Promise.all([
    run(files, 'a', { form: 'sync', work: 900, stale: 300 }),
    run(files, 'b', { work: 1200, stale: 300, delay: 250 }),
    run(files, 'c', { work: 50, stale: 300, delay: 1100 }),
  ]);
  const { lines, overlaps } = await together(files.log);
  assert.deepEqual(overlaps.filter(pair => pair.includes('c')), [], lines.join(', '));
  assert.ok(lines.indexOf('in c') > lines.indexOf('out b'), lines.join(', '));
});

test('a lock left by a process that died is taken over by one waiter at a time', async t => {
  const files = await scratch(t);
  const old = new Date(Date.now() - 60_000);
  await writeFile(`${files.record}.lock`, '1 dead\n');
  await utimes(`${files.record}.lock`, old, old);
  await Promise.all(['a', 'b', 'c', 'd', 'e', 'f'].map(id => run(files, id, { work: 60, stale: 300 })));
  const { lines, overlaps } = await together(files.log);
  assert.deepEqual(overlaps, [], lines.join(', '));
  assert.equal(lines.length, 12);
});
