// #76's fix, read as a person sees it: a path split into a truncating start and its kept name is cut in the middle.
// Before, the rule read the truncating start alone as a path cut at its end and marked the fix itself.
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

const PAGE = `export function App() {
  const path = 'src/components/forms/inputs/Checkbox.tsx', cut = path.lastIndexOf('/') + 1;
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-s6 px-s4 py-s6">
      <div id="end" className="w-48"><span title={path} className="block truncate font-mono text-xs">{path}</span></div>
      <div id="middle" className="w-48"><span title={path} className="flex min-w-0 font-mono text-xs"><span className="truncate">{path.slice(0, cut)}</span><span className="shrink-0">{path.slice(cut)}</span></span></div>
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
  const root = await mkdtemp(join(repo, 'fixtures/.craft-middle-'));
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

test('A path cut in the middle is the fix, not the mistake', { timeout: 120000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const url = await fixture(t);
  const page = await launched.newPage({ reducedMotion: 'reduce', viewport: { width: 1280, height: 800 } });
  await page.goto(url);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  const read = (scope) => page.evaluate((scope) => window.__plumb.craft({ scope, timeout: 20000 }).then((r) => r.findings.map((f) => f.rule)), scope);
  assert.ok((await read('#end')).includes('craft/middle-truncate'), 'a path cut at its end is marked');
  // its truncating start reads as a path cut at the end on its own; the kept name beside it makes it a middle cut
  assert.ok(!(await read('#middle')).includes('craft/middle-truncate'), 'the start-and-name split is not marked');
});
