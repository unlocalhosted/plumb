// The request boundary (docs/invariants/api-contract.md §1-2): a request that does not fit its endpoint's shape is refused
// at the router with 400 and code `bad-request`, naming the field, before any handler runs and with nothing written; the
// transport's own refusals carry their codes too (unauthorized, not-found, method-not-allowed); a well-formed request is
// unchanged. Before src/session/schema.ts the same requests reached the handlers (`Number('x')`, `String(file)`), were
// refused in the engine's words or not at all, and no answer carried a code (boundaries.md, the endpoint table and B7).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../dist/session/server.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
const APP = 'src/App.tsx', THEME = 'src/styles.css';

async function project(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.api-shapes-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/messages'), root, { recursive: true });
  const server = await serve({ root, watch: false }); t.after(() => server.close());
  const base = `http://127.0.0.1:${server.info.port}`;
  const call = async (method, params, verb = 'GET', { token = server.info.token, raw } = {}) => {
    const url = new URL('/__plumb/' + method, base);
    if (verb === 'GET' && params) url.search = new URLSearchParams(params);
    const response = await fetch(url, { method: verb, headers: { 'x-plumb-token': token, 'Content-Type': 'application/json' }, ...(verb === 'POST' ? { body: raw ?? JSON.stringify(params) } : {}) });
    return { status: response.status, body: await response.json() };
  };
  return { root, call };
}

test('a request that does not fit its shape is refused with 400 and bad-request, naming the field, and nothing is written', async t => {
  const { root, call } = await project(t);
  const app = await readFile(join(root, APP)), theme = await readFile(join(root, THEME));
  const hash = (await call('spec')).body.tokens.hash;
  const cases = [
    ['swaps', { file: APP, hash, edits: [{ line: 'x', column: 1, from: '', to: 'p-2' }] }, /^edits\[0\]\.line must be a positive integer\.$/],
    ['swaps', { file: APP, hash, edits: [] }, /^edits must be a list of 1 to 200\.$/],
    ['accept', { rule: 'r', why: 'w', sites: 'nope' }, /^sites must be a list/],
    ['accept', { rule: 'r', why: 'w', sites: [{ file: 3, line: 1, column: 1, text: 'x' }] }, /^sites\[0\]\.file must be a non-empty string\.$/],
    ['undo-changes', { ids: 'c1' }, /^ids must be a list of 1 to 500\.$/],
    ['undo-group', {}, /^group must be a non-empty string\.$/],
    ['batch', { calls: [{ method: 'site', params: { file: APP, line: 0 } }] }, /^calls\[0\]\.params\.line must be a positive integer\.$/],
    ['batch', { calls: [{ method: 'classes', params: {} }] }, /^calls\[0\]\.method must be "site" or "resolve" or "structure"\.$/],
    ['page', { items: { stamp: 'x' } }, /^items must be a list/],
    ['places', { files: ['src/App.tsx', 7] }, /^files\[1\] must be a non-empty string\.$/],
    ['apply-all', { css: [{ file: THEME, hash }] }, /^css\[0\]\.css must be a non-empty string\.$/],
    ['apply-all', { tokens: 'no' }, /^tokens must be a list/],
    ['apply-all', {}, /^The request must be an apply with tokens, css, swaps or accepts\.$/],
    ['prop', { file: APP, hash, line: 3, column: 3, name: 'id', value: null }, /^value must be a string, a number or true\/false\.$/],
    ['token', { file: THEME, hash, name: '--x', value: '1px', then: { file: APP } }, /^then\.hash must be a non-empty string\.$/],
    ['apply-text', { file: APP, hash, run: 'r', from: 'a', to: 7 }, /^to must be a string\.$/],
    ['system', { scope: 'all' }, /^scope must be "page" or "project"\.$/],
    ['system', { census: [{ stamp: 'a' }] }, /^census\[0\]\.tag must be a non-empty string\.$/],
    ['try', { code: '<a />', lang: 'jsx' }, /^lang must be "tsx" or "css"\.$/],
    ['apply', { file: APP, hash, edits: [{}], trace: 'g1' }, /^edits\[0\]\.id must be a non-empty string\.$/],
    ['swap', { file: APP, hash, line: 3, column: 3, to: 'p-2', trace: { group: 7 } }, /^trace\.group must be a non-empty string\.$/],
  ];
  for (const [method, params, error] of cases) {
    const answer = await call(method, params, 'POST');
    assert.equal(answer.status, 400, `${method}: ${JSON.stringify(answer.body)}`);
    assert.equal(answer.body.code, 'bad-request', `${method}: ${JSON.stringify(answer.body)}`);
    assert.match(answer.body.error, error, `${method}: ${JSON.stringify(answer.body)}`);
  }
  for (const [method, params, error] of [
    ['site', { file: APP, line: 1, column: 'no' }, /^column must be a positive integer\.$/],
    ['site', { file: '', line: 1 }, /^file must be a non-empty string\.$/],
    ['report', { verbose: 'maybe' }, /^verbose must be true or false\.$/],
    ['class-site', { file: APP, line: 3, column: 3, chain: '{' }, /^chain must be JSON\.$/],
    ['class-site', { file: APP, line: 3, column: 3, chain: '[{"file":"a"}]' }, /^chain\[0\]\.line must be a positive integer\.$/],
    ['props', { file: APP, line: 3, column: 3, computed: '[]' }, /^computed must be an object\.$/],
    ['text-at', { file: APP, line: 3, column: 3 }, /^text must be a non-empty string\.$/],
  ]) {
    const answer = await call(method, params);
    assert.equal(answer.status, 400, `${method}: ${JSON.stringify(answer.body)}`);
    assert.equal(answer.body.code, 'bad-request', `${method}: ${JSON.stringify(answer.body)}`);
    assert.match(answer.body.error, error, `${method}: ${JSON.stringify(answer.body)}`);
  }
  assert.deepEqual(await readFile(join(root, APP)), app, 'the JSX is untouched');
  assert.deepEqual(await readFile(join(root, THEME)), theme, 'the theme is untouched');
});

test('the transport names its own refusals: the body, the token, the endpoint, the verb', async t => {
  const { call } = await project(t);
  assert.deepEqual(await call('swaps', null, 'POST', { raw: 'not json' }), { status: 400, body: { error: 'Request body must be valid JSON.', code: 'bad-request' } });
  assert.deepEqual(await call('swaps', null, 'POST', { raw: '[1]' }), { status: 400, body: { error: 'Parameters must be a JSON object.', code: 'bad-request' } });
  assert.deepEqual(await call('site', { file: APP, line: 1 }, 'GET', { token: 'f'.repeat(64) }), { status: 401, body: { error: 'A valid x-plumb-token header is required.', code: 'unauthorized' } });
  assert.deepEqual(await call('nothing', {}), { status: 404, body: { error: 'Endpoint not found.', code: 'not-found' } });
  assert.deepEqual(await call('swaps', {}), { status: 405, body: { error: 'Use POST for this endpoint.', code: 'method-not-allowed' } });
  const fine = await call('site', { file: APP, line: '1' });
  assert.equal(fine.status, 200, JSON.stringify(fine.body));
  assert.ok(fine.body.file.endsWith(APP), fine.body.file);
});
