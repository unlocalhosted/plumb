// Two apply-alls in flight at once are two transactions, one after the other. The Vite host holds hot updates from a
// transaction's `start` to its `end` (hosts/vite.ts): two that overlap would end each other's hold, and the page would
// reload in the middle of a write. The host Session feeds the engine one call at a time; a caller of the engine itself
// does not.
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

test('two apply-alls started together run as two transactions, one after the other', async t => {
  const root = await mkdtemp(join(repo, 'fixtures/.apply-all-overlap-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true, filter: path => !path.split('/').includes('.plumb-cache') });
  await writeFile(join(root, 'src/App.tsx'), source('App'));
  await writeFile(join(root, 'src/Other.tsx'), source('Other'));
  const session = await EngineSession.create({ root, watch: false });
  t.after(() => session.close());
  const phases = [];
  session.on('transaction', event => phases.push(event.phase));
  const apply = async file => session.applyAll({ swaps: [{ file, hash: hash(await readFile(join(root, file), 'utf8')), edits: [{ line: 3, column: 3, from: 'p-[13px]', to: 'p-3' }, { line: 4, column: 3, from: 'mt-[10px]', to: 'mt-2.5' }] }] });

  const [first, second] = await Promise.all([apply('src/App.tsx'), apply('src/Other.tsx')]);

  assert.deepEqual([first, second].map(r => r.results.swaps.map(s => [s.file, s.ok])), [[['src/App.tsx', true]], [['src/Other.tsx', true]]]);
  // start, its progress, end; then the same again: never a start inside another transaction
  let open = 0;
  for (const phase of phases) {
    if (phase === 'start') { assert.equal(open, 0, phases.join(' ')); open++; }
    else if (phase === 'end') open--;
    else assert.equal(open, 1, phases.join(' '));
  }
  assert.equal(phases.filter(phase => phase === 'start').length, 2, phases.join(' '));
  // each transaction reports that it is alive while it writes; the second is not silenced by the first one's end
  const [one, two] = phases.join(' ').split('end').map(part => part.trim().split(' '));
  assert.ok(one.includes('progress') && two.includes('progress'), phases.join(' '));
});
