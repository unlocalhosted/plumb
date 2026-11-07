// The write path (docs/invariants/write-path-spec.md), through the session server's real HTTP boundary and the CLI:
// a file that is not UTF-8 is refused and left byte for byte as it was; a CRLF stylesheet stays CRLF after a token
// and a utilities block are added, and the block is not added twice; a save that lands right after a write is reported,
// never success; a rollback that fails is named in the error, not swallowed; an apply-all swap whose positions were
// computed on text an earlier item rewrote is moved to the right place, or refused where that place was rewritten.
// Each of these failed on the code before src/write/source-file.ts (the audit, docs/invariants/engine.md rows 1-9).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../dist/session/server.js';
import { Session as Engine } from '../dist/session/engine.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
const THEME = 'src/styles.css', APP = 'src/App.tsx';
const line3 = '  <p id="one" className="px-[13px]">a</p><p id="two" className="px-[13px]">b</p>';
const source = `import './styles.css';
export const App = () => <>
${line3}
  <div id="three" className="mt-[13px]" />
</>;
`;
const hash = text => createHash('sha256').update(text).digest('hex');
async function files(t, theme) {
  const root = await mkdtemp(join(repo, 'fixtures/.write-path-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/messages'), root, { recursive: true });
  await writeFile(join(root, APP), source);
  if (theme) await writeFile(join(root, THEME), theme(await readFile(join(root, THEME))));
  return root;
}
async function project(t, { theme } = {}) {
  const root = await files(t, theme);
  const server = await serve({ root, watch: false }); t.after(() => server.close());
  const base = `http://127.0.0.1:${server.info.port}`;
  const call = async (method, params, verb = 'GET') => {
    const url = new URL('/__plumb/' + method, base);
    if (verb === 'GET') url.search = new URLSearchParams(params);
    const response = await fetch(url, { method: verb, headers: { 'x-plumb-token': server.info.token, 'Content-Type': 'application/json' }, ...(verb === 'POST' ? { body: JSON.stringify(params) } : {}) });
    return { status: response.status, body: await response.json() };
  };
  const themeHash = async () => (await call('spec', {})).body.tokens.hash;
  const appHash = async () => { const r = await call('props', { file: APP, line: 3, column: 3 }); assert.equal(r.status, 200, JSON.stringify(r.body)); return r.body.hash; };
  const bytes = file => readFile(join(root, file));
  return { root, call, themeHash, appHash, bytes };
}
/** The engine in this thread (the HTTP server runs it in a worker, out of reach of the hooks below): the same methods the routes call. */
async function engine(t) {
  const root = await files(t);
  const session = await Engine.create({ root, watch: false }); t.after(() => session.close());
  return { root, session, hashOf: async file => hash(await readFile(join(root, file), 'utf8')) };
}
/** Replace one promise-API function of node:fs for the duration of `run` (the engine imports it from node:fs/promises). */
async function inject(name, probe, run) {
  const { default: fs } = await import('node:fs');
  const { syncBuiltinESMExports } = await import('node:module');
  const original = fs.promises[name];
  fs.promises[name] = (...args) => probe(original, args);
  syncBuiltinESMExports();
  try { await run(); } finally { fs.promises[name] = original; syncBuiltinESMExports(); }
}
const loneLf = text => /(?:^|[^\r])\n/.test(text);

test('a file that is not UTF-8 is refused and left byte for byte as it was (theme and JSX)', async t => {
  const api = await project(t, { theme: original => Buffer.concat([original, Buffer.from('/* caf', 'utf8'), Buffer.from([0xe9]), Buffer.from(' */\n', 'utf8')]) });
  const themeBefore = await api.bytes(THEME);
  assert.ok(themeBefore.includes(0xe9));
  const token = await api.call('token', { file: THEME, hash: await api.themeHash(), name: '--spacing-gutter', value: '24px', why: 'The page gutter.' }, 'POST');
  assert.equal(token.status, 400, JSON.stringify(token.body));
  assert.match(token.body.error, /isn't UTF-8, so nothing was written/);
  assert.deepEqual(await api.bytes(THEME), themeBefore, 'the theme is byte for byte what it was');

  await writeFile(join(api.root, APP), Buffer.concat([Buffer.from(source, 'utf8'), Buffer.from('// caf', 'utf8'), Buffer.from([0xe9]), Buffer.from('\n', 'utf8')]));
  const appBefore = await api.bytes(APP);
  const swap = await api.call('swaps', { file: APP, hash: await api.appHash(), edits: [{ line: 3, column: 3, from: 'px-[13px]', to: 'px-small' }] }, 'POST');
  assert.equal(swap.status, 400, JSON.stringify(swap.body));
  assert.match(swap.body.error, /isn't UTF-8, so nothing was written/);
  assert.deepEqual(await api.bytes(APP), appBefore, 'the source is byte for byte what it was');
});

test('a CRLF stylesheet stays CRLF after a token and a utilities block are added, and the block is not added twice', async t => {
  const api = await project(t, { theme: original => Buffer.from(original.toString('utf8').replace(/\r?\n/g, '\r\n'), 'utf8') });
  assert.ok(!loneLf(await readFile(join(api.root, THEME), 'utf8')));
  const token = await api.call('token', { file: THEME, hash: await api.themeHash(), name: '--spacing-gutter', value: '24px', why: 'The page gutter.' }, 'POST');
  assert.equal(token.status, 200, JSON.stringify(token.body));
  let theme = await readFile(join(api.root, THEME), 'utf8');
  assert.ok(theme.includes('--spacing-gutter: 24px;'), 'the token is there');
  assert.ok(!loneLf(theme), `every line break is CRLF:\n${JSON.stringify(theme)}`);

  const css = '@utility text-body {\n  font-size: var(--text-body);\n}';
  const first = await api.call('apply-all', { css: [{ file: THEME, hash: token.body.hash, css }] }, 'POST');
  assert.equal(first.status, 200, JSON.stringify(first.body));
  assert.deepEqual(first.body.results.css.map(r => [r.ok, r.written]), [[true, true]]);
  theme = await readFile(join(api.root, THEME), 'utf8');
  assert.ok(!loneLf(theme), `the block went in with CRLF:\n${JSON.stringify(theme)}`);
  assert.equal(theme.split('@utility text-body').length, 2);
  const again = await api.call('apply-all', { css: [{ file: THEME, hash: await api.themeHash(), css }] }, 'POST');
  assert.equal(again.status, 200, JSON.stringify(again.body));
  assert.deepEqual(again.body.results.css.map(r => [r.ok, r.written]), [[true, false]], 'already there: nothing written');
  assert.equal((await readFile(join(api.root, THEME), 'utf8')).split('@utility text-body').length, 2, 'and not a second copy');
});

test('a save that lands right after the write is reported as a change, never as success', async t => {
  const { root, session, hashOf } = await engine(t);
  const target = join(root, APP), concurrent = source + '// concurrent editor\n';
  let landed = 0;
  await inject('rename', async (rename, args) => { const out = await rename(...args); if (args[1] === target) { landed++; writeFileSync(target, concurrent); } return out; }, async () => {
    await assert.rejects(session.swaps({ file: APP, hash: await hashOf(APP), edits: [{ line: 3, column: 3, from: 'px-[13px]', to: 'px-small' }] }), /changed/);
  });
  assert.equal(landed, 1, 'the write landed by rename, and the editor saved right after it');
  assert.equal(await readFile(target, 'utf8'), concurrent, 'the later save is what the file holds');
  assert.deepEqual((await session.history()).writes, [], 'and no write claims it');
});

test('a token whose class cannot follow is taken back; when the theme changed meanwhile, the failed rollback is named in the error', async t => {
  const { root, session, hashOf } = await engine(t);
  const theme = join(root, THEME), app = join(root, APP);
  let meddled = false;
  await inject('open', async (open, args) => {
    const handle = await open(...args);
    // the swap is reading the JSX file for its write: the theme (just written) changes under the rollback that follows
    if (!meddled && args[0] === app) { meddled = true; writeFileSync(theme, (await readFile(theme, 'utf8')) + '/* edited by hand */\n'); }
    return handle;
  }, async () => {
    const write = session.token({ file: THEME, hash: await hashOf(THEME), name: '--spacing-gutter', value: '24px', why: 'The page gutter.',
      then: { file: APP, hash: await hashOf(APP), line: 3, column: 3, from: 'not-a-class-here', to: 'px-gutter' } });
    await assert.rejects(write, error => {
      assert.match(error.message, /not-a-class-here is not written on this element/, 'the swap refused');
      assert.match(error.message, /src\/styles\.css could not be put back \(.*changed since this write.*\); it still holds the change/, 'and the rollback that failed is in the error');
      return true;
    });
  });
  assert.ok(meddled);
  const after = await readFile(theme, 'utf8');
  assert.ok(after.includes('--spacing-gutter: 24px;') && after.includes('/* edited by hand */'), 'the theme holds both the token and the hand edit');
});

test('apply-all: a swap sent against the batch-start text of a file an earlier item rewrote lands where its element is now, and a place that was rewritten is refused', async t => {
  const api = await project(t);
  const hash = await api.appHash();
  const columnTwo = line3.indexOf('<p id="two"') + 1, columnInsideClass = line3.indexOf('px-[13px]') + 3;
  const result = await api.call('apply-all', { swaps: [
    // lengthens element one's class, so everything after it on the line moves right
    { file: APP, hash, edits: [{ line: 3, column: 3, from: 'px-[13px]', to: 'px-[clamp(1rem,4vw,2.5rem)]' }] },
    // an add (nothing to match) at element two's position as it was when the batch began
    { file: APP, hash, edits: [{ line: 3, column: columnTwo, from: '', to: 'gap-2' }] },
    // an add at a position inside the class the first item rewrote
    { file: APP, hash, edits: [{ line: 3, column: columnInsideClass, from: '', to: 'gap-4' }] },
  ] }, 'POST');
  assert.equal(result.status, 200, JSON.stringify(result.body));
  const [first, second, third] = result.body.results.swaps;
  assert.equal(first.ok, true, JSON.stringify(first));
  assert.equal(second.ok, true, JSON.stringify(second));
  assert.equal(third.ok, false, JSON.stringify(third));
  assert.match(third.error, /written earlier in this apply; read it again/);
  const after = (await readFile(app(api), 'utf8')).split('\n')[2];
  assert.equal(after, '  <p id="one" className="px-[clamp(1rem,4vw,2.5rem)]">a</p><p id="two" className="px-[13px] gap-2">b</p>', after);
  assert.ok(!after.includes('gap-4'));
});
const app = api => join(api.root, APP);

test('plumber install refuses an AGENTS.md that is not UTF-8 and leaves it byte for byte as it was', async t => {
  const root = await mkdtemp(join(repo, 'fixtures/.write-path-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/messages'), root, { recursive: true });
  const agents = join(root, 'AGENTS.md'), before = Buffer.concat([Buffer.from('# Team caf', 'utf8'), Buffer.from([0xe9]), Buffer.from('\nKeep this.\n', 'utf8')]);
  await writeFile(agents, before);
  const result = spawnSync(process.execPath, [join(repo, 'dist/cli.js'), 'install', '--agent', 'codex', '--root', root], { encoding: 'utf8', timeout: 60_000 });
  assert.notEqual(result.status, 0, result.stdout);
  assert.match(result.stderr, /AGENTS\.md isn't UTF-8, so nothing was written/);
  assert.deepEqual(await readFile(agents), before);
});
