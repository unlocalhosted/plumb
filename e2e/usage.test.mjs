// A host a library drew answers with your usage of that library (docs/briefs/stamping-everywhere.md, rows 6–10): an
// icon's <svg> and its inner <path> answer the icon's usage line with the props written there; a menu rendered in a
// portal answers its usage; an edited file refuses rather than slides; a createElement call in your code answers the
// call only because the index has it. Through the real boundary: Vite serves the app, the overlay's own locate answers.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { dirname, join, sep } from 'node:path';
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
const chromiumPath = () => (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined;
const APP = `import React, { Fragment } from 'react';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react';
import { Search, Badge } from 'plumb-icons';
export default function App() {
  return <main id="main">
    <Search id="icon" className="size-4" strokeWidth={2} />
    <Badge id="badge" tone="warm" />
    {React.createElement('button', { id: 'made', className: 'p-2' }, 'Made')}
    <Menu>
      <MenuButton id="menu-button" className="btn">Open</MenuButton>
      <MenuItems anchor="bottom" className="menu"><MenuItem as={Fragment}><a href="#item">Item</a></MenuItem></MenuItems>
    </Menu>
  </main>;
}
`;
const ICONS = `import { forwardRef, createElement } from 'react';
export const Search = forwardRef(function Search({ className, strokeWidth, ...rest }, ref) {
  return <svg ref={ref} viewBox="0 0 10 10" className={className} {...rest}><circle cx="5" cy="5" r="3" /><path id="path" d="M0 0h10v10z" /></svg>;
});
// a library that wraps another library's icon: the hosts inside still answer with where you used Badge
export function Badge(props) { return <span data-badge="" {...props}><Search id="badge-icon" className="size-3" /></span>; }
`;
async function fixture(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.usage-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  spawnSync('git', ['init', '-q'], { cwd: root });
  await file(root, 'package.json', '{"name":"usage","private":true,"type":"module"}');
  await file(root, 'src/App.jsx', APP);
  await file(root, 'src/styles.css', '@import "tailwindcss";\n');
  await file(root, 'src/entry.jsx', `import { createRoot } from 'react-dom/client';\nimport App from './App.jsx';\ncreateRoot(document.getElementById('root')).render(<App />);\n`);
  await file(root, 'index.html', '<html><head><link rel="icon" href="data:,"></head><body><div id="root"></div><script type="module" src="/src/entry.jsx"></script></body></html>');
  await file(root, 'node_modules/plumb-icons/package.json', '{"name":"plumb-icons","type":"module","exports":"./index.jsx"}');
  await file(root, 'node_modules/plumb-icons/index.jsx', ICONS);
  const server = await createServer({ root, configFile: false, cacheDir: join(root, '.vite-cache'), logLevel: 'silent',
    plugins: [plumb({ watch: false })], oxc: { jsx: { runtime: 'automatic', development: true } },
    optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime', '@headlessui/react', 'plumb-icons'] },
    server: { watch: null, host: '127.0.0.1', port: 0, fs: { allow: [repo] } } });
  t.after(() => server.close()); await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await chromium.launch({ headless: true, executablePath: chromiumPath() });
  t.after(() => browser.close());
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.waitForSelector('#menu-button');
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  await page.click('#menu-button');
  await page.waitForSelector('a[href="#item"]', { state: 'attached' });
  const locate = (selector, options = { explain: true }) => page.evaluate(([selector, options]) => window.__plumb.locate(document.querySelector(selector), options), [selector, options]);
  return { root, url, page, errors, locate };
}

test('Vite: library-drawn hosts answer with your usage, exactly on an indexed opening, down to the last <path>', { timeout: 120000 }, async t => {
  const { root, page, errors, locate } = await fixture(t);
  const usage = { file: 'src/App.jsx', ...position(APP, '<Search id="icon"'), component: 'Search', props: ['className'] };
  for (const selector of ['#icon', '#path']) {
    const found = await locate(selector);
    assert.equal(found.via, 'usage', selector + ' ' + JSON.stringify(found));
    assert.deepEqual({ file: found.file, line: found.line, column: found.column, component: found.component, props: found.props }, usage, selector);
    assert.equal(found.chain.length, 1, 'the chain stops at the usage: nothing below it is yours');
    assert.equal(await page.getAttribute(selector, 'data-plumb-source'), null);
  }
  // a library wrapping another library's icon: every host inside answers with where you used the outer one
  const badge = { file: 'src/App.jsx', ...position(APP, '<Badge id="badge"'), component: 'Badge', props: ['tone'] };
  for (const selector of ['#badge', '#badge-icon']) {
    const found = await locate(selector);
    assert.deepEqual({ file: found.file, line: found.line, column: found.column, component: found.component, props: found.props }, badge, selector + ' ' + JSON.stringify(found));
  }
  // a portal follows React, not the DOM: the menu's container answers with the MenuItems usage
  const menu = await locate('[role="menu"]');
  assert.deepEqual({ via: menu.via, file: menu.file, line: menu.line, column: menu.column, component: menu.component, props: menu.props },
    { via: 'usage', file: 'src/App.jsx', ...position(APP, '<MenuItems'), component: 'MenuItems', props: ['className'] }, JSON.stringify(menu));
  const button = await locate('#menu-button');
  assert.equal(button.via, 'usage'); assert.equal(button.component, 'MenuButton'); assert.deepEqual(button.props, ['className']);
  // your own <a> inside the menu item is yours: its stamp answers
  assert.equal((await locate('a[href="#item"]')).via, 'stamp');
  // a creator call in your code answers the call's line, because the index has that call (at the name being called)
  const made = await locate('#made');
  assert.deepEqual({ via: made.via, file: made.file, line: made.line, column: made.column }, { via: 'call', file: 'src/App.jsx', ...position(APP, 'createElement(') }, JSON.stringify(made));
  assert.deepEqual(errors, []);
  // the file changes under the running page (no reload): the usage refuses with the mismatch, never a nearby line
  await writeFile(join(root, 'src/App.jsx'), '// a line above\n' + APP);
  await delay(2200); // the overlay keeps an index for two seconds
  const stale = await locate('#icon');
  assert.equal(stale.location, null); assert.equal(stale.reason, 'source-mismatch', JSON.stringify(stale));
  assert.equal(await locate('#icon', {}), null);
});

// Turbopack's root must hold the package, the fixture and the node_modules this tree links from (a worktree links the main checkout's).
async function turbopackRoot() {
  const parts = [repo.replace(/\/$/, ''), dirname(await realpath(join(repo, 'node_modules')))].map((p) => p.split(sep));
  const out = [];
  for (let i = 0; i < parts[0].length && parts.every((p) => p[i] === parts[0][i]); i++) out.push(parts[0][i]);
  return out.join(sep) || sep;
}
const PAGE = `'use client';
import Link from 'next/link';
export default function Page() {
  return <main id="main">
    <Link id="link" href="/about" className="link">About</Link>
  </main>;
}
`;
test('Next: next/link’s <a> answers the Link usage line on webpack and Turbopack', { timeout: 300000 }, async t => {
  const tpRoot = await turbopackRoot();
  const root = await mkdtemp(join(repo, 'fixtures/.usage-next-'));
  t.after(() => rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }));
  spawnSync('git', ['init', '-q'], { cwd: root });
  await file(root, 'next.config.mjs', `export default { experimental: { agentUpgrade: false }, turbopack: { root: ${JSON.stringify(tpRoot)} } };\n`);
  await file(root, 'app/layout.jsx', 'export default function Layout({ children }) { return <html><body>{children}</body></html>; }\n');
  await file(root, 'app/page.jsx', PAGE);
  await file(root, 'app/about/page.jsx', 'export default function About() { return <p>About</p>; }\n');
  await file(root, 'src/styles.css', '@import "tailwindcss";\n');
  await file(root, 'package.json', '{"name":"usage-next","private":true,"type":"module"}\n');
  const run = (args) => { const r = spawnSync(args[0], args.slice(1), { cwd: root, encoding: 'utf8', timeout: 120000 }); assert.equal(r.status, 0, r.stderr + r.stdout); };
  run(['npm', 'install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', '--legacy-peer-deps', '--install-links=false', `file:${repo}`]);
  const metadata = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  metadata.dependencies.next = '^16.4.0';
  await writeFile(join(root, 'package.json'), JSON.stringify(metadata));
  run([process.execPath, join(root, 'node_modules/@unlocalhosted/react-plumber/dist/cli.js'), 'install', '--overlay', '--write']);
  await file(root, 'next.config.mjs', `import { withPlumb } from '@unlocalhosted/react-plumber/next/config';
export default withPlumb({ experimental: { agentUpgrade: false }, turbopack: { root: ${JSON.stringify(tpRoot)} } });
`);
  const browser = await chromium.launch({ headless: true, executablePath: chromiumPath() });
  t.after(() => browser.close());
  const expected = { via: 'usage', file: 'app/page.jsx', ...position(PAGE, '<Link'), component: 'Link', props: ['className'] };
  for (const bundler of ['turbopack', 'webpack']) {
    await t.test(bundler, async () => {
      const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }; delete env.NODE_ENV;
      const child = spawn(process.execPath, [join(repo, 'node_modules/next/dist/bin/next'), 'dev', `--${bundler}`, '--hostname', '127.0.0.1', '--port', '0'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
      const done = once(child, 'exit');
      let logs = ''; child.stdout.on('data', chunk => logs += chunk); child.stderr.on('data', chunk => logs += chunk);
      const page = await browser.newPage();
      try {
        let url;
        for (let i = 0; i < 1200; i++) {
          assert.equal(child.exitCode, null, logs);
          if (/Ready in/.test(logs)) { url = /http:\/\/127\.0\.0\.1:\d+/.exec(logs)?.[0]; if (url) break; }
          await delay(50);
        }
        assert.ok(url, logs);
        await page.goto(url, { timeout: 120000 });
        await page.waitForFunction(() => window.__plumb?.overlay, undefined, { timeout: 60000 });
        await page.evaluate(() => window.__plumb.ready());
        assert.equal(await page.getAttribute('#link', 'data-plumb-source'), null, 'a component tag gets no stamp');
        const found = await page.evaluate(() => window.__plumb.locate(document.querySelector('#link'), { explain: true }));
        assert.deepEqual({ via: found.via, file: found.file, line: found.line, column: found.column, component: found.component, props: found.props }, expected, JSON.stringify(found).slice(0, 400));
        assert.doesNotMatch(logs, /Failed to compile|Unexpected character/);
      } finally {
        await page.close();
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
        await done;
        await rm(join(root, '.next'), { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      }
    });
  }
});
