// The analysis the server keeps for its next start, and the check each start makes of it
// (docs/briefs/server-warm-start.md, layers 1 and 2). Seen as a person or the next layer would: start the server on a
// project, look at what it left in the project's cache, start it again, read what it says about what it kept.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, rm, writeFile, readFile, truncate, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { Session } from '../dist/session/index.js';
import { loadReadings, readingOf } from '../dist/session/kept.js';
const repo = new URL('../', import.meta.url).pathname;

const SOURCE = `import './styles.css'; import { classes } from './helper';
export const App = () => <>
<div className="gap-[13px]" />
<div className="p-[13px]" />
<div className={classes} />
</>;`;

async function project(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.kept-check-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true, filter: p => !p.includes('.plumb-cache') });
  await writeFile(join(root, 'src/helper.ts'), "export const classes = 'gap-[13px]';");
  await writeFile(join(root, 'src/App.tsx'), SOURCE);
  await writeFile(join(root, 'src/Other.tsx'), 'export const Other = () => <div className="gap-[15px]" />;');
  return root;
}

/** One start of the server: what its check said, what it kept, and (when asked) what it answers. Closed before returning. */
async function start(root, { ask, options = {} } = {}) {
  const session = await Session.create({ root, watch: false, keepAfter: 50, ...options });
  try {
    let health;
    for (let i = 0; i < 300; i++) {
      health = await session.health();
      if (options.keep === false) break;
      if (health.kept && (health.warm?.receipt !== 'valid' || health.warm.matched !== undefined)) break;
      await new Promise(r => setTimeout(r, 50));
    }
    return { warm: health.warm, kept: health.kept, answers: ask ? await ask(session) : undefined };
  } finally { await session.close(); }
}
const log = async root => (await readFile(join(root, '.plumber/cache/kept/warm.jsonl'), 'utf8')).split('\n').filter(Boolean).map(line => JSON.parse(line));
// the kept analysis holds no ledger marks: those are added when an answer is given
const bare = value => JSON.parse(JSON.stringify(value, (key, item) => key === 'ledger' || key === 'status' || key === 'ledgerKeys' || key === 'severity' ? undefined : item));

test('a start keeps its analysis, and what it kept says what the server answers', { timeout: 60000 }, async t => {
  const root = await project(t), files = ['src/App.tsx', 'src/Other.tsx', 'src/helper.ts', 'src/styles.css'];
  const first = await start(root, { ask: async session => (await session.places(files)).files });
  assert.equal(first.warm.receipt, 'none', 'nothing was kept before the first start');
  assert.ok(first.kept.files > 0 && first.kept.bytes > 0);
  const table = loadReadings(await readFile(join(first.kept.directory, 'readings.v8')));
  let compared = 0;
  for (const answer of first.answers) {
    const kept = readingOf(table, answer.file);
    if (!kept) { assert.equal(answer.findings.length + answer.declarations.length, 0, `${answer.file} has a reading the kept analysis lacks`); continue; }
    assert.deepEqual(bare({ findings: kept.findings, declarations: kept.declarations }), bare({ findings: answer.findings, declarations: answer.declarations }), answer.file);
    compared++;
  }
  assert.ok(compared >= 2, 'the files with something to say were compared');
  // the receipt speaks for the files, the folders and the imports the analysis went by
  const receipt = JSON.parse(await readFile(join(first.kept.directory, 'receipt.json'), 'utf8'));
  assert.equal(receipt.table, first.kept.hash);
  assert.ok(receipt.files.some(([file]) => file === join(root, 'src/App.tsx')));
  assert.ok(receipt.directories.some(([directory]) => directory === join(root, 'src')));
  assert.ok(receipt.resolutions.some(([, answers]) => answers.some(([key, target]) => key === `${join(root, 'src/App.tsx')}\0./helper` && target === join(root, 'src/helper.ts'))), 'the import of ./helper is recorded with the file it found');
});

test('a start with nothing changed finds its kept analysis valid and the same as a fresh one', { timeout: 60000 }, async t => {
  const root = await project(t);
  await start(root);
  for (const again of [await start(root), await start(root)]) {
    assert.equal(again.warm.receipt, 'valid');
    assert.equal(again.warm.matched, true);
  }
  assert.deepEqual((await log(root)).map(line => [line.receipt, line.matched]), [['none', undefined], ['valid', true], ['valid', true]], 'one line per start');
});

test('a start after a change says what changed and trusts nothing it kept', { timeout: 90000 }, async t => {
  const root = await project(t);
  await start(root);
  // a file edited
  await writeFile(join(root, 'src/Other.tsx'), 'export const Other = () => <div className="gap-[17px]" />;');
  const edited = await start(root);
  assert.equal(edited.warm.receipt, 'changed');
  assert.equal(edited.warm.matched, undefined, 'a kept analysis that is not valid is never compared');
  assert.deepEqual(edited.warm.changed.sample, ['changed: src/Other.tsx']);
  assert.equal((await start(root)).warm.matched, true, 'the start after it is valid again');
  // a file added
  await writeFile(join(root, 'src/New.tsx'), 'export const New = () => <div className="p-[9px]" />;');
  const added = await start(root);
  assert.equal(added.warm.receipt, 'changed');
  assert.ok(added.warm.changed.sample.includes('new: src/New.tsx') && added.warm.changed.sample.includes('listing: src'), JSON.stringify(added.warm.changed));
  assert.equal((await start(root)).warm.matched, true);
  // a file removed
  await rm(join(root, 'src/New.tsx'));
  const removed = await start(root);
  assert.equal(removed.warm.receipt, 'changed');
  assert.ok(removed.warm.changed.sample.includes('gone: src/New.tsx'), JSON.stringify(removed.warm.changed));
});

test('a start notices an import that would now find another file', { timeout: 60000 }, async t => {
  const root = await project(t);
  await start(root);
  // ./helper found helper.ts; a helper.tsx beside it is found first, and no file read before has changed
  await writeFile(join(root, 'src/helper.tsx'), "export const classes = 'gap-[19px]';");
  const shadowed = await start(root);
  assert.equal(shadowed.warm.receipt, 'changed');
  assert.ok(shadowed.warm.changed.imports >= 1, JSON.stringify(shadowed.warm.changed));
  assert.ok(shadowed.warm.changed.sample.includes('import: ./helper in src/App.tsx'), JSON.stringify(shadowed.warm.changed));
  assert.equal((await start(root)).warm.matched, true, 'the analysis kept after it goes by the new file');
});

test('a kept analysis that is damaged, or was never asked for, is not used', { timeout: 60000 }, async t => {
  const root = await project(t);
  const first = await start(root), table = join(first.kept.directory, 'readings.v8');
  await truncate(table, Math.floor((await stat(table)).size / 2));
  const damaged = await start(root);
  assert.equal(damaged.warm.receipt, 'damaged');
  assert.equal((await start(root)).warm.matched, true, 'a damaged one is replaced by the next start');
  // switched off: nothing checked, nothing kept, nothing written
  const lines = (await log(root)).length, before = (await stat(table)).mtimeMs;
  const off = await start(root, { options: { keep: false } });
  assert.equal(off.warm, undefined); assert.equal(off.kept, undefined);
  assert.equal((await log(root)).length, lines); assert.equal((await stat(table)).mtimeMs, before);
});

test('plumber doctor --verbose says how the start-up check is going', { timeout: 90000 }, async t => {
  const root = await project(t);
  const doctor = () => spawnSync(process.execPath, [join(repo, 'dist/cli.js'), 'doctor', '--verbose', '--root', root], { encoding: 'utf8', env: { ...process.env, NO_COLOR: '1', COLUMNS: '200' } }).stdout.split('\n').find(line => line.includes('Start-up:')) ?? '';
  assert.match(doctor(), /ok\s+Start-up:\s+no start checked yet/);
  await start(root); await start(root);
  assert.match(doctor(), /ok\s+Start-up:\s+2 starts, 1 compared, 0 differed/);
  // a start whose fresh analysis differed from the kept one is counted, and never fails doctor on its own
  await writeFile(join(root, '.plumber/cache/kept/warm.jsonl'), JSON.stringify({ at: '2026-11-13T10:00:00.000Z', receipt: 'valid', matched: false }) + '\n', { flag: 'a' });
  assert.match(doctor(), /fix\s+Start-up:\s+3 starts, 2 compared, 1 differed\s+Report it: \.plumber\/cache\/kept\/warm\.jsonl/);
});
