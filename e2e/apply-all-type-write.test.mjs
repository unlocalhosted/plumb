// A type proposal's write (POST system → POST apply-all: tokens + css + swaps) as the clean-up's text pass sends it, on
// crafting-ui's standards page (fixtures/crafting-ui-standards). Measured on crafting-ui (2026-11-03): 32 tokens took
// 61 s, one guarded write and one analysis refresh each; every token line carried its role's comment again; and
// undo-group refused the step ("The change would leave the stylesheet unreadable"), because taking the @utility block
// back drops top-level blocks. Real session server, real files; nothing is mocked.
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { serve } from '../dist/session/server.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
const THEME = 'src/styles.css';

async function project(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.type-write-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  // the demo's scaffold only (its entry and theme): its screens are not the standards page, and a screen added to the
  // demo later would put its own text in the proposal
  for (const f of await readdir(join(root, 'src'))) if (!['entry.jsx', 'styles.css'].includes(f)) await rm(join(root, 'src', f), { recursive: true, force: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await cp(join(repo, 'fixtures/crafting-ui-standards/src'), join(root, 'src'), { recursive: true });
  await writeFile(join(root, 'src/App.jsx'), `import { MotionStandardsPage } from './pages/MotionStandardsPage.tsx';\nexport function App() { return <MotionStandardsPage />; }\n`);
  const session = await serve({ root, watch: false }); t.after(() => session.close());
  const call = async (method, body) => (await fetch(`http://127.0.0.1:${session.info.port}/__plumb/${method}`, { method: body ? 'POST' : 'GET', headers: { 'x-plumb-token': session.info.token, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) })).json();
  return { root, call };
}
const text = (root, file) => readFile(join(root, file), 'utf8');

test('a type proposal\'s write lands as one write per file, one comment per role, one change per token, and undo-group takes the whole step back', { timeout: 300000 }, async (t) => {
  const { root, call } = await project(t);
  const files = ['src/pages/MotionStandardsPage.tsx', 'src/components/blueprint.tsx', 'src/motion/Timeline.tsx', 'src/motion/standards.tsx', THEME];
  const before = Object.fromEntries(await Promise.all(files.map(async (f) => [f, await text(root, f).catch(() => null)])));
  const { proposal } = await call('system', {});
  const w = proposal.write;
  assert.ok(w.tokens.length >= 8, `the proposal has tokens: ${w.tokens.length}`);
  assert.ok(w.css.length === 1 && w.swaps.length >= 1, `and a css block and swaps: ${w.css.length} ${w.swaps.length}`);
  assert.ok(w.tokens.every((x) => x.file === THEME), 'every token goes to the theme file');
  const roles = new Set(w.tokens.map((x) => x.why.replace(/, in lists$/, '')));
  assert.ok(roles.size >= 2 && roles.size < w.tokens.length, `several tokens per role: ${roles.size} roles, ${w.tokens.length} tokens`);

  const group = 'type-write-test';
  const started = performance.now();
  const result = await call('apply-all', { tokens: w.tokens, css: w.css, swaps: w.swaps, trace: { group, meta: { step: 'text' } } });
  const took = performance.now() - started;
  const failed = [...result.results.tokens, ...result.results.css, ...result.results.swaps].filter((x) => !x.ok);
  assert.deepEqual(failed, [], 'nothing refused');
  assert.equal(result.results.tokens.length, w.tokens.length, 'one result per token, as before');
  assert.equal(result.trace?.group, group);
  console.log(`apply-all: ${w.tokens.length} tokens, ${w.css.length} css block, ${w.swaps.length} swap files in ${Math.round(took)} ms`);

  // one write per file: the theme has two (the tokens, then the utilities), each JSX file one
  const { writes } = await call('history');
  const themeWrites = writes.filter((x) => x.file === THEME);
  assert.equal(themeWrites.length, 2, `the theme was written twice (tokens, utilities), not once per token: ${themeWrites.map((x) => x.label).join(' | ')}`);
  for (const f of w.swaps) assert.equal(writes.filter((x) => x.file === f.file).length, 1, `${f.file} written once`);
  assert.ok(took < 15000, `an apply of ${w.tokens.length} tokens took ${Math.round(took)} ms`);

  // the theme: every token once, one comment per role above its run
  const theme = await text(root, THEME);
  for (const x of w.tokens) assert.equal(theme.split(`${x.name}: ${x.value};`).length, 2, `${x.name} declared once`);
  for (const why of new Set(w.tokens.map((x) => x.why))) assert.equal(theme.split(`/* why: ${why} */`).length, 2, `one comment for "${why}"`);
  assert.ok(theme.includes(w.css[0].css.trim()), 'the utilities block is there');

  // the trace: one change per token line, one for the utilities block, the swaps' changes, all live and in the group
  const { changes } = await call(`trace?group=${group}`);
  assert.ok(changes.every((c) => c.group === group && c.state === 'live'), 'every change is live, in the group');
  const themeChanges = changes.filter((c) => c.file === THEME);
  for (const x of w.tokens) {
    const own = themeChanges.filter((c) => c.to.includes(`${x.name}: ${x.value};`));
    assert.equal(own.length, 1, `one change for ${x.name}: ${own.map((c) => JSON.stringify(c.to)).join(' | ')}`);
    assert.equal(own[0].to.split('\n').filter((l) => /^\s*--/.test(l)).length, 1, `${x.name}'s change holds that one declaration`);
  }
  assert.equal(themeChanges.filter((c) => c.to.includes('@utility')).length, 1, 'one change for the utilities block');
  assert.equal(themeChanges.length, w.tokens.length + 1, 'and nothing else in the theme');
  const swapped = w.swaps.reduce((n, f) => n + f.edits.length, 0);
  // a swapped className is a change (two when the diff finds its classes on either side of one that stays)
  const swapChanges = changes.filter((c) => c.file !== THEME);
  assert.ok(swapChanges.length >= swapped && swapChanges.every((c) => w.swaps.some((f) => f.file === c.file)), `the swaps' changes: ${swapChanges.length} for ${swapped} places`);

  // one token on its own can be taken back, and put back
  const one = themeChanges.find((c) => c.to.includes(`${w.tokens[1].name}: ${w.tokens[1].value};`));
  const undone = await call('undo-change', { id: one.id });
  assert.ok(undone.undone?.includes(one.id), JSON.stringify(undone));
  assert.ok(!(await text(root, THEME)).includes(`${w.tokens[1].name}: `), 'its line is gone');
  const afterOne = (await call(`trace?group=${group}`)).changes;
  assert.equal(afterOne.find((c) => c.id === one.id).state, 'undone');
  // the undo is a change of its own (in the group, as the engine tags it); take it back so the step stands whole again
  const theUndo = (await call('trace')).changes.find((c) => c.undoes?.includes(one.id));
  assert.ok(theUndo, 'the undo is traced');
  assert.ok((await call('undo-change', { id: theUndo.id })).undone, 'and can be taken back');
  assert.equal(await text(root, THEME), theme, 'the theme is as the step wrote it');

  // the whole step back: every file byte-for-byte as before
  const restored = await call('undo-group', { group });
  assert.ok(!restored.error, `undo-group: ${restored.error}`);
  for (const f of files) assert.equal(await text(root, f).catch(() => null), before[f], `${f} restored`);
  const after = (await call(`trace?group=${group}`)).changes;
  assert.ok(after.every((c) => c.state === 'undone'), `every change undone: ${after.filter((c) => c.state !== 'undone').map((c) => c.id + ':' + c.state).join(' ')}`);
});

test('a token the theme already has, or one that clashes, stands alone: the rest of its file\'s tokens are still written', { timeout: 300000 }, async (t) => {
  const { root, call } = await project(t);
  const { proposal } = await call('system', {});
  const w = proposal.write;
  const [first, second, ...rest] = w.tokens;
  // the first token is already there with the same value; the second with another
  const original = await text(root, THEME);
  await writeFile(join(root, THEME), original.replace('@theme {', `@theme {\n  ${first.name}: ${first.value};\n  ${second.name}: 999px;`));
  const { tokens } = await call('spec');
  const hash = tokens.hash;
  assert.ok(hash, 'the spec names the theme hash');
  const result = await call('apply-all', { tokens: w.tokens.map((x) => ({ ...x, hash })), trace: { group: 'partial' } });
  const byName = Object.fromEntries(result.results.tokens.map((x) => [x.name, x]));
  assert.equal(byName[first.name].ok, true, 'already there: fine');
  assert.equal(byName[second.name].ok, false, 'clashes: refused on its own');
  assert.match(byName[second.name].error, /already 999px/);
  for (const x of rest) assert.equal(byName[x.name].ok, true, `${x.name} written`);
  const theme = await text(root, THEME);
  for (const x of rest) assert.ok(theme.includes(`${x.name}: ${x.value};`), `${x.name} in the theme`);
  assert.ok(!theme.includes(`${second.name}: ${second.value};`), 'the clashing one was not written');
  const { writes } = await call('history');
  assert.equal(writes.filter((x) => x.file === THEME).length, 1, 'one write of the theme');
});

// The Vite host holds hot updates for the whole apply-all and releases them after five seconds of silence (a
// transaction that died), not five seconds of life: on crafting-ui a 61 s apply reloaded the page at ~5 s, mid-write.
test('a long, live apply-all on the Vite host is not released and reloaded before the page hears plumb:applied', { timeout: 180000 }, async (t) => {
  const { chromium } = await import('playwright');
  const { createServer } = await import('vite');
  const { default: tailwindcss } = await import('@tailwindcss/vite');
  const { plumb } = await import('../dist/hosts/vite.js');
  let browser;
  try { browser = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined }); }
  catch (error) { if (!/Executable doesn't exist/.test(error.message)) throw error; t.skip('Playwright Chromium missing'); return; }
  t.after(() => browser.close());
  const root = await mkdtemp(join(repo, 'fixtures/.type-write-hot-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  // the demo's scaffold only (its entry and theme): its screens are not the standards page, and a screen added to the
  // demo later would put its own text in the proposal
  for (const f of await readdir(join(root, 'src'))) if (!['entry.jsx', 'styles.css'].includes(f)) await rm(join(root, 'src', f), { recursive: true, force: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await cp(join(repo, 'fixtures/crafting-ui-standards/src'), join(root, 'src'), { recursive: true });
  await writeFile(join(root, 'src/App.jsx'), `import { MotionStandardsPage } from './pages/MotionStandardsPage.tsx';\nexport function App() { return <MotionStandardsPage />; }\n`);
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [plumb({ watch: false }), tailwindcss()], oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0, watch: { usePolling: true, interval: 50 } } });
  t.after(() => server.close()); await server.listen();
  const page = await browser.newPage();
  let loads = 0; page.on('load', () => loads++);
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`);
  await page.waitForFunction(() => document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.dock')?.dataset.state === 'ready', null, { timeout: 90000 });
  loads = 0;
  await page.evaluate(async () => {
    const { createHotContext } = await import('/@vite/client');
    const hot = createHotContext('/__plumb-test.js');
    const log = (entry) => { const list = JSON.parse(sessionStorage.getItem('log') ?? '[]'); list.push([entry, Date.now()]); sessionStorage.setItem('log', JSON.stringify(list)); };
    hot.on('plumb:applied', (data) => log(`plumb:applied ${data.results.tokens.length} ${data.results.swaps.filter((s) => s.ok).length}`));
    hot.on('vite:beforeFullReload', () => log('full-reload'));
    hot.on('vite:beforeUpdate', () => log('update'));
  });
  const get = async (method, params) => {
    for (let i = 0; i < 120; i++) {
      const body = await page.evaluate(async ([method, params]) => (await fetch(`/__plumb/${method}?` + new URLSearchParams(params))).json(), [method, params]);
      if (body.status !== 'starting') return body;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error(`${method} never answered`);
  };
  const spec = await get('spec', {});
  // the standards page's own elements (as e2e/timeline-real.test.mjs swaps them): a discipline's summary and a standard's rule
  const FILE = 'src/pages/MotionStandardsPage.tsx', source = await text(root, FILE);
  const columnOf = (line) => source.split('\n')[line - 1].indexOf('<') + 1;
  const { hash } = await get('props', { file: FILE, line: 37, column: columnOf(37) });
  assert.ok(hash && spec.tokens.hash, 'the file and the theme have hashes');
  // many writes in one transaction: each swap is found against the file as it is, so a chain of them is one write each
  const N = 120;
  const chain = (line, first) => Array.from({ length: N }, (_, i) => ({ file: FILE, hash, edits: [{ line, column: columnOf(line), from: i ? `mt-[${10 + i}px]` : first, to: `mt-[${11 + i}px]` }] }));
  const body = {
    tokens: [{ file: spec.tokens.file, hash: spec.tokens.hash, name: '--spacing-s9', value: '36px', why: 'Between groups.' }],
    swaps: [...chain(37, 'mt-2'), ...chain(63, 'mt-4')],
  };
  const started = Date.now();
  await page.evaluate((body) => { sessionStorage.setItem('started', String(Date.now())); void fetch('/__plumb/apply-all', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {}); }, body);
  // a page reloaded mid-write loses its listener: what it logged first tells which came first
  await page.waitForFunction(() => JSON.parse(sessionStorage.getItem('log') ?? '[]').length >= 1, null, { timeout: 150000 });
  await page.waitForFunction(() => JSON.parse(sessionStorage.getItem('log') ?? '[]').length >= 2, null, { timeout: 15000 }).catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 2500));
  const log = await page.evaluate(() => JSON.parse(sessionStorage.getItem('log') ?? '[]'));
  const took = log[0][1] - started;
  console.log(`apply-all of ${2 * N} swap writes and a token: plumb:applied after ${took} ms; ${JSON.stringify(log.map((x) => x[0]))}`);
  assert.ok(took > 5000, `the transaction outlived the five-second dead-transaction timer (${took} ms)`);
  assert.deepEqual(log.map((x) => x[0]), [`plumb:applied 1 ${2 * N}`, 'full-reload'], 'the page hears the result first, then one reload');
  assert.equal(loads, 1, 'exactly one reload');
  const written = await text(root, FILE);
  assert.equal(written.split(`mt-[${10 + N}px]`).length, 3, 'both chains reached their last class');
});
