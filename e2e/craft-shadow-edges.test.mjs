// Edges drawn with box-shadow, read as a person sees them. A hairline drawn as a one-side inset shadow (the showcase's
// border-t-hairline) is a line on that side, not a box with corners; a white ring on a dark ground is an edge, not a
// grey shadow. And two reads asked for at once (the showcase's own and a checker's scoped one) each get only their own:
// before, the scoped read collected the whole page the other one turned back on.
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
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-s6 px-s4 py-s6">
      <div id="ring" className="bg-[#12233d] p-s6"><span className="grid size-8 place-items-center rounded-full bg-accent text-[11px] text-white ring-2 ring-white">M</span></div>
      <div id="drop" className="bg-[#12233d] p-s6"><span className="grid size-8 place-items-center rounded-full bg-accent text-[11px] text-white shadow-[0_2px_6px_rgba(0,0,0,0.3)]">M</span></div>
      <article id="lined" className="w-64 rounded-[10px] bg-surface shadow-[0_0_0_1px_rgba(0,0,0,0.1)]">
        <p className="px-4 py-3 text-body">Total today</p>
        <footer className="px-4 py-2 text-body shadow-[inset_0_1px_0_#e5e5e5]">6h 08m</footer>
      </article>
      <article id="filled" className="w-64 rounded-[10px] bg-surface shadow-[0_0_0_1px_rgba(0,0,0,0.1)]">
        <p className="px-4 py-3 text-body">Total today</p>
        <footer className="bg-ground px-4 py-2 text-body">6h 08m</footer>
      </article>
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
  const root = await mkdtemp(join(repo, 'fixtures/.craft-edges-'));
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

test('Edges drawn with box-shadow, and two reads at once', { timeout: 180000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  const url = await fixture(t);
  const page = await launched.newPage({ reducedMotion: 'reduce', viewport: { width: 1280, height: 1000 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  const read = (scope) => page.evaluate((scope) => window.__plumb.craft({ scope, timeout: 20000 }).then((r) => r.findings.map((f) => f.rule)), scope);

  // both asked at once, as the showcase's stage and the checker do: the scoped one sees only its own element
  const [whole, ring] = await Promise.all([read(null), read('#ring')]);
  assert.deepEqual(ring, [], `the ring's scoped read found ${ring.join(', ')}`);
  assert.ok(whole.includes('craft/tinted-shadow'), 'the grey drop shadow on the dark ground is still marked');

  assert.ok(!(await read('#lined')).includes('craft/concentric-radius'), 'a one-side line drew no corner');
  assert.ok((await read('#filled')).includes('craft/concentric-radius'), 'a filled footer in the same corner is still marked');
  assert.deepEqual(errors, []);
});
