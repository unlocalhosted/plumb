// Library structure (docs/briefs/library-adapters.result.md, layers 3 and 6): an element a library renders through a
// portal, a render prop, a Slot or asChild locates to the JSX the user wrote, through the real Vite dev server, real
// Base UI / Radix rendering and a real browser. Stamped (plumb() before react()) and unstamped (owner stack only).
import assert from 'node:assert/strict';
import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';

const repo = fileURLToPath(new URL('../', import.meta.url));
async function browser(t) {
  try {
    const launched = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined });
    t.after(() => launched.close()); return launched;
  } catch (error) {
    if (!/Executable doesn't exist/.test(error.message)) throw error;
    t.skip('Playwright Chromium missing. Install with: npx playwright install chromium'); return null;
  }
}
function unstamped(options) { const plugin = plumb(options); delete plugin.transform; return plugin; }

async function app(t, source, stamped) {
  const root = await mkdtemp(join(repo, 'fixtures/.library-structure-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true, filter: path => !path.split('/').includes('.plumb-cache') });
  await rm(join(root, 'src/App.tsx'));
  await writeFile(join(root, 'src/App.jsx'), source);
  await writeFile(join(root, 'package.json'), JSON.stringify({ type: 'module', dependencies: { react: '^19.3.0', 'react-dom': '^19.3.0', '@base-ui/react': '^1.8.0', '@radix-ui/react-popover': '*', '@radix-ui/react-slot': '*' } }));
  await writeFile(join(root, 'index.html'), '<html><head></head><body><div id="root"></div><script type="module" src="/src/entry.jsx"></script></body></html>');
  await writeFile(join(root, 'src/entry.jsx'), "import React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport App from './App.jsx';\ncreateRoot(document.getElementById('root')).render(<App />);\n");
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [stamped ? plumb({ watch: false }) : unstamped({ watch: false })],
    optimizeDeps: { noDiscovery: true, include: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'react-dom/client', '@base-ui/react/popover', '@radix-ui/react-popover', '@radix-ui/react-slot'] },
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0, watch: { useFsEvents: false } } });
  t.after(() => server.close()); await server.listen();
  return { root, url: `http://127.0.0.1:${server.httpServer.address().port}` };
}
async function open(launched, url) {
  const page = await launched.newPage();
  await page.goto(url);
  await page.waitForFunction(async () => {
    const token = document.querySelector('script[data-plumb-token]')?.dataset.plumbToken;
    const response = await fetch('/__plumb/health', { headers: token ? { 'x-plumb-token': token } : {} });
    return (await response.json()).status === 'ready' && window.__plumb?.locate;
  });
  await page.evaluate(() => window.__plumb.ready());
  return page;
}
const position = (source, fragment) => { const offset = source.indexOf(fragment); assert.ok(offset >= 0, fragment); const before = source.slice(0, offset); return { line: before.split('\n').length, column: offset - before.lastIndexOf('\n') }; };
const locate = (page, selector) => page.$eval(selector, element => window.__plumb.locate(element, { explain: true }));
const site = (page, selector) => page.$eval(selector, element => window.__plumb.site(element));

const baseUi = `import { Popover } from '@base-ui/react/popover';
export default function App() {
  return <main>
    <Popover.Root defaultOpen>
      <Popover.Trigger id="trigger" className="gap-[13px]">Open</Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner id="positioner" sideOffset={8}>
          <Popover.Popup id="popup" className="gap-[17px]">Popup</Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
    <Popover.Root>
      <Popover.Trigger render={<a id="render-element" className="gap-[19px]" href="#" />}>Element</Popover.Trigger>
    </Popover.Root>
    <Popover.Root>
      <Popover.Trigger render={(props, state) => <b {...props} id="render-function" className="gap-[23px]" data-state={state.open ? "open" : "closed"} />}>Function</Popover.Trigger>
    </Popover.Root>
  </main>;
}
`;
for (const stamped of [true, false]) test(`Base UI ${stamped ? 'stamped' : 'owner stack'}: a popup through a portal, a positioner, and render-prop elements locate to the JSX the user wrote`, { timeout: 90000 }, async t => {
  const launched = await browser(t); if (!launched) return;
  const { url } = await app(t, baseUi, stamped);
  const page = await open(launched, url);
  await page.waitForSelector('#popup');
  assert.ok(await page.$eval('#popup', element => element.closest('#root') === null), 'the popup is rendered under body, outside the app root');
  for (const [id, fragment, component] of [['popup', '<Popover.Popup', 'Popover.Popup'], ['positioner', '<Popover.Positioner', 'Popover.Positioner'], ['trigger', '<Popover.Trigger id', 'Popover.Trigger'], ['render-element', '<a id="render-element"', null], ['render-function', '<b {...props}', null]]) {
    const found = await locate(page, '#' + id);
    assert.ok(found?.file, `${id}: ${JSON.stringify(found)}`);
    assert.deepEqual([found.file, found.line, found.column], ['src/App.jsx', position(baseUi, fragment).line, position(baseUi, fragment).column], `${id}: ${JSON.stringify(found)}`);
    if (component) assert.equal(found.component ?? found.chain?.[0]?.component, component, `${id}: ${JSON.stringify(found)}`);
  }
  // The reading lands on the user's classes, not the library's internals.
  for (const [id, token] of [['popup', 'gap-[17px]'], ['trigger', 'gap-[13px]'], ['render-element', 'gap-[19px]'], ['render-function', 'gap-[23px]']]) {
    const read = await site(page, '#' + id);
    assert.ok(read?.declarations.some(declaration => declaration.site.text === token), `${id}: ${JSON.stringify(read?.declarations.map(d => d.site.text))}`);
  }
});
