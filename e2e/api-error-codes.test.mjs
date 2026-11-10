// The error envelope (docs/invariants/api-contract.md §1): every refusal is { error, code }, over HTTP and inside a 200's
// per-item results, and the code says what happened: stale-file, not-utf8, nothing-in-group, no-census, not-found,
// already-undone, changed-by-hand, refused. Before this the answer was English alone, and the overlay matched phrases
// ("changed since", "Nothing in that group", "no census") that any rewording broke (boundaries.md B7).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../dist/session/server.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
const APP = 'src/App.tsx', THEME = 'src/styles.css';
const source = `import './styles.css';
export const App = () => <>
  <p id="one" className="px-[13px]">a</p><p id="two" className="px-[13px]">b</p>
  <div id="three" className="mt-[13px]" />
</>;
`;
async function project(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.api-codes-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/messages'), root, { recursive: true });
  await writeFile(join(root, APP), source);
  const server = await serve({ root, watch: false }); t.after(() => server.close());
  const base = `http://127.0.0.1:${server.info.port}`;
  const call = async (method, params, verb = 'GET') => {
    const url = new URL('/__plumb/' + method, base);
    if (verb === 'GET' && params) url.search = new URLSearchParams(params);
    const response = await fetch(url, { method: verb, headers: { 'x-plumb-token': server.info.token, 'Content-Type': 'application/json' }, ...(verb === 'POST' ? { body: JSON.stringify(params) } : {}) });
    return { status: response.status, body: await response.json() };
  };
  const appHash = async () => { const r = await call('props', { file: APP, line: 3, column: 3 }); assert.equal(r.status, 200, JSON.stringify(r.body)); return r.body.hash; };
  const themeHash = async () => (await call('spec')).body.tokens.hash;
  return { root, call, appHash, themeHash };
}
const refused = (answer, code, pattern) => {
  assert.equal(answer.status, 400, JSON.stringify(answer.body));
  assert.equal(answer.body.code, code, JSON.stringify(answer.body));
  if (pattern) assert.match(answer.body.error, pattern);
};

test('a stale hash, an unknown id, an empty group and a missing census each answer with their code', async t => {
  const { call, appHash, themeHash } = await project(t);
  refused(await call('swaps', { file: APP, hash: 'f'.repeat(64), edits: [{ line: 3, column: 3, from: 'px-[13px]', to: 'px-2' }] }, 'POST'), 'stale-file', /changed since/);
  refused(await call('apply-text', { file: APP, hash: await appHash(), run: 'no-such-run', from: 'a', to: 'b' }, 'POST'), 'not-found', /Unknown text run/);
  refused(await call('undo-group', { group: 'g-none' }, 'POST'), 'nothing-in-group', /Nothing in that group/);
  refused(await call('undo-change', { id: 'cnone' }, 'POST'), 'not-found', /no change cnone/);
  refused(await call('undo', { id: 'w999' }, 'POST'), 'not-found', /not in the history/);
  refused(await call('rhythm'), 'no-census', /no census/);
  refused(await call('palette'), 'no-census');
  refused(await call('swaps', { file: '../outside.tsx', hash: 'f'.repeat(64), edits: [{ line: 1, column: 1, to: 'p-2' }] }, 'POST'), 'refused', /inside the project root/);
  refused(await call('token', { file: THEME, hash: await themeHash(), name: 'Bad Name', value: '1px' }, 'POST'), 'refused', /token name/);
});

test('apply-all answers each failed item with its code; a non-UTF-8 theme is not-utf8', async t => {
  const { root, call, themeHash } = await project(t);
  const stale = await call('apply-all', { tokens: [{ file: THEME, hash: 'f'.repeat(64), name: '--spacing-gutter', value: '24px' }] }, 'POST');
  assert.equal(stale.status, 200, JSON.stringify(stale.body));
  assert.equal(stale.body.results.tokens[0].ok, false);
  assert.equal(stale.body.results.tokens[0].code, 'stale-file', JSON.stringify(stale.body.results.tokens[0]));
  assert.match(stale.body.results.tokens[0].error, /changed since/);
  const theme = await readFile(join(root, THEME));
  await writeFile(join(root, THEME), Buffer.concat([theme, Buffer.from('/* caf', 'utf8'), Buffer.from([0xe9]), Buffer.from(' */\n', 'utf8')]));
  refused(await call('token', { file: THEME, hash: await themeHash(), name: '--spacing-gutter', value: '24px' }, 'POST'), 'not-utf8', /isn't UTF-8/);
  const inside = await call('apply-all', { tokens: [{ file: THEME, hash: await themeHash(), name: '--spacing-gutter', value: '24px' }] }, 'POST');
  assert.equal(inside.body.results.tokens[0].code, 'not-utf8', JSON.stringify(inside.body.results.tokens[0]));
});

test('undoing a change twice is already-undone; undoing one edited by hand is changed-by-hand', async t => {
  const { root, call, appHash } = await project(t);
  const first = await call('swaps', { file: APP, hash: await appHash(), edits: [{ line: 3, column: 3, from: 'px-[13px]', to: 'px-2' }], trace: { group: 'codes-1' } }, 'POST');
  assert.equal(first.status, 200, JSON.stringify(first.body));
  const [change] = (await call('trace', { group: 'codes-1' })).body.changes;
  assert.ok(change?.id.startsWith('c'), JSON.stringify(change));
  const undone = await call('undo-change', { id: change.id }, 'POST');
  assert.equal(undone.status, 200, JSON.stringify(undone.body));
  refused(await call('undo-change', { id: change.id }, 'POST'), 'already-undone', /already undone/);
  const second = await call('swaps', { file: APP, hash: await appHash(), edits: [{ line: 3, column: 3, from: 'px-[13px]', to: 'px-3' }], trace: { group: 'codes-2' } }, 'POST');
  assert.equal(second.status, 200, JSON.stringify(second.body));
  await writeFile(join(root, APP), (await readFile(join(root, APP), 'utf8')).replace('px-3', 'px-4'));
  const [byHand] = (await call('trace', { group: 'codes-2' })).body.changes;
  refused(await call('undo-change', { id: byHand.id }, 'POST'), 'changed-by-hand', /outside React Plumber/);
  refused(await call('undo-group', { group: 'codes-2' }, 'POST'), 'changed-by-hand');
});
