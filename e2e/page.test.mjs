// The whole page in one answer (POST page): for every stamped element, where its stamp resolves and the reading
// there, the same answer GET site and GET classes give, cached by the file's content so a second page costs no
// analysis and a changed file is never stale. Real server, real HTTP.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../dist/session/server.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
const source = `import './styles.css';
const cn = (...parts) => parts.filter(Boolean).join(' ');
export const Card = (props) => <div {...props} />;
export const App = () => <>
  <p id="plain" className="p-[9px]">x</p>
  <Card id="passed" className={cn('gap-[13px]')} />
  <ul>{[1, 2, 3].map(n => <li key={n} id={'row-' + n} className="m-[7px]">{n}</li>)}</ul>
</>;
`;
const hash12 = text => createHash('sha256').update(text).digest('hex').slice(0, 12);
async function project(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.page-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/messages'), root, { recursive: true });
  await writeFile(join(root, 'src/App.tsx'), source);
  const server = await serve({ root, watch: false }); t.after(() => server.close());
  const base = `http://127.0.0.1:${server.info.port}`;
  const call = async (method, params, verb = 'GET') => {
    const url = new URL('/__plumb/' + method, base);
    if (verb === 'GET') url.search = new URLSearchParams(params);
    const response = await fetch(url, { method: verb, headers: { 'x-plumb-token': server.info.token, 'Content-Type': 'application/json' }, ...(verb === 'POST' ? { body: JSON.stringify(params) } : {}) });
    return { status: response.status, body: await response.json() };
  };
  const stampOf = async (id, tag) => {
    const text = await readFile(join(root, 'src/App.tsx'), 'utf8'), lines = text.split('\n');
    const line = lines.findIndex(l => l.includes(`id="${id}"`) || l.includes(`id={'${id}`) || l.includes(id)) + 1, column = lines[line - 1].indexOf(`<${tag}`) + 1;
    return { stamp: `src/App.tsx:${line}:${column}#${hash12(text)}`, line, column };
  };
  return { root, call, stampOf };
}

test('page answers every stamped element at once, the same as site and classes, cached by file content until the file changes', { timeout: 60000 }, async (t) => {
  const api = await project(t);
  const plain = await api.stampOf('plain', 'p'), passed = await api.stampOf('export const Card', 'div'), row = await api.stampOf('row-', 'li');
  const items = [
    { stamp: plain.stamp, tag: 'p' },
    { stamp: passed.stamp, tag: 'div', classes: 'gap-[13px]' },
    { stamp: row.stamp, tag: 'li' }, { stamp: row.stamp, tag: 'li' }, { stamp: row.stamp, tag: 'li' },
    { stamp: 'src/App.tsx:1:1#000000000000', tag: 'div' },
  ];
  const first = await api.call('page', { items }, 'POST');
  assert.equal(first.status, 200, JSON.stringify(first.body));
  const answers = first.body.items;
  assert.equal(answers.length, items.length);
  // a plain element: the site reading, as GET site gives it
  const site = (await api.call('site', { file: 'src/App.tsx', line: plain.line, column: plain.column })).body;
  assert.deepEqual([answers[0].status, answers[0].file, answers[0].line, answers[0].column, answers[0].cached], ['ready', 'src/App.tsx', plain.line, plain.column, undefined]);
  assert.deepEqual(answers[0].site.findings.map(f => f.rule), site.findings.map(f => f.rule));
  assert.ok(answers[0].site.findings.some(f => f.sites.some(s => s.text === 'p-[9px]')));
  // a pass-through component's host declares nothing: the classes it renders are traced to where they are written
  assert.deepEqual([answers[1].status, answers[1].line, answers[1].site.declarations], ['ready', passed.line, []]);
  const traced = (await api.call('classes', { file: 'src/App.tsx', line: passed.line, column: passed.column, classes: 'gap-[13px]' })).body;
  assert.deepEqual(answers[1].traced?.classes.map(c => c.token), traced.classes.map(c => c.token));
  // three rows with one stamp: one reading, given three times
  assert.deepEqual(answers.slice(2, 5).map(a => a.site.findings.length), [answers[2].site.findings.length, answers[2].site.findings.length, answers[2].site.findings.length]);
  assert.ok(answers[2].site.findings.some(f => f.sites.some(s => s.text === 'm-[7px]')));
  // a stamp whose hash is not the file's: unplaced, never a guess
  assert.deepEqual(answers[5], { stamp: 'src/App.tsx:1:1#000000000000', tag: 'div', status: 'unplaced' });
  // the same page again: served from the cache, identical
  const second = await api.call('page', { items }, 'POST');
  assert.deepEqual(second.body.items.map(a => a.cached), [true, true, true, true, true, undefined]);
  assert.deepEqual(second.body.items.map(({ cached, ...rest }) => rest), first.body.items.map(({ cached, ...rest }) => rest));
  // the file changes: the old stamps no longer match it, the new ones are read afresh
  const props = (await api.call('props', { file: 'src/App.tsx', line: plain.line, column: plain.column })).body;
  const swapped = await api.call('swap', { file: 'src/App.tsx', hash: props.hash, line: plain.line, column: plain.column, from: 'p-[9px]', to: 'p-small' }, 'POST');
  assert.equal(swapped.status, 200, JSON.stringify(swapped.body));
  const stale = await api.call('page', { items: [items[0]] }, 'POST');
  assert.equal(stale.body.items[0].status, 'unplaced');
  const now = await api.stampOf('plain', 'p');
  const third = await api.call('page', { items: [{ stamp: now.stamp, tag: 'p' }] }, 'POST');
  assert.equal(third.body.items[0].status, 'ready');
  assert.equal(third.body.items[0].cached, undefined);
  assert.ok(!third.body.items[0].site.findings.some(f => f.sites.some(s => s.text === 'p-[9px]')));
  // a page that is not a list of stamps is refused
  assert.equal((await api.call('page', { items: [{ stamp: 'nope', tag: 'p' }] }, 'POST')).status, 400);
});
