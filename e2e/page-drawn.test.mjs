// A page is sent what it draws (docs/briefs/engine-scaling.md). On a 16,000-element page the server sent 811 MB,
// 98% of it two fields nothing on the page draws: every finding's edits (each place in the project the same change
// could be made, with its file path) and its ledger keys, once per element and again inside every class trace.
// They are left out of the answers a page is drawn from, and still come when a fix asks for them.
// And "what is this element in the source" went one request per element, each indexing its file again: it rides the
// batch now, and a file's index is kept only while its text is the same. Real server, real HTTP.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
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
  const root = await mkdtemp(join(repo, 'fixtures/.page-drawn-'));
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
  const at = async (needle, tag) => {
    const text = await readFile(join(root, 'src/App.tsx'), 'utf8'), lines = text.split('\n');
    const line = lines.findIndex(l => l.includes(needle)) + 1, column = lines[line - 1].indexOf(`<${tag}`) + 1;
    // stamps name files from the repository root (the fixture sits inside this repository)
    return { stamp: `${relative(repo, join(root, 'src/App.tsx'))}:${line}:${column}#${hash12(text)}`, line, column };
  };
  return { root, call, at };
}
const cold = (finding) => ['edits', 'ledgerKeys'].filter((key) => key in finding);

test('a page and its places carry no finding’s edits or ledger keys, in a reading or in a class trace; the place itself still has them, and a fix still gets its edit', { timeout: 60000 }, async (t) => {
  const api = await project(t);
  const plain = await api.at('id="plain"', 'p'), passed = await api.at('export const Card', 'div');
  const page = await api.call('page', { items: [{ stamp: plain.stamp, tag: 'p' }, { stamp: passed.stamp, tag: 'div', classes: 'gap-[13px]' }] }, 'POST');
  assert.equal(page.status, 200, JSON.stringify(page.body));
  const [read, traced] = page.body.items;
  // the reading: findings, none with what only an opened finding needs
  assert.ok(read.site.findings.length > 0, 'the plain element has a finding to draw');
  assert.deepEqual(read.site.findings.flatMap(cold), []);
  // the same place asked for on its own still says everything (this is where the 98% was)
  const site = (await api.call('site', { file: 'src/App.tsx', line: plain.line, column: plain.column })).body;
  assert.deepEqual(read.site.findings.map(f => f.key), site.findings.map(f => f.key));
  assert.ok(site.findings.some(f => f.edits?.length), `the place on its own lists its edits: ${JSON.stringify(site.findings.map(f => Object.keys(f)))}`);
  // the class trace: its places' findings the same way, each place still with its own structured edits
  const places = traced.traced.classes.flatMap(c => c.sites);
  assert.ok(places.length > 0 && places.some(s => s.findings.length), JSON.stringify(traced.traced));
  assert.deepEqual(places.flatMap(s => s.findings.flatMap(cold)), []);
  assert.ok(places.every(s => Array.isArray(s.edits)) && places.some(s => s.edits.length), 'a traced place keeps its own edits: the card applies them');
  // the page's code
  const code = await api.call('places', { files: ['src/App.tsx'] }, 'POST');
  assert.ok(code.body.files[0].findings.length > 0);
  assert.deepEqual(code.body.files[0].findings.flatMap(cold), []);
  // a fix asks for its edits when it is applied: they still come, with the id an apply names
  const edits = (await api.call('edits', { file: 'src/App.tsx', line: plain.line, column: plain.column })).body;
  assert.ok(edits.edits.length > 0 && edits.edits.every(e => typeof e.id === 'string' && e.id), JSON.stringify(edits));
});

test('a source question in a batch is answered as it is alone, and after the file changes the answer is the new file’s', { timeout: 60000 }, async (t) => {
  const api = await project(t);
  const card = await api.at('<Card id="passed"', 'Card');
  const where = { file: 'src/App.tsx', line: card.line, column: card.column };
  const alone = await api.call('structure', where);
  assert.equal(alone.status, 200, JSON.stringify(alone.body));
  assert.equal(alone.body.component, 'Card');
  const batch = await api.call('batch', { calls: [{ method: 'structure', params: where }, { method: 'structure', params: where }, { method: 'site', params: where }] }, 'POST');
  assert.equal(batch.status, 200, JSON.stringify(batch.body));
  assert.deepEqual(batch.body[0].value, alone.body);
  assert.deepEqual(batch.body[1].value, alone.body);
  assert.ok('value' in batch.body[2], 'a batch still answers the questions it always did');
  // the file changes: the element gains a handler. The kept index is the old text's, so it must not answer.
  const text = await readFile(join(api.root, 'src/App.tsx'), 'utf8');
  await writeFile(join(api.root, 'src/App.tsx'), text.replace('<Card id="passed"', '<Card id="passed" onClick={() => {}}'));
  const after = (await api.call('batch', { calls: [{ method: 'structure', params: where }] }, 'POST')).body[0].value;
  assert.notDeepEqual(after, alone.body);
  assert.notEqual(after.hash, alone.body.hash);
  assert.ok(JSON.stringify(after.handlers ?? after.props).includes('onClick'), JSON.stringify(after));
});
