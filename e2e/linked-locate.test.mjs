// Linked builds and tracked workspace sources through real Vite/React owners.
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { build, createServer } from 'vite';
import { plumb } from '@unlocalhosted/plumb/vite';
import { SourceMapStore } from '../overlay/src/sourcemap.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
function position(text, fragment) {
  const offset = text.indexOf(fragment); assert.ok(offset >= 0, fragment);
  const before = text.slice(0, offset);
  return { line: before.split('\n').length, column: offset - before.lastIndexOf('\n') };
}
async function project(t, workspace) {
  const parent = await mkdtemp(join(repo, 'fixtures/.linked-'));
  let server;
  t.after(async () => { try { await server?.close(); } finally { await rm(parent, { recursive: true, force: true }); } });
  await cp(join(repo, 'fixtures/linked-package'), parent, { recursive: true });
  const app = join(parent, 'app'), library = join(parent, 'library'), root = workspace ? parent : app;
  // npm's local file: dependency layout, without a network install per test.
  await mkdir(join(app, 'node_modules'), { recursive: true });
  await symlink(library, join(app, 'node_modules/plumb-linked-library'));
  // Vite's build sets NODE_ENV=production for the whole process; the dev server below must pre-bundle development React.
  const nodeEnv = process.env.NODE_ENV;
  await build({ root: library, configFile: false, logLevel: 'silent',
    oxc: { jsx: { runtime: 'automatic', development: true } },
    define: { 'process.env.NODE_ENV': JSON.stringify('development') },
    build: { minify: false, sourcemap: true, lib: { entry: join(library, 'src/Button.jsx'), formats: ['es'], fileName: () => 'index.js' },
      rolldownOptions: { external: /^(?:react(?:\/|$)|@base-ui\/)/ } } });
  if (nodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = nodeEnv;
  if (workspace) await writeFile(join(root, 'plumb.config.ts'), `export default {
  css: 'app/src/styles.css', source: ['app/src/**/*.{jsx,css}', '!app/src/Unchecked.jsx', 'library/src/**/*.jsx'],
  decisions: { spacing: { callers: ['primitive', 'semantic'] } }
};\n`);
  await symlink(join(library, 'src'), join(app, 'src/linked-source'));
  await writeFile(join(app, 'src/NotSource.txt'), 'not JSX');
  server = await createServer({ root: app, configFile: false, plugins: [plumb({ root, watch: false })],
    oxc: { jsx: { runtime: 'automatic', development: true } }, resolve: { dedupe: ['react', 'react-dom'] },
    optimizeDeps: { noDiscovery: true, exclude: ['plumb-linked-library'],
      include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime', '@base-ui/react/button'] },
    logLevel: 'silent', server: { host: '127.0.0.1', port: 0, fs: { allow: [parent, repo] } } });
  await server.listen();
  return { root, app, library, url: `http://127.0.0.1:${server.httpServer.address().port}`,
    appSource: await readFile(join(app, 'src/App.jsx'), 'utf8'), librarySource: await readFile(join(library, 'src/Button.jsx'), 'utf8') };
}
async function ready(url) {
  for (let i = 0; i < 1500; i++) {
    const health = await (await fetch(url + '/__plumb/health')).json();
    if (health.status !== 'starting') { assert.equal(health.status, 'ready', JSON.stringify(health)); return; }
    await delay(20);
  }
  assert.fail('Session did not become ready');
}
async function edit(fixture, location, token) {
  const { root, app, library, url } = fixture;
  const beforeApp = await readFile(join(app, 'src/App.jsx'), 'utf8'), beforeLibrary = await readFile(join(library, 'src/Button.jsx'), 'utf8');
  const headers = { Origin: url, 'Content-Type': 'application/json' };
  const query = new URLSearchParams({ file: location.file, line: location.line, column: location.column });
  const response = await fetch(url + '/__plumb/edits?' + query, { headers }); assert.equal(response.status, 200);
  const choices = await response.json(), choice = choices.edits.find(edit => edit.from === token);
  assert.ok(choice, JSON.stringify({ choices, site: await (await fetch(url + '/__plumb/site?' + query, { headers })).json() }));
  const applied = await fetch(url + '/__plumb/apply', { method: 'POST', headers,
    body: JSON.stringify({ file: location.file, hash: choices.hash, edits: [{ id: choice.id }] }) });
  assert.equal(applied.status, 200, await applied.text());
  assert.equal(await readFile(join(root, location.file), 'utf8'), (token === 'gap-[13px]' ? beforeApp : beforeLibrary).replace(token, choice.to));
  assert.equal(await readFile(token === 'gap-[13px]' ? join(library, 'src/Button.jsx') : join(app, 'src/App.jsx'), 'utf8'), token === 'gap-[13px]' ? beforeLibrary : beforeApp);
}
for (const workspace of [false, true]) {
  const name = workspace ? 'tracked workspace library' : 'file-linked sibling library';
  test(`${name}: maps, classification, refusals and exact writes through HTTP`, { timeout: 90000 }, async t => {
    const fixture = await project(t, workspace), { library, url, appSource, librarySource } = fixture;
    await ready(url);
    const resolve = (source, params = {}) => fetch(url + '/__plumb/resolve?' + new URLSearchParams({ source, ...params }));
    const libraryPath = '/@fs/' + join(library, 'src/Button.jsx');
    const libraryAt = position(librarySource, '<Button'), appAt = position(appSource, '<LibButton');
    const appFile = workspace ? 'app/src/App.jsx' : 'src/App.jsx';
    for (const source of [libraryPath, pathToFileURL(join(library, 'src/Button.jsx')).href]) {
      const response = await resolve(source, { ...libraryAt, component: '1', hash: 'stale' });
      assert.equal(response.status, workspace ? 400 : 200, source);
      if (!workspace) assert.deepEqual(await response.json(), { library: true });
    }
    for (const source of ['src/linked-source/Button.jsx', '/@fs/' + join(library, 'dist/index.js'), 'node_modules/plumb-linked-library/dist/index.js', 'src/NotSource.txt']) {
      const response = await resolve(source, { snapshot: '1' }); assert.equal(response.status, 200, source);
      assert.deepEqual(await response.json(), { library: true }, source);
    }
    const uncheckedFile = workspace ? 'app/src/Unchecked.jsx' : 'src/Unchecked.jsx';
    assert.deepEqual(await (await resolve('src/Unchecked.jsx', { snapshot: '1', hash: 'stale' })).json(), { library: true, untracked: uncheckedFile });
    const snapshot = await (await resolve('src/App.jsx', { snapshot: '1' })).json();
    assert.equal(snapshot.file, appFile); assert.ok(snapshot.hash);
    for (const params of [{ ...appAt, hash: 'stale', component: '1' }, { ...appAt, hash: snapshot.hash, tag: 'button' }]) {
      assert.equal((await resolve('src/App.jsx', params)).status, 400, 'tracked mismatches remain refusals');
    }
    // Vite must actually serve the build's map back to its own JSX, rather than
    // merely testing classification of a hand-written source path.
    const scriptURL = url + '/@fs/' + join(library, 'dist/index.js');
    const script = await (await fetch(scriptURL)).text();
    const generated = position(script, 'jsxDEV(Button');
    const mapped = await new SourceMapStore().mapFrame(scriptURL, generated.line, generated.column);
    assert.ok(mapped?.hash, JSON.stringify({ mapped, script }));
    const response = await resolve(mapped.source, { ...mapped, component: '1' }); assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), workspace ? { file: 'library/src/Button.jsx', ...libraryAt, component: 'Button' } : { library: true });
    const location = await (await resolve(workspace ? libraryPath : 'src/App.jsx', { ...(workspace ? libraryAt : appAt), component: '1' })).json();
    await edit(fixture, location, workspace ? 'gap-[17px]' : 'gap-[13px]');
    // Library classification never grants writes, even for a source-selected external file.
    const refused = await fetch(url + '/__plumb/apply', { method: 'POST', headers: { Origin: url, 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: join(library, 'dist/index.js'), hash: snapshot.hash, edits: [{ id: 'unproved' }] }) });
    assert.equal(refused.status, 400);
  });
  test(`${name}: real Base UI owners locate and Node applies the authored edit`, { timeout: 90000 }, async t => {
    let browser;
    try { browser = await chromium.launch({ headless: true, executablePath: process.env.PLUMB_CHROMIUM || undefined }); }
    catch (error) {
      if (!/Executable doesn't exist/.test(error.message)) throw error;
      t.skip('Playwright Chromium missing. Install with: npx playwright install chromium'); return;
    }
    t.after(() => browser.close());
    const fixture = await project(t, workspace), { url, appSource, librarySource } = fixture;
    const page = await browser.newPage(), errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    await page.waitForFunction(() => window.__plumb && document.getElementById('linked'));
    assert.equal((await page.evaluate(() => window.__plumb.ready())).status, 'ready');
    const location = await page.$eval('#linked', element => window.__plumb.locate(element, { explain: true }));
    const owner = { file: workspace ? 'app/src/App.jsx' : 'src/App.jsx', ...position(appSource, '<LibButton'), component: 'LibButton' };
    const chain = workspace ? [{ file: 'library/src/Button.jsx', ...position(librarySource, '<Button'), component: 'Button' }, owner] : [owner];
    assert.deepEqual(location, { ...chain[0], tag: 'button', via: 'owner-stack', chain, index: 0 });
    const site = await page.$eval('#linked', element => window.__plumb.site(element));
    assert.deepEqual(site.declarations.map(d => d.site.text), [workspace ? 'gap-[17px]' : 'gap-[13px]']);
    if (!workspace) {
      const wrapped = await page.$eval('#unchecked-owner', element => window.__plumb.locate(element, { explain: true }));
      const unchecked = { file: 'src/App.jsx', ...position(appSource, '<Unchecked'), component: 'Unchecked' };
      assert.deepEqual(wrapped, { ...unchecked, tag: 'button', via: 'owner-stack', chain: [unchecked], index: 0 });
      const unowned = await page.$eval('#unchecked-only', element => window.__plumb.locate(element, { explain: true }));
      assert.equal(unowned.location, null); assert.equal(unowned.reason, 'resolve-refusal');
      assert.equal(unowned.detail.file, 'src/Unchecked.jsx'); assert.match(unowned.detail.response, /not a tracked project source/);
      assert.equal(await page.$eval('#unchecked-only', element => window.__plumb.site(element)), null);
      await page.locator('#unchecked-only').click({ modifiers: ['Alt'] });
      await page.waitForFunction(() => document.querySelector('plumb-overlay')?.shadowRoot?.textContent.includes('src/Unchecked.jsx'));
      const reading = await page.evaluate(() => document.querySelector('plumb-overlay').shadowRoot.textContent);
      assert.match(reading, /not checked/); assert.match(reading, /src\/Unchecked\.jsx/);
      await page.keyboard.press('Escape');
    }
    await edit(fixture, location, workspace ? 'gap-[17px]' : 'gap-[13px]');
    assert.deepEqual(errors, []);
  });
}
