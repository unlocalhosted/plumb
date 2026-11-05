// Which files are yours, across the shapes a repository takes (docs/briefs/stamping-everywhere.md, "Codebase shapes"):
// a pnpm-style workspace member linked through node_modules, an Nx-style tsconfig alias into libs/, vendored code, a
// git-ignored generated file and an installed package. Through the real boundary: Vite serves the app, the stamps are
// read off the served modules and the DOM, and the server resolves them and writes to the repository file they name.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';

const repo = fileURLToPath(new URL('../', import.meta.url));
async function file(root, path, text) { await mkdir(dirname(join(root, path)), { recursive: true }); await writeFile(join(root, path), text); }
function position(text, fragment) {
  const offset = text.indexOf(fragment); assert.ok(offset >= 0, fragment);
  const before = text.slice(0, offset);
  return { line: before.split('\n').length, column: offset - before.lastIndexOf('\n') };
}
const BUTTON = `export function Button({ children }) { return <button id="workspace" className="gap-[13px]">{children}</button>; }\n`;
const CARD = `export function Card({ children }) { return <section id="alias" className="gap-[17px]">{children}</section>; }\n`;
const APP = `import { Fragment } from 'react';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react';
import { Button } from '@acme/ui';
import { Card } from '@libs/ui/Card';
import { Installed } from 'fake-installed';
import { Legacy } from './vendor/Legacy.jsx';
import { Generated } from './__generated__/Gen.jsx';
import { Vendored } from '../../../third_party/Vendored.jsx';
import { Builder } from './features/build/Builder.jsx';
import { Out } from './out/Out.jsx';
export default function App() {
  return <main id="main">
    <Button>Workspace</Button>
    <Card>Alias</Card>
    <Installed />
    <Legacy />
    <Generated />
    <Vendored />
    <Builder />
    <Out />
    <svg id="icon" viewBox="0 0 10 10"><path id="path" d="M0 0h10v10z" /></svg>
    <Menu>
      <MenuButton id="menu-button">Open</MenuButton>
      <MenuItems>
        <MenuItem as={Fragment}><a href="#item">Item</a></MenuItem>
      </MenuItems>
    </Menu>
  </main>;
}
`;

async function fixture(t) {
  const top = await mkdtemp(join(repo, 'fixtures/.identity-'));
  t.after(() => rm(top, { recursive: true, force: true }));
  spawnSync('git', ['init', '-q'], { cwd: top }); // the repository: stamps name files from here
  await file(top, 'package.json', '{"name":"acme","private":true,"type":"module"}');
  await file(top, 'pnpm-workspace.yaml', 'packages:\n  - apps/*\n  - packages/*\n');
  await file(top, 'packages/ui/package.json', '{"name":"@acme/ui","type":"module","exports":"./src/Button.jsx"}');
  await file(top, 'packages/ui/src/Button.jsx', BUTTON);
  await file(top, 'libs/ui/src/Card.jsx', CARD);
  await file(top, 'third_party/Vendored.jsx', 'export function Vendored() { return <em id="third-party">Vendored</em>; }\n');
  const app = join(top, 'apps/web');
  await file(app, 'package.json', '{"name":"web","private":true,"type":"module","dependencies":{"@acme/ui":"workspace:*","fake-installed":"1.0.0"}}');
  await file(app, 'tsconfig.json', '{ "compilerOptions": { "baseUrl": ".", "paths": { "@libs/ui/*": ["../../libs/ui/src/*"] } } }');
  await file(app, '.gitignore', 'src/__generated__/\n');
  // Output folders count at a package's top level; a folder of yours named build or out, deeper down, is still yours.
  await file(app, 'src/features/build/Builder.jsx', 'export function Builder() { return <q id="builder">Builder</q>; }\n');
  await file(app, 'src/out/Out.jsx', 'export function Out() { return <s id="out">Out</s>; }\n');
  await file(app, 'build/Built.jsx', 'export function Built() { return <b id="built">Built</b>; }\n');
  await file(app, 'src/App.jsx', APP);
  await file(app, 'src/vendor/Legacy.jsx', 'export function Legacy() { return <i id="vendored">Legacy</i>; }\n');
  await file(app, 'src/__generated__/Gen.jsx', 'export function Generated() { return <b id="generated">Generated</b>; }\n');
  await file(app, 'src/styles.css', '@import "tailwindcss";\n');
  await file(app, 'src/entry.jsx', `import { createRoot } from 'react-dom/client';\nimport App from './App.jsx';\ncreateRoot(document.getElementById('root')).render(<App />);\n`);
  await file(app, 'index.html', '<html><head><link rel="icon" href="data:,"></head><body><div id="root"></div><script type="module" src="/src/entry.jsx"></script></body></html>');
  // pnpm links a workspace member into the app's own node_modules; an installed package is a real folder there.
  await mkdir(join(app, 'node_modules/@acme'), { recursive: true });
  await symlink(join(top, 'packages/ui'), join(app, 'node_modules/@acme/ui'));
  await file(app, 'node_modules/fake-installed/package.json', '{"name":"fake-installed","version":"1.0.0","type":"module","exports":"./index.jsx"}');
  await file(app, 'node_modules/fake-installed/index.jsx', 'export function Installed() { return <u id="installed">Installed</u>; }\n');
  const server = await createServer({ root: app, configFile: false, cacheDir: join(app, '.vite-cache'), logLevel: 'silent',
    plugins: [plumb({ watch: false })], resolve: { alias: { '@libs/ui': join(top, 'libs/ui/src') }, dedupe: ['react', 'react-dom'] },
    oxc: { jsx: { runtime: 'automatic', development: true } },
    optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime', '@headlessui/react'] },
    server: { watch: null, host: '127.0.0.1', port: 0, fs: { allow: [repo] } } });
  t.after(() => server.close()); await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}`;
  for (let i = 0; i < 1500; i++) {
    const health = await (await fetch(url + '/__plumb/health')).json();
    if (health.status !== 'starting') { assert.equal(health.status, 'ready', JSON.stringify(health)); break; }
    await delay(20);
  }
  return { top, app, server, url };
}

test('the yours rule decides stamps, and a stamped workspace or alias element resolves and writes to its repository file', { timeout: 120000 }, async t => {
  const { top, app, server, url } = await fixture(t);
  const stampIn = async id => { const result = await server.transformRequest(id); assert.ok(result, id); return /"data-plumb-source": "([^"]+)"/.exec(result.code)?.[1] ?? null; };
  // Yours: the app's JSX, the workspace member through its link, the alias target, vendored code, all named from the repository root.
  assert.match(await stampIn('/src/App.jsx'), /^apps\/web\/src\/App\.jsx:\d+:\d+#[a-f0-9]{12}$/);
  assert.match(await stampIn('/@fs/' + join(top, 'packages/ui/src/Button.jsx')), /^packages\/ui\/src\/Button\.jsx:1:\d+#[a-f0-9]{12}$/);
  assert.match(await stampIn('/@fs/' + join(top, 'libs/ui/src/Card.jsx')), /^libs\/ui\/src\/Card\.jsx:1:\d+#[a-f0-9]{12}$/);
  assert.match(await stampIn('/src/vendor/Legacy.jsx'), /^apps\/web\/src\/vendor\/Legacy\.jsx:/);
  assert.match(await stampIn('/@fs/' + join(top, 'third_party/Vendored.jsx')), /^third_party\/Vendored\.jsx:/);
  // Not yours: generated (git-ignored) and installed, even when the import sits in src/ or the package is a dependency.
  assert.equal(await stampIn('/src/__generated__/Gen.jsx'), null);
  assert.equal(await stampIn('/build/Built.jsx'), null, 'an output folder at the package top level');
  assert.match(await stampIn('/src/features/build/Builder.jsx'), /^apps\/web\/src\/features\/build\/Builder\.jsx:/, 'a folder of yours named build');
  assert.match(await stampIn('/src/out/Out.jsx'), /^apps\/web\/src\/out\/Out\.jsx:/, 'a folder of yours named out');
  assert.equal(await stampIn('/node_modules/fake-installed/index.jsx'), null);

  const browser = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined });
  t.after(() => browser.close());
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(url);
  await page.waitForSelector('#menu-button');
  await page.click('#menu-button'); // the items render once the menu is open
  try { await page.waitForSelector('a[href="#item"]', { state: 'attached', timeout: 20000 }); }
  catch (error) { throw new Error(error.message + '\n' + errors.join('\n') + '\n' + (await page.content()).slice(0, 1500)); }
  await page.waitForFunction(() => window.__plumb?.ready);
  await page.evaluate(() => window.__plumb.ready());
  // Headless UI's Menu renders a Fragment and throws on any prop: it rendered, and your DOM tags inside it locate exactly
  // (MenuItem merges its own id onto your <a>; the stamp survives the merge).
  assert.deepEqual(errors, []);
  const locate = selector => page.evaluate(selector => window.__plumb.locate(document.querySelector(selector), { explain: true }), selector);
  for (const [selector, fragment] of [['a[href="#item"]', '<a href="#item"'], ['#path', '<path id="path"'], ['#icon', '<svg id="icon"']]) {
    const found = await locate(selector);
    assert.equal(found.via, 'stamp', selector + ' ' + JSON.stringify(found).slice(0, 200));
    assert.deepEqual({ file: found.file, line: found.line, column: found.column }, { file: 'src/App.jsx', ...position(APP, fragment) }, selector);
  }
  assert.equal(await page.getAttribute('#menu-button', 'data-plumb-source'), null, 'a component tag gets no prop');

  // A stamped workspace or alias element resolves to the repository file, and the write goes there.
  const headers = { Origin: url, 'Content-Type': 'application/json' };
  for (const [selector, relativeFile, absoluteFile, source, token] of [
    ['#workspace', '../../packages/ui/src/Button.jsx', join(top, 'packages/ui/src/Button.jsx'), BUTTON, 'gap-[13px]'],
    ['#alias', '../../libs/ui/src/Card.jsx', join(top, 'libs/ui/src/Card.jsx'), CARD, 'gap-[17px]'],
  ]) {
    const found = await locate(selector);
    assert.equal(found.via, 'stamp', selector + ' ' + JSON.stringify(found).slice(0, 300));
    assert.deepEqual({ file: found.file, line: found.line, column: found.column }, { file: relativeFile, ...position(source, '<' + (selector === '#workspace' ? 'button' : 'section')) }, selector);
    const query = new URLSearchParams({ file: found.file, line: found.line, column: found.column });
    const choices = await (await fetch(url + '/__plumb/edits?' + query, { headers })).json();
    const choice = choices.edits?.find(edit => edit.from === token);
    assert.ok(choice, JSON.stringify(choices));
    const applied = await fetch(url + '/__plumb/apply', { method: 'POST', headers, body: JSON.stringify({ file: found.file, hash: choices.hash, edits: [{ id: choice.id }] }) });
    assert.equal(applied.status, 200, await applied.text());
    assert.equal(await readFile(absoluteFile, 'utf8'), source.replace(token, choice.to), 'the write went to the repository file');
  }
  assert.equal(await readFile(join(app, 'src/App.jsx'), 'utf8'), APP, 'the app file is untouched');
  // Vendored code at the repository root is stamped (it is yours), and resolves to its place; the default `source`
  // selection is still the app's own folders and its linked code, so it is not a tracked file until `source` names it.
  const vendored = await locate('#third-party');
  assert.equal(vendored.location, null); assert.equal(vendored.detail?.file, '../../third_party/Vendored.jsx', JSON.stringify(vendored).slice(0, 300));
  // Not yours answers from the owner stack: a generated or installed file never carries a stamp.
  for (const selector of ['#generated', '#installed']) assert.equal(await page.getAttribute(selector, 'data-plumb-source'), null, selector);
  assert.deepEqual(errors, []);
});
