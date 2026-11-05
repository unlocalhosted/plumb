// One file, one name, wherever the project sits. A stamp names a file from the repository root (src/source-identity.ts),
// the server names it from the project root; when the project is below the repository top (an app in a monorepo, a
// fixture inside a checkout, a folder under a Claude Code worktree at .claude/worktrees/) the two spellings differ,
// and a reading that keeps both counts every place twice. Proved through real Vite, React and Chromium: the same app
// at the top of its own repository and nested under a hidden parent inside a repository gives the same counts, the
// same places and the same fix panel line.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';

const repo = fileURLToPath(new URL('../', import.meta.url));
// two cards share one off-scale padding (one cause, two places); a heading's weight has no step on the theme (one more)
const PAGE = `
export function App() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-s6 px-s4 py-s6">
      <section id="a" className="rounded-card bg-surface p-[18px] text-body">One</section>
      <p id="w" className="text-body font-[650]">Weight</p>
      <section id="b" className="rounded-card bg-surface p-[18px] text-body">Two</section>
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
// the demo app written at `root`, with the repository's node_modules linked in so Vite and Tailwind resolve
async function app(root) {
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await writeFile(join(root, 'src/App.jsx'), PAGE);
  await symlink(join(repo, 'node_modules'), join(root, 'node_modules'));
}
async function serve(t, root) {
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    optimizeDeps: { noDiscovery: true, include: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'react-dom/client'] },
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close());
  await server.listen();
  return `http://127.0.0.1:${server.httpServer.address().port}/`;
}
// Alt+B, the whole page read, then what Blueprint counted and what the fix panel's line says
async function reading(launched, url) {
  const page = await launched.newPage({ reducedMotion: 'reduce', viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  await page.keyboard.press('Alt+B');
  await page.locator('plumb-overlay').locator('.fx[data-settled]').waitFor({ timeout: 20000 });
  await page.waitForFunction(() => { const p = window.__plumb.overlay.progress; return p?.done === true && p.total > 0; }, null, { timeout: 30000 });
  await page.waitForTimeout(300);
  const result = await page.evaluate(() => {
    const o = window.__plumb.overlay, p = o.progress;
    const line = document.querySelector('plumb-overlay').shadowRoot.querySelector('.fx .line');
    return {
      stamp: document.getElementById('a').getAttribute('data-plumb-source').replace(/:\d+:\d+#[a-f0-9]+$/, ''),
      problems: p.drift, places: p.places, unrendered: p.unrendered, notes: p.notes,
      keys: [...o.problems].sort(),
      sites: o.places.map((m) => `${m.rule} ${m.text} ${m.file}:${m.line}:${m.column} ×${m.elements}`).sort(),
      line: [line?.querySelector('.count')?.textContent, line?.querySelector('.readout')?.textContent].filter(Boolean).join(' · ').replace(/\s+/g, ' '),
    };
  });
  await page.close();
  return { ...result, errors };
}

test('a project below its repository top counts each place once, the same as the project at the top', { timeout: 180000 }, async (t) => {
  const launched = await browser(t); if (!launched) return;
  // the top: the app is its own repository
  const plain = await mkdtemp(join(tmpdir(), 'plumb-plain-'));
  t.after(() => rm(plain, { recursive: true, force: true }));
  const top = join(plain, 'app');
  await app(top);
  execFileSync('git', ['init', '-q'], { cwd: top });
  // nested: the same app under a hidden parent inside a repository, the way a worktree's fixture or a monorepo app sits
  const outer = await mkdtemp(join(tmpdir(), 'plumb-outer-'));
  t.after(() => rm(outer, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q'], { cwd: outer });
  const nested = join(outer, '.hidden', 'worktrees', 'app');
  await app(nested);

  const atTop = await reading(launched, await serve(t, top));
  const below = await reading(launched, await serve(t, nested));
  assert.deepEqual(atTop.errors, []); assert.deepEqual(below.errors, []);
  // the stamps differ by design: the nested app's are named from the repository root
  assert.equal(atTop.stamp, 'src/App.jsx');
  assert.equal(below.stamp, '.hidden/worktrees/app/src/App.jsx');
  // the counts do not: one place per class site, counted once, named the one way the page names files
  assert.equal(atTop.line, '3 problems · 2 fixes · 1 element can’t be checked', atTop.line);
  assert.equal(below.line, atTop.line);
  assert.deepEqual({ problems: below.problems, places: below.places, unrendered: below.unrendered, notes: below.notes }, { problems: atTop.problems, places: atTop.places, unrendered: atTop.unrendered, notes: atTop.notes });
  assert.deepEqual(below.keys, atTop.keys);
  assert.deepEqual(below.sites, atTop.sites);
  assert.equal(atTop.places, 3, JSON.stringify(atTop.sites));
  assert.ok(atTop.sites.every((s) => s.includes(' src/App.jsx:') && s.endsWith('×1')), JSON.stringify(atTop.sites));
});
