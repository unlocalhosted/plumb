import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cp, mkdtemp, rm, writeFile, readFile, utimes, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { Session } from '../dist/session/index.js';
import { createHandler } from '../dist/session/server.js';
const repo = new URL('../', import.meta.url).pathname;

test('HTTP readings share a file view and refresh source, helper, theme and ledger evidence without watchers', { timeout: 30000 }, async t => {
  const root = await mkdtemp(join(repo, 'fixtures/.reading-cache-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true, filter: p => !p.includes('.plumb-cache') });
  const file = join(root, 'src/App.tsx'), helper = join(root, 'src/helper.ts');
  await writeFile(helper, "export const classes = 'gap-[13px]';");
  const source = `import './styles.css'; import { classes } from './helper';\nexport const App = () => <>\n<div className="gap-[13px]" />\n<div className="p-[13px]" />\n<div className={classes} />\n</>;`;
  await writeFile(file, source);
  await writeFile(join(root, 'src/Other.tsx'), 'export const Other = () => <div className="gap-[15px]" />;');
  const session = await Session.create({ root, watch: false });
  t.after(() => session.close());
  const server = createServer(createHandler(session));
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const request = async (method, params = {}) => {
    const r = await fetch(`http://127.0.0.1:${server.address().port}/__plumb/${method}?${new URLSearchParams(params)}`);
    const value = await r.json(); assert.equal(r.status, 200, JSON.stringify(value)); return value;
  };
  const reading = async line => Promise.all(['site', 'edits'].map(m => request(m, { file: 'src/App.tsx', line, column: 1 })));
  const original = await reading(3);
  assert.deepEqual(await reading(3), original);
  assert.deepEqual(original[0].findings[0].decisions.map(d => d.use.class), ['gap-s3', 'gap-s4']);
  assert.ok(original[1].edits.length);
  // A same-length save with restored mtime must still invalidate via ctime/hash.
  const before = await stat(file);
  await writeFile(file, source.replaceAll('13px', '15px')); await utimes(file, before.atime, before.mtime);
  const changed = await reading(3);
  assert.notEqual(changed[1].hash, original[1].hash);
  assert.equal(changed[0].declarations.find(d => d.prop === 'gap').resolved, '15px');
  assert.deepEqual(await reading(3), changed);
  const count = (await request('health')).work.localAnalyses;
  await reading(4);
  assert.equal((await request('health')).work.localAnalyses, count, 'other elements reuse the judged file');
  const trace = () => request('classes', { file: 'src/App.tsx', line: 5, column: 1, classes: 'gap-[17px]' });
  await writeFile(helper, "export const classes = 'gap-[17px]';");
  const traced = await trace();
  assert.equal(traced.classes[0].sites[0].file, helper);
  const fresh = await Session.create({ root, watch: false });
  try {
    const cold = await fresh.classes('src/App.tsx', 5, 1, 'gap-[17px]');
    assert.deepEqual({ ...traced, revision: 0 }, { ...cold, revision: 0 });
  } finally { await fresh.close(); }
  const css = join(root, 'src/styles.css');
  await writeFile(css, (await readFile(css, 'utf8')).replace('--spacing-s4: 16px', '--spacing-s4: 20px'));
  const themed = await reading(3);
  assert.deepEqual(themed[0].findings[0].decisions.map(d => d.resolved), ['12px', '20px']);
  // Record an allowance through the public CLI, then reconcile its ledger on read.
  const { spawnSync } = await import('node:child_process');
  for (const line of [3, 4]) {
    const accepted = spawnSync(process.execPath, [join(repo, 'dist/cli.js'), 'accept', '--root', root, '--rule', 'provenance/arbitrary', '--site', `src/App.tsx:${line}`, '--why', 'reading fixture'], { encoding: 'utf8' });
    assert.equal(accepted.status, 0, accepted.stderr);
  }
  const allowed = await reading(3);
  assert.equal(allowed[0].findings[0].sites[0].ledger.status, 'exception');
  assert.equal(allowed[0].findings[0].status, 'exception');
  assert.equal(allowed[0].findings[0].severity, 'info');
  assert.match(allowed[0].findings[0].accept, /src\/App\.tsx:3/);
  assert.ok((await session.report()).findings.some(f => f.sites.some(s => s.file.endsWith('/Other.tsx')) && f.status === 'new'), 'file projection leaves global ledger classification intact');
  assert.deepEqual(await reading(3), allowed);
  const raw = await Session.create({ root, watch: false, ledger: false });
  try {
    assert.deepEqual(await raw.site('src/App.tsx', 3, 1), allowed[0], 'site keeps ordinary ledger presentation when report inspection is raw');
    assert.ok((await raw.report()).findings.every(f => f.status === undefined));
  } finally { await raw.close(); }
});
