// One apply-all is one transaction against Vite's hot updates. Real Vite, real Chromium: the page hears
// `plumb:applied` with the whole result before any reload or update, then exactly one reload; every file is written.
// A save from an editor, outside a transaction, is never held.
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '../dist/hosts/vite.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
async function app(t) {
  let browser;
  try { browser = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined }); }
  catch (error) { if (!/Executable doesn't exist/.test(error.message)) throw error; t.skip('Playwright Chromium missing'); return; }
  t.after(() => browser.close());
  const root = await mkdtemp(join(repo, 'fixtures/.apply-all-hot-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/computed'), root, { recursive: true });
  await writeFile(join(root, 'src/App.tsx'), `import { Button } from './Button';\nexport const App = () => <div id="a" className="px-[10px]"><Button /></div>;\n`);
  await writeFile(join(root, 'src/Button.tsx'), `export const Button = () => <button id="b" className="py-[10px]">go</button>;\n`);
  const server = await createServer({ root, cacheDir: join(root, '.cache/vite'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false, stamp: false })], oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0, watch: { usePolling: true, interval: 50 } } });
  t.after(() => server.close()); await server.listen();
  const page = await browser.newPage();
  let loads = 0; page.on('load', () => loads++);
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`);
  await page.waitForFunction(() => window.__plumb?.overlay);
  loads = 0;
  // a listener like the overlay's: every event is written to sessionStorage, which survives a reload
  const listen = () => page.evaluate(async () => {
    const { createHotContext } = await import('/@vite/client');
    const hot = createHotContext('/__plumb-test.js');
    const log = (entry) => { const list = JSON.parse(sessionStorage.getItem('log') ?? '[]'); list.push(entry); sessionStorage.setItem('log', JSON.stringify(list)); };
    hot.on('plumb:applied', data => log(`plumb:applied ${data.results.tokens.length} ${data.results.swaps.length} ${data.labels.length} ${data.undo.length}`));
    hot.on('vite:beforeFullReload', () => log('full-reload'));
    hot.on('vite:beforeUpdate', () => log('update'));
  });
  await listen();
  const log = () => page.evaluate(() => JSON.parse(sessionStorage.getItem('log') ?? '[]'));
  const get = async (method, params) => {
    // the session warms up behind the page: a read answered "starting" is asked again
    for (let i = 0; i < 120; i++) {
      const body = await page.evaluate(async ([method, params]) => (await fetch(`/__plumb/${method}?` + new URLSearchParams(params))).json(), [method, params]);
      if (body.status !== 'starting') return body;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error(`${method} never answered`);
  };
  return { root, page, server, listen, log, get, loads: () => loads };
}
const settle = ms => new Promise(resolve => setTimeout(resolve, ms));

test('apply-all tells the page the whole result first, then reloads once, with every file written', { timeout: 120000 }, async t => {
  const site = await app(t); if (!site) return;
  const spec = await site.get('spec', {});
  const aColumn = 'export const App = () => '.length + 1, bColumn = 'export const Button = () => '.length + 1;
  const a = await site.get('props', { file: 'src/App.tsx', line: 2, column: aColumn }), b = await site.get('props', { file: 'src/Button.tsx', line: 1, column: bColumn });
  assert.ok(a.hash && b.hash, JSON.stringify({ a, b }));
  const body = {
    tokens: [{ file: spec.tokens.file, hash: spec.tokens.hash, name: '--spacing-s4', value: '16px', why: 'Between groups.' }],
    swaps: [{ file: 'src/App.tsx', hash: a.hash, edits: [{ line: 2, column: aColumn, from: 'px-[10px]', to: 'px-s2' }] }, { file: 'src/Button.tsx', hash: b.hash, edits: [{ line: 1, column: bColumn, from: 'py-[10px]', to: 'py-s3' }] }],
  };
  // sent from the page, as the overlay sends it; the reload may cut the response off, so the request is not awaited
  await site.page.evaluate(body => { void fetch('/__plumb/apply-all', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {}); }, body);
  await site.page.waitForFunction(() => JSON.parse(sessionStorage.getItem('log') ?? '[]').length >= 2, null, { timeout: 30000 });
  await settle(2500);
  assert.deepEqual(await site.log(), ['plumb:applied 1 2 3 3', 'full-reload']);
  assert.equal(site.loads(), 1, 'exactly one reload');
  assert.match(await readFile(join(site.root, 'src/styles.css'), 'utf8'), /--spacing-s4: 16px;/);
  assert.match(await readFile(join(site.root, 'src/App.tsx'), 'utf8'), /className="px-s2"/);
  assert.match(await readFile(join(site.root, 'src/Button.tsx'), 'utf8'), /className="py-s3"/);
  assert.equal(await site.page.$eval('#a', el => el.className), 'px-s2');
});

test('a save from an editor, outside a transaction, is not held', { timeout: 120000 }, async t => {
  const site = await app(t); if (!site) return;
  await writeFile(join(site.root, 'src/Button.tsx'), `export const Button = () => <button id="b" className="py-[12px]">go</button>;\n`);
  await site.page.waitForFunction(() => JSON.parse(sessionStorage.getItem('log') ?? '[]').length >= 1, null, { timeout: 5000 });
  assert.ok(['update', 'full-reload'].includes((await site.log())[0]), JSON.stringify(await site.log()));
});
