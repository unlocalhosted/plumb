// apply-all's stylesheet blocks (docs/invariants/api-contract.md §4; boundaries.md B5): the only CSS that reaches the
// theme is a block this engine proposed in `system`, byte for byte (trimmed); any other text, and a proposal with
// anything added to it, is refused with code `refused` and nothing is written. Before this, a few regexes were the whole
// guard, and `body { display: none }` from any caller with the token went straight into the theme.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../dist/session/server.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
const THEME = 'src/styles.css';
async function project(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.css-proposal-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await cp(join(repo, 'fixtures/crafting-ui-standards/src'), join(root, 'src'), { recursive: true });
  await writeFile(join(root, 'src/App.jsx'), `import { MotionStandardsPage } from './pages/MotionStandardsPage.tsx';\nexport function App() { return <MotionStandardsPage />; }\n`);
  const server = await serve({ root, watch: false }); t.after(() => server.close());
  const call = async (method, body) => (await fetch(`http://127.0.0.1:${server.info.port}/__plumb/${method}`, { method: body ? 'POST' : 'GET', headers: { 'x-plumb-token': server.info.token, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) })).json();
  const theme = () => readFile(join(root, THEME), 'utf8');
  const hash = async () => (await call('spec')).tokens.hash;
  return { call, theme, hash };
}

test('apply-all writes only the block the engine proposed; anything else is refused and the theme is untouched', async t => {
  const { call, theme, hash } = await project(t);
  const before = await theme();
  for (const css of ['body { display: none }', '@utility type-body { font-size: 1rem }', '@layer base { * { color: red } }']) {
    const result = await call('apply-all', { css: [{ file: THEME, hash: await hash(), css }] });
    assert.deepEqual(result.results.css.map(r => [r.ok, r.written, r.code]), [[false, false, 'refused']], JSON.stringify(result.results.css));
    assert.match(result.results.css[0].error, /not one React Plumber proposed/);
    assert.equal(await theme(), before, 'nothing was written');
  }
  const { proposal } = await call('system', {});
  const [block] = proposal.write.css;
  assert.ok(block?.css.includes('@utility type-'), 'the project gets a utilities block');
  // the proposal with one declaration added is not the proposal
  const tampered = await call('apply-all', { css: [{ file: THEME, hash: await hash(), css: block.css + '\nbody { display: none }\n' }] });
  assert.deepEqual(tampered.results.css.map(r => [r.ok, r.code]), [[false, 'refused']]);
  assert.equal(await theme(), before);
  // the proposal itself goes in
  const written = await call('apply-all', { css: [block] });
  assert.deepEqual(written.results.css.map(r => [r.ok, r.written]), [[true, true]], JSON.stringify(written.results.css));
  assert.ok((await theme()).includes(block.css.trim()));
});
