// Real library DOM, authored JSX, site declarations and writes through Vite.
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { plumb } from '@unlocalhosted/react-plumber/vite';

// These regressions deliberately exercise owner-stack locate without stamps.
function unstamped(options) {
  const plugin = plumb(options);
  delete plugin.transform;
  return plugin;
}

const repo = fileURLToPath(new URL('../', import.meta.url));
export const source = `import React from 'react';
import { createPortal } from 'react-dom';
import { Button as MetalButton, Button as Btn } from '@base-ui/react/button';
import { Popover } from '@base-ui/react/popover';
import { Slot } from '@radix-ui/react-slot';
import { Primitive } from '@radix-ui/react-primitive';
import { RuntimeSlot, RuntimePortal, Deep, Orphan, makeNoJSX, Icon } from 'plumb-owner-runtime';
function Forward({ className }) {
  return <MetalButton id="forward" className={className} style={{ padding: 14 }}>Forward</MetalButton>;
}
function InsidePortal() {
  return <MetalButton id="inside-portal" className="gap-[47px]">Inside</MetalButton>;
}
function AuthoredFactory() {
  return React.createElement('button', { id: 'authored-factory' }, 'Factory');
}
export default function App() {
  return <main>
    <MetalButton id="base" className="gap-[13px]">Copy page</MetalButton>
    <Popover.Root><Popover.Trigger id="trigger" className="gap-[17px]">Open</Popover.Trigger></Popover.Root>
    <Forward className="gap-[19px]" />
    <Popover.Root><Popover.Trigger render={<MetalButton id="nested" className="gap-[23px]" />} className="py-[10px]">Nested</Popover.Trigger></Popover.Root>
    <RuntimeSlot id="runtime-slot" className="gap-[29px]" />
    <Primitive.button id="primitive" className="gap-[31px]">Primitive</Primitive.button>
    <Primitive.button asChild><MetalButton id="as-child" className="gap-[37px]">Child</MetalButton></Primitive.button>
    <Slot className="gap-[41px]"><button id="direct" className="gap-[11px]">Direct</button></Slot>
    <RuntimePortal id="cross-portal" className="gap-[53px]" />
    {createPortal(<InsidePortal />, document.body)}
    <Deep id="deep" className="gap-[59px]" />
    <Orphan />
    <section className="gap-[61px]" children={makeNoJSX({ id: 'no-jsx' })} />
    <Primitive.div className="gap-[67px]" children={makeNoJSX({ id: 'no-jsx-component' })} />
    {React.createElement('button', { id: 'authored-no-jsx' }, 'No JSX')}
    <AuthoredFactory />
    <Btn id="aliased" className="gap-[14px]">Alias</Btn>
    <Icon id="icon" className="gap-[15px]" />
    <svg id="injected" className="gap-[10px]" dangerouslySetInnerHTML={{ __html: '<g><path d="M0 0h10" /><circle r="2" /></g>' }} />
  </main>;
}
`;
const library = `import React from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@base-ui/react/button';
import { Slot } from '@radix-ui/react-slot';
import { Primitive } from '@radix-ui/react-primitive';
export function RuntimeSlot(props) {
  return <Primitive.button asChild><Slot><Button {...props}>Slot</Button></Slot></Primitive.button>;
}
export function RuntimePortal(props) { return createPortal(<Button {...props}>Portal</Button>, document.body); }
let Nested = Button;
for (let depth = 0; depth < 16; depth++) {
  const Child = Nested;
  Nested = function Layer(props) { return <Child {...props} />; };
}
export const Deep = Nested;
const orphan = React.createElement(Button, { id: 'orphan' }, 'Orphan');
export function Orphan() { return orphan; }
export function makeNoJSX(props) { return React.createElement(RuntimeSlot, props); }
function Icon2(props) {
  return <svg {...props} dangerouslySetInnerHTML={{ __html: '<g><path d="M0 0h10" /><circle r="2" /></g>' }} />;
}
export { Icon2 as Icon };
`;
function position(text, fragment) {
  const offset = text.indexOf(fragment); assert.ok(offset >= 0, fragment);
  const before = text.slice(0, offset);
  return { line: before.split('\n').length, column: offset - before.lastIndexOf('\n') };
}
export async function project(t, version, transform, { holdStartup = false } = {}) {
  const root = await mkdtemp(join(repo, 'fixtures/.owner-'));
  let server;
  const releaseStartup = () => writeFile(join(root, 'startup.release'), '');
  t.after(async () => {
    // Release a pending Session even if navigation or an assertion failed.
    try { if (holdStartup) await releaseStartup(); await server?.close(); }
    finally { await rm(root, { recursive: true, force: true }); }
  });
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true, filter: path => !path.split('/').includes('.plumb-cache') });
  await rm(join(root, 'src/App.tsx'));
  await writeFile(join(root, 'src/App.jsx'), source);
  await writeFile(join(root, 'package.json'), JSON.stringify({ type: 'module' }));
  if (holdStartup) {
    const config = await readFile(join(root, 'plumber.config.ts'), 'utf8');
    await writeFile(join(root, 'plumber.config.ts'), `import { access } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
while (true) { try { await access(${JSON.stringify(join(root, 'startup.release'))}); break; } catch { await delay(20); } }
${config}`);
  }
  const runtime = join(root, 'node_modules/plumb-owner-runtime');
  await mkdir(runtime, { recursive: true });
  await writeFile(join(runtime, 'package.json'), JSON.stringify({ name: 'plumb-owner-runtime', type: 'module', exports: './index.jsx' }));
  await writeFile(join(runtime, 'index.jsx'), library);
  await writeFile(join(root, 'index.html'), '<html><body><div id="root"></div><script type="module" src="/src/entry.jsx"></script></body></html>');
  await writeFile(join(root, 'src/entry.jsx'), `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
createRoot(document.getElementById('root')).render(<App />);
`);
  const aliases = version === 18 ? ['react', 'react-dom'].map(name => ({ find: new RegExp('^' + name + '(/.*)?$'), replacement: join(repo, 'fixtures/react18/node_modules', name) + '$1' })) : [];
  // Each fixture keeps its own dependency cache instead of sharing the repo's node_modules/.vite with every other.
  server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [unstamped({ watch: false }), ...(transform === 'plugin-react' ? [react()] : [])],
    resolve: { alias: aliases }, oxc: { jsx: { runtime: 'automatic', development: true } },
    // Late discovery can rebuild common chunks and reload the document while
    // locate's worker is fetching a creation-stack map. Fix the dependency set.
    optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime',
      '@base-ui/react/button', '@base-ui/react/popover', '@radix-ui/react-slot', '@radix-ui/react-primitive', 'plumb-owner-runtime'] },
    // Edits are checked on disk, not through a reload. Without a watcher, macOS's late report of the fixture's own
    // writes (fs.watch delivers a modification made just before a file is watched) cannot reload the page mid-test.
    logLevel: 'silent', server: { watch: null, host: '127.0.0.1', port: 0 } });
  await server.listen();
  return { root, url: `http://127.0.0.1:${server.httpServer.address().port}`, releaseStartup };
}
async function browser(t) {
  try {
    const browser = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined });
    t.after(() => browser.close()); return browser;
  } catch (error) {
    if (!/Executable doesn't exist/.test(error.message)) throw error;
    t.skip('Playwright Chromium missing. Install with: npx playwright install chromium'); return null;
  }
}
const anchors = {
  base: ['<MetalButton id="base"', 'MetalButton', 'gap-[13px]'],
  trigger: ['<Popover.Trigger id=', 'Popover.Trigger', 'gap-[17px]'],
  forward: ['<MetalButton id="forward"', 'MetalButton', null],
  nested: ['<MetalButton id="nested"', 'MetalButton', 'gap-[23px]'],
  'runtime-slot': ['<RuntimeSlot id=', 'RuntimeSlot', 'gap-[29px]'],
  primitive: ['<Primitive.button id=', 'Primitive.button', 'gap-[31px]'],
  'as-child': ['<MetalButton id="as-child"', 'MetalButton', 'gap-[37px]'],
  'inside-portal': ['<MetalButton id="inside-portal"', 'MetalButton', 'gap-[47px]'],
  aliased: ['<Btn id=', 'Btn', 'gap-[14px]'],
  icon: ['<Icon id=', 'Icon', 'gap-[15px]', 'svg'],
  'cross-portal': ['<RuntimePortal id=', 'RuntimePortal', 'gap-[53px]'],
  deep: ['<Deep id=', 'Deep', 'gap-[59px]'],
};
const owners = {
  forward: [['<Forward className=', 'Forward']],
  nested: [['<Popover.Trigger render=', 'Popover.Trigger']],
  'as-child': [['<Primitive.button asChild>', 'Primitive.button']],
  'inside-portal': [['<InsidePortal />', 'InsidePortal']],
  direct: [['<Slot className=', 'Slot']],
};
function ownerLocation(id, fragment, component, tag, version = 19) {
  const chain = [[fragment, component], ...(owners[id] ?? [])].map(([fragment, component]) => ({
    file: 'src/App.jsx', ...position(source, fragment), component,
  }));
  if (version === 18) chain.push({ file: 'src/entry.jsx', line: 4, column: 52, component: 'App' });
  return { ...chain[0], tag, via: 'owner-stack', chain, index: 0 };
}
async function verifiedLocation(result, expected, version, url, id) {
  assert.deepEqual(result.location, expected, JSON.stringify({ id, result }));
  // React 18 may only succeed with coordinates verified against authored JSX by the server.
  if (version === 18) for (const { file, line, column } of result.location.chain) {
    const response = await fetch(url + '/__plumb/resolve?' + new URLSearchParams({ source: file, line, column }));
    assert.equal(response.status, 200, id);
    const resolved = await response.json();
    assert.deepEqual({ file: resolved.file, line: resolved.line, column: resolved.column }, { file, line, column }, id + ': server-verified JSX');
  }
  return true;
}
for (const [version, transform] of [[19, 'plugin-react'], [19, 'oxc'], [18, 'oxc']]) {
  test(`Vite React ${version} ${transform}: library owners locate, read and edit authored JSX`, { timeout: 90000 }, async t => {
    const launched = await browser(t); if (!launched) return;
    const { root, url, releaseStartup } = await project(t, version, transform, { holdStartup: true });
    const page = await launched.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    await page.waitForFunction(() => window.__plumb && document.getElementById('base'));
    // Exercise slow startup on every run instead of depending on machine load.
    assert.equal(await page.evaluate(async () => {
      window.ownerReady = window.__plumb.ready().then(health => { window.ownerReadyDone = true; return health; });
      return (await (await fetch('/__plumb/health')).json()).status;
    }), 'starting');
    assert.equal(await page.evaluate(() => window.ownerReadyDone === true), false);
    await releaseStartup();
    assert.equal((await page.evaluate(() => window.ownerReady)).status, 'ready');
    const consoleErrors = [], resolutions = [];
    const onConsole = entry => { if (entry.type() === 'error') consoleErrors.push(entry.text()); };
    const onResponse = response => {
      const url = new URL(response.url());
      if (url.pathname !== '/__plumb/resolve' || !url.searchParams.has('line')) return;
      resolutions.push(response.json().then(body => ({ status: response.status(), body,
        flagged: url.searchParams.has('component') || url.searchParams.has('tag') })));
    };
    page.on('console', onConsole); page.on('response', onResponse);
    for (const [id, [fragment, component, token, tag = 'button']] of Object.entries(anchors)) {
      const result = await page.$eval('#' + id, async element => ({ location: await window.__plumb.locate(element, { explain: true }), site: await window.__plumb.site(element) }));
      if (!await verifiedLocation(result, ownerLocation(id, fragment, component, tag, version), version, url, id)) continue;
      assert.deepEqual(result.site?.declarations.map(d => d.site.text), [token ?? 'padding: 14'], id + ': only attributes authored at this JSX');
    }
    const direct = await page.$eval('#direct', async element => ({ location: await window.__plumb.locate(element, { explain: true }), site: await window.__plumb.site(element) }));
    if (await verifiedLocation(direct, ownerLocation('direct', '<button id="direct"', version === 18 ? 'Slot.Slot' : 'App', 'button', version), version, url, 'direct')) {
      assert.deepEqual(direct.site.declarations.map(d => d.site.text), ['gap-[11px]']);
    }
    for (const [id, fragment, component, token] of [
      ['icon', '<Icon id=', 'Icon', 'gap-[15px]'],
      ['injected', '<svg id="injected"', 'App', 'gap-[10px]'],
    ]) {
      for (const tag of ['g', 'path', 'circle']) {
        const result = await page.$eval('#' + id + ' ' + tag, async element => ({
          fiberless: !Object.keys(element).some(key => key.startsWith('__reactFiber$')),
          location: await window.__plumb.locate(element, { explain: true }), site: await window.__plumb.site(element),
        }));
        assert.equal(result.fiberless, true);
        if (!await verifiedLocation(result, ownerLocation(id, fragment, component, tag, version), version, url, id + ' ' + tag)) continue;
        assert.deepEqual(result.site.declarations.map(d => d.site.text), [token]);
      }
    }
    const imperative = await page.evaluate(async () => {
      const element = document.createElement('span'); document.getElementById('direct').append(element);
      return { location: await window.__plumb.locate(element, { explain: true }), site: await window.__plumb.site(element) };
    });
    if (await verifiedLocation(imperative, ownerLocation('direct', '<button id="direct"', version === 18 ? 'Slot.Slot' : 'App', 'span', version), version, url, 'imperative')) {
      assert.deepEqual(imperative.site.declarations.map(d => d.site.text), ['gap-[11px]'], 'imperative child reads nearest rendered ancestor');
    }
    for (const id of ['orphan', 'no-jsx', 'no-jsx-component', 'authored-no-jsx', 'authored-factory']) {
      assert.equal(await page.$eval('#' + id, element => window.__plumb.locate(element)), null, id + ': never guess');
      assert.equal(await page.$eval('#' + id, element => window.__plumb.site(element)), null, id + ': no borrowed declarations');
      const refusal = await page.$eval('#' + id, element => window.__plumb.locate(element, { explain: true }));
      assert.equal(refusal.location, null, id);
      assert.equal(refusal.reason, id === 'orphan' ? 'runtime-only-frames' : 'no-jsx', JSON.stringify({ id, refusal }));
      if (id === 'orphan') assert.ok(Array.isArray(refusal.detail.frames), id);
      else { assert.ok(refusal.detail.source, id); assert.ok(refusal.detail.line > 0 && refusal.detail.column > 0, id); }
    }
    const responses = await Promise.all(resolutions);
    page.off('console', onConsole); page.off('response', onResponse);
    assert.deepEqual(consoleErrors, [], 'browser locate emits zero console errors');
    assert.ok(responses.length, 'locate exercised HTTP resolver');
    assert.ok(responses.every(response => !response.flagged), 'locate resolves without component/tag flags');
    assert.ok(responses.every(response => response.status === 200), 'frame refusals stay HTTP 200');
    if (version === 19) {
      assert.ok(responses.some(({ body }) => body.refused === 'not-jsx'), 'non-JSX frame resolved without HTTP error');
      assert.ok(responses.some(({ body }) => body.file && !body.component), 'host frame verified');
      assert.ok(responses.some(({ body }) => body.component === 'MetalButton'), 'component frame verified');
    }
    // Opening-tag attribution must also be usable by the existing edit flow.
    // Locate in the page; edit and apply from here. The write reloads the page, which must not cut the request short.
    const targets = [['#base', 'gap-[13px]'], ['#aliased', 'gap-[14px]'], ['#icon path', 'gap-[15px]'], ['#injected path', 'gap-[10px]']];
    const locations = await page.evaluate(targets => Promise.all(targets.map(async ([selector]) => window.__plumb.locate(document.querySelector(selector)))), targets);
    const origin = new URL(page.url()).origin, headers = { 'Content-Type': 'application/json', Origin: origin };
    for (let i = 0; i < targets.length; i++) {
      const location = locations[i];
      const [selector, editToken] = targets[i];
      assert.ok(location, selector);
      const before = await readFile(join(root, 'src/App.jsx'), 'utf8');
      const query = new URLSearchParams({ file: location.file, line: location.line, column: location.column });
      const choices = await (await fetch(origin + '/__plumb/edits?' + query, { headers: { Origin: origin } })).json();
      const edit = choices.edits.find(edit => edit.from === editToken);
      assert.ok(edit, JSON.stringify({ selector, choices }));
      const response = await fetch(origin + '/__plumb/apply', { method: 'POST', headers, body: JSON.stringify({ file: location.file, hash: choices.hash, edits: [{ id: edit.id }] }) });
      assert.equal(response.status, 200, await response.text());
      assert.equal(await readFile(join(root, 'src/App.jsx'), 'utf8'), before.replace(editToken, edit.to));
    }
    assert.deepEqual(errors, []);
  });
}

test('authored library JSX resolves, isolates nested declarations and writes through real HTTP', { timeout: 90000 }, async t => {
  const { root, url, releaseStartup } = await project(t, 19, 'plugin-react', { holdStartup: true });
  assert.equal((await (await fetch(url + '/__plumb/health')).json()).status, 'starting');
  assert.equal((await fetch(url + '/__plumb/resolve?source=src/App.jsx')).status, 503);
  await releaseStartup();
  const { setTimeout: delay } = await import('node:timers/promises');
  let health;
  for (let i = 0; i < 1500; i++) {
    health = await (await fetch(url + '/__plumb/health')).json();
    if (health.status !== 'starting') break;
    await delay(20);
  }
  assert.equal(health.status, 'ready', JSON.stringify(health));
  const resolve = params => fetch(url + '/__plumb/resolve?' + new URLSearchParams({ source: 'src/App.jsx', ...params }));
  const snapshot = await (await resolve({ snapshot: '1' })).json();
  for (const [id, [fragment, component, token]] of Object.entries(anchors)) {
    const at = position(source, fragment);
    const response = await resolve({ ...at, column: at.column + 1, hash: snapshot.hash, component: '1' });
    assert.equal(response.status, 200, id);
    assert.deepEqual(await response.json(), { file: 'src/App.jsx', ...at, component });
    const anyOpening = await resolve({ ...at, column: at.column + 1 });
    assert.equal(anyOpening.status, 200, id + ': no flags');
    assert.deepEqual(await anyOpening.json(), { file: 'src/App.jsx', ...at, component });
    const site = await (await fetch(url + '/__plumb/site?' + new URLSearchParams({ file: 'src/App.jsx', ...at }))).json();
    assert.deepEqual(site.declarations.map(d => d.site.text), [token ?? 'padding: 14'], id);
  }
  const trigger = position(source, '<Popover.Trigger render=');
  const outer = await (await fetch(url + '/__plumb/site?' + new URLSearchParams({ file: 'src/App.jsx', ...trigger }))).json();
  assert.deepEqual(outer.declarations.map(d => d.site.text), ['py-[10px]'], 'render JSX belongs to the nested Button');
  const at = position(source, '<MetalButton id="base"');
  assert.equal((await resolve({ ...at, tag: 'button' })).status, 400, 'owner component is not its rendered host tag');
  const factory = position(source, '<section className="gap-[61px]"');
  assert.equal((await resolve({ ...factory, component: '1' })).status, 400, 'runtime factory cannot borrow containing intrinsic JSX');
  assert.equal((await resolve({ ...position(source, "makeNoJSX({ id: 'no-jsx-component'"), component: '1' })).status, 400, 'runtime factory cannot borrow containing component JSX');
  const injected = position(source, '<svg id="injected"');
  assert.deepEqual(await (await resolve({ ...injected, tag: 'svg' })).json(), { file: 'src/App.jsx', ...injected }, 'direct host resolution keeps its existing shape');
  const site = await (await fetch(url + '/__plumb/site?' + new URLSearchParams({ file: 'src/App.jsx', ...injected }))).json();
  assert.deepEqual(site.declarations.map(d => d.site.text), ['gap-[10px]'], 'HTML string contents do not create JSX sites');
  for (const [fragment, token] of [
    ['<MetalButton id="base"', 'gap-[13px]'], ['<Btn id=', 'gap-[14px]'],
    ['<Icon id=', 'gap-[15px]'], ['<svg id="injected"', 'gap-[10px]'],
  ]) {
    const location = { file: 'src/App.jsx', ...position(source, fragment) };
    const before = await readFile(join(root, location.file), 'utf8');
    const choices = await (await fetch(url + '/__plumb/edits?' + new URLSearchParams(location))).json();
    const edit = choices.edits.find(edit => edit.from === token); assert.ok(edit, JSON.stringify({ fragment, choices }));
    const applied = await fetch(url + '/__plumb/apply', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: url },
      body: JSON.stringify({ file: location.file, hash: choices.hash, edits: [{ id: edit.id }] }) });
    assert.equal(applied.status, 200, await applied.text());
    assert.equal(await readFile(join(root, location.file), 'utf8'), before.replace(token, edit.to));
  }
  assert.equal((await resolve({ ...at, hash: snapshot.hash })).status, 400, 'old owner evidence cannot adopt changed source');
});
