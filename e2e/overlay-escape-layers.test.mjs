// Esc with blueprint on and a menu open on the page: the menu is on top, so the page hears Esc and closes it; the
// next Esc turns blueprint off. Before, the overlay took Esc at the window first and the menu never heard it.
import assert from 'node:assert/strict';
import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';

const repo = fileURLToPath(new URL('../', import.meta.url));

const PAGE = `import { useEffect, useState } from 'react';
export function App() {
  const [open, setOpen] = useState(false);
  // the page's own menu closes on Esc, heard on the document as most menus do
  useEffect(() => { const esc = (e) => { if (e.key === 'Escape') setOpen(false); }; document.addEventListener('keydown', esc); return () => document.removeEventListener('keydown', esc); }, []);
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-s6 px-s4 py-s6">
      <button id="more" type="button" className="w-fit rounded-control bg-surface px-s3 py-s1 text-body" onClick={() => setOpen(true)}>More</button>
      {open ? <div id="menu" role="menu" className="w-48 rounded-card bg-surface p-s2 text-body shadow-lg"><div role="menuitem">Rename</div><div role="menuitem">Delete</div></div> : null}
    </main>
  );
}
`;

async function browser(t) {
  try {
    const launched = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined });
    t.after(() => launched.close());
    return launched;
  } catch (error) {
    if (!/Executable doesn't exist/.test(error.message)) throw error;
    t.skip('Playwright Chromium missing. Install with: npx playwright install chromium');
    return null;
  }
}
async function fixture(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.esc-layers-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await writeFile(join(root, 'src/App.jsx'), PAGE);
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close());
  await server.listen();
  return `http://127.0.0.1:${server.httpServer.address().port}/`;
}

test('Esc closes the menu the page opened before it turns blueprint off', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const url = await fixture(t);
  const page = await launched.newPage({ reducedMotion: 'reduce', viewport: { width: 1280, height: 800 } });
  await page.goto(url);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  const on = () => page.evaluate(() => window.__plumb.overlay.blueprintReader.active);
  await page.click('#more');
  await page.keyboard.press('Alt+B');
  await page.waitForFunction(() => window.__plumb.overlay.blueprintReader.active);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#menu').count(), 0, 'the page heard Esc and closed its menu');
  assert.equal(await on(), true, 'blueprint stays on');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__plumb.overlay.blueprintReader.active, null, { timeout: 5000 });
});
