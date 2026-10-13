import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cp, link, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { serve } from '../dist/session/server.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
const hash = text => createHash('sha256').update(text).digest('hex');
const code = `// UTF-16 😀
export const App = ({ name, children, props }) => <>
  <button id="plain">Send</button>
  <h1 id="lines">
    Hello
      world
  </h1>
  <p id="entities">A &amp; B &nbsp; &#x1F600; &copy;</p>
  <button id="single">{'Send'}</button>
  <button id="double">{ "Send" }</button>
  <p id="mixed">Hello <b>nested</b> friend {name}</p>
  <p id="expression">{name}</p>
  <p id="translation">{t('send')}</p>
  <Trans>Send</Trans>
  <p id="template">{\`Hello \${name}\`}</p>
  <p id="children">{children}</p>
  <p id="prop">{props.label}</p>
  <Button label="Send" />
  <Imported />
  <hr />
  <p id="static-template">{\`Send\`}</p>
  <Trans><span id="translated-child">Send</span></Trans>
  <Button label={t('send')} />
  <p id="edge-entities">&nbsp;Hello&nbsp; &constructor;</p>
</>;
`;
const at = (source, anchor) => {
  const start = source.indexOf(anchor); assert.ok(start >= 0, anchor);
  const prefix = source.slice(0, start);
  return { file: 'src/App.tsx', line: prefix.split('\n').length, column: start - prefix.lastIndexOf('\n') };
};
async function project(t, source = code) {
  const root = await mkdtemp(join(repo, 'fixtures/.text-edits-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true, filter: path => !path.split('/').includes('.plumb-cache') });
  const file = join(root, 'src/App.tsx'); await writeFile(file, source);
  const server = await serve({ root, watch: false }); t.after(() => server.close());
  const base = `http://127.0.0.1:${server.info.port}`;
  const call = async (method, params, verb = 'GET') => {
    const url = new URL('/__plumb/' + method, base);
    if (verb === 'GET') url.search = new URLSearchParams(params);
    const response = await fetch(url, { method: verb, headers: { 'x-plumb-token': server.info.token, 'Content-Type': 'application/json' },
      ...(verb === 'POST' ? { body: JSON.stringify(params) } : {}) });
    return { status: response.status, body: await response.json() };
  };
  return { root, file, call, text: (anchor, current = source) => call('text', at(current, anchor)) };
}

test('HTTP text reads authored runs, JSX whitespace, literals and refusal reasons without writes', async t => {
  const api = await project(t);
  for (const [anchor, labels] of [
    ['<button id="plain"', ['Send']], ['<h1', ['Hello world']],
    ['<p id="entities"', ['A & B \u00a0 😀 ©']], ['<button id="single"', ['Send']],
    ['<button id="double"', ['Send']], ['<p id="mixed"', ['Hello', 'friend']],
    ['<p id="static-template"', ['Send']], ['<p id="edge-entities"', ['\u00a0Hello\u00a0 &constructor;']],
  ]) {
    const result = await api.text(anchor);
    assert.equal(result.status, 200); assert.equal(result.body.editable, true);
    assert.equal(result.body.hash, hash(code));
    assert.deepEqual(result.body.runs.map(run => run.text), labels);
    assert.deepEqual(await api.text(anchor), result, 'Run IDs stable for unchanged source');
    for (const run of result.body.runs) { assert.ok(run.start < run.end); assert.ok(code.slice(run.start, run.end).length); }
  }
  for (const [anchor, reason] of [
    ['<p id="expression"', 'The text comes from an expression. Edit its source instead.'],
    ['<p id="template"', 'The text comes from an expression. Edit its source instead.'],
    ['<p id="translation"', 'The text comes from a translation. Edit the translation source instead.'],
    ['<Trans>', 'The text comes from a translation. Edit the translation source instead.'],
    ['<span id="translated-child"', 'The text comes from a translation. Edit the translation source instead.'],
    ["<Button label={t", 'The text comes from a translation. Edit the translation source instead.'],
    ['<p id="children"', 'This component receives its children from elsewhere. Edit them at their source.'],
    ['<p id="prop"', 'The text comes from a prop. Edit the prop source instead.'],
    ['<Button', 'The text comes from a prop. Edit the prop source instead.'],
    ['<Imported', 'This component receives its children from elsewhere. Edit them at their source.'],
    ['<hr', 'This element has no static text to edit.'],
  ]) assert.deepEqual(await api.text(anchor), { status: 200, body: { editable: false, hash: hash(code), reason } });
  assert.equal((await api.call('text', at(code, '<h1'), 'POST')).status, 405);
  assert.equal((await api.call('text', { ...at(code, '<h1'), column: 1 })).status, 400);
  assert.equal(await readFile(api.file, 'utf8'), code);
});

test('HTTP apply-text writes exact labels, preserves formatting, escapes syntax and rereads', async t => {
  const api = await project(t);
  let current = code;
  for (const [anchor, to, old, replacement] of [
    ['<button id="plain"', 'Go', '>Send</button>', '>Go</button>'],
    ['<h1', 'New heading', '\n    Hello\n      world\n  </h1>', '\n    New heading\n  </h1>'],
    ['<button id="plain"', '{}<> &amp;', '>Go</button>', '>{"{}<> &amp;"}</button>'],
    ['<button id="single"', "Don't \\ stop", "{'Send'}", "{'Don\\'t \\\\ stop'}"],
    ['<button id="double"', 'Say "yes"', '{ "Send" }', '{ "Say \\"yes\\"" }'],
    ['<p id="static-template"', 'A ` ${name}', '{`Send`}', '{`A \\` \\${name}`}'],
    ['<p id="mixed"', 'Welcome', '>Hello <b>', '>Welcome <b>'],
    ['<button id="plain"', ' First\nsecond 😀 ', '{"{}<> &amp;"}', '{" First\\nsecond 😀 "}'],
  ]) {
    const reading = (await api.text(anchor, current)).body;
    const run = reading.runs[0];
    const result = await api.call('apply-text', { file: 'src/App.tsx', hash: reading.hash, run: run.id, from: run.text, to }, 'POST');
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.ok(current.includes(old), old); current = current.replace(old, replacement);
    assert.equal(await readFile(api.file, 'utf8'), current);
    assert.equal(result.body.hash, hash(current)); assert.equal(result.body.file, api.file);
    assert.deepEqual(result.body.applied, [run.id]); assert.ok(result.body.revision > 0); assert.ok(Array.isArray(result.body.remaining));
    const reread = (await api.text(anchor, current)).body;
    assert.equal(reread.hash, result.body.hash); assert.equal(reread.runs[0].text, to);
    assert.notEqual(reread.runs[0].id, run.id);
  }
  const crlf = 'export const App = () => <button>\r\n\t  Send\r\n\t</button>;\r\n';
  await writeFile(api.file, crlf);
  const read = (await api.text('<button>', crlf)).body;
  assert.equal((await api.call('apply-text', { file: 'src/App.tsx', hash: read.hash, run: read.runs[0].id, from: 'Send', to: 'Go' }, 'POST')).status, 200);
  assert.equal(await readFile(api.file, 'utf8'), crlf.replace('Send', 'Go'));
});

test('HTTP apply-text refuses invalid, stale, dynamic and unsafe writes without changing bytes', async t => {
  const api = await project(t);
  const reading = (await api.text('<button id="plain"')).body;
  const valid = { file: 'src/App.tsx', hash: reading.hash, run: reading.runs[0].id, from: 'Send', to: 'Go' };
  const refuse = async (params, error, file = api.file) => {
    const before = await readFile(file);
    assert.deepEqual(await api.call('apply-text', params, 'POST'), { status: 400, body: { error } });
    assert.deepEqual(await readFile(file), before);
  };
  for (const [params, error] of [
    [{ ...valid, from: 'Other' }, 'The text changed since the overlay read it. Read it again.'],
    [{ ...valid, run: 'unknown' }, "Unknown text run id. Read the element's text again."],
    [{ ...valid, to: '' }, 'Replacement text must not be empty.'],
    [{ ...valid, to: '   ' }, 'Replacement text must not be empty.'],
    [{ ...valid, to: 'a'.repeat(501) }, 'Replacement text must be at most 500 characters.'],
    [{ ...valid, to: 1 }, 'Apply text requires a file, hash, run id, from string and to string.'],
    [{ ...valid, file: '../outside.tsx' }, 'File must be inside the project root.'],
  ]) await refuse(params, error);
  await writeFile(api.file, code + '// changed\n');
  await refuse(valid, 'The file changed since the overlay read it. Read it again.');
  await writeFile(api.file, code);
  for (const anchor of ['<p id="expression"', '<p id="translation"', '<Trans>']) {
    assert.equal((await api.text(anchor)).body.editable, false);
    await refuse({ ...valid, run: hash(JSON.stringify([valid.hash, code.indexOf(anchor), code.indexOf(anchor) + 1])) }, "Unknown text run id. Read the element's text again.");
  }
  await symlink(api.file, join(api.root, 'src/Alias.tsx'));
  await refuse({ ...valid, file: 'src/Alias.tsx' }, 'Apply cannot edit symbolic links or paths outside the project root.');
  await link(api.file, join(api.root, 'src/Hard.tsx'));
  await refuse(valid, 'Apply requires a regular source file without hard links.');
  await rm(join(api.root, 'src/Hard.tsx'));
  assert.equal((await api.call('apply-text', valid)).status, 405);
  const results = await Promise.all([api.call('apply-text', valid, 'POST'), api.call('apply-text', valid, 'POST')]);
  assert.deepEqual(results.map(result => result.status).sort(), [200, 400]);
  assert.equal(results.find(result => result.status === 400).body.error, 'The file changed since the overlay read it. Read it again.');
  assert.equal(await readFile(api.file, 'utf8'), code.replace('>Send</button>', '>Go</button>'));
});
