// QA fix round 2, the overlay's element card and panel (docs/briefs/qa-fixes-2.md, Opus A). Each test reproduces one
// finding of docs/qa/element-card-retest.md (F3-04, F3-05, F3-06, F8-05, N-05, N-07, N-08, N-11) or
// docs/qa/timeline-crafting-ui.md (issues 3, 4, 7, 8, 10) on a copy of overlay/demo, through what a person does
// (Alt+click, point, scroll, Esc, Undo) and what they see, hear back from the server, or find in the file.
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';

const repo = fileURLToPath(new URL('../', import.meta.url));

// added to the demo's corners: classes built in code (no plain string anywhere), and a tall block the fix bar sits on
const EXTRA = `
      <div id="qa-built" className={['flex', 'gap-s2', 'p-s3', 'rounded-card', 'bg-surface'].join(' ')}><span>built</span><span>in code</span></div>
      <div id="qa-pair" className="flex gap-s2"><QaTag>in</QaTag><span>beside</span></div>
      <div id="qa-tern" className={TONE ? 'flex gap-s2 p-s3 rounded-card bg-surface' : 'grid'}><span>ternary</span><span>of plain strings</span></div>
      <QaLink on={false} />
      <QaPanel className="p-4 flex gap-2"><span>panel one</span><span>panel two</span></QaPanel>
      <QaTag>out one</QaTag>
      <QaTag>out two</QaTag>
      <div id="tall" className="h-[1400px] rounded-card bg-surface p-[40px]"><span>tall</span></div>
    </section>`;

// one line of code drawn three times: once inside #qa-pair, twice outside it (F8-05)
const TAG = `
const TONE = new URLSearchParams(location.search).has('corners');
function QaLink({ on }) {
  const look = 'inline-flex px-2.5 py-1 rounded-tag';
  return <a id="qa-link" href="#x" className={\`\${look} text-small \${on ? '' : 'hover:bg-ground active:bg-surface'}\`}>a link</a>;
}
function QaPanel({ className = '', children }) {
  return <div id="qa-panel" className={\`rounded-card bg-surface shadow-rest \${className}\`}>{children}</div>;
}
function QaTag({ children }) {
  return <span className="rounded-tag bg-ground px-[7px] text-small">{children}</span>;
}
`;

// Tidy's app: an aside whose last gap sets a group apart (timeline 7), a block stack spaced by margins (timeline 8),
// and a phone drawn by one map: every card's labels come from the same two lines (N-07)
const TIDY_APP = `const CARDS = ['One', 'Two', 'Three'];
export function App() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-s6 px-s4 py-s6">
      <aside id="aside" className="rounded-card bg-surface p-s4">
        <p className="text-small uppercase">Eyebrow</p>
        <h2 className="mt-2 text-body font-semibold">A heading</h2>
        <p className="mt-2 text-small">A line under it</p>
        <nav className="mt-5 text-small"><a href="#a">Link one</a></nav>
      </aside>
      <div id="stack" className="rounded-card bg-surface p-s4">
        <h2 className="text-body font-semibold">Stack title</h2>
        <p className="mt-2 text-small">First line</p>
        <p className="mt-3 text-small">Second line</p>
        <p className="mt-2 text-small">Third line</p>
      </div>
      <div id="phone" className="flex flex-col gap-s3 rounded-card bg-surface p-s4">
        {CARDS.map((c) => (
          <div key={c} className="flex flex-col gap-s1 rounded-card bg-ground p-s3">
            <span className="text-body">{c}</span>
            <span className="uppercase text-body">Dismiss</span>
            <span className="uppercase text-body">Dismiss</span>
          </div>
        ))}
      </div>
    </main>
  );
}
`;

async function open(t, { viewport = { width: 1280, height: 900 }, app = null, query = '?corners', hints = false } = {}) {
  let launched;
  try { launched = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined }); }
  catch (error) { if (!/Executable doesn't exist/.test(error.message)) throw error; t.skip('Playwright Chromium missing'); return null; }
  t.after(() => launched.close());
  const root = await mkdtemp(join(repo, 'fixtures/.qa2-overlay-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  const file = join(root, 'src/App.jsx');
  if (app) await writeFile(file, app);
  else { const demo = await readFile(file, 'utf8'); await writeFile(file, demo.replace(/\n    <\/section>\n  \);\n}\n\nexport function App/, `${EXTRA}\n  );\n}\n\nexport function App`) + TAG); }
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    optimizeDeps: { noDiscovery: true, include: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'react-dom/client'] },
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}/`;
  const original = await readFile(file, 'utf8');
  const page = await launched.newPage({ reducedMotion: 'reduce', viewport });
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  const posts = []; page.on('request', (r) => { if (r.method() === 'POST' && r.url().includes('/__plumb/')) posts.push({ path: new URL(r.url()).pathname.replace(/^.*__plumb\//, ''), body: r.postDataJSON?.() ?? null }); });
  // the first-time hints are said once per browser: a test about them starts as a first visit, the others as a return
  if (!hints) await page.addInitScript(() => { for (const k of ['blueprint', 'inspect', 'words']) try { localStorage.setItem(`plumb:hint:${k}`, '1'); } catch {} });
  await page.goto(url + query);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  const overlay = page.locator('plumb-overlay'), card = overlay.locator('.ec');
  const settle = () => page.waitForFunction(() => window.__plumb.overlay.progress?.done, null, { timeout: 20000 });
  const altAt = async (x, y) => { await page.mouse.move(x, y); await page.keyboard.down('Alt'); await page.mouse.down(); await page.mouse.up(); await page.keyboard.up('Alt'); };
  const alt = async (sel, at = { x: 4, y: 4 }, opened = '.ec .drill') => {
    await page.locator(sel).evaluate((n) => n.scrollIntoView({ block: 'center' }));
    const b = await page.locator(sel).boundingBox();
    await altAt(b.x + at.x, b.y + at.y);
    await overlay.locator(opened).first().waitFor({ timeout: 20000 });
    await settle();
  };
  // the server's trace, as History reads it
  const trace = async () => (await (await fetch(new URL('__plumb/trace', url), { headers: { Origin: new URL(url).origin, 'Sec-Fetch-Site': 'same-origin' } })).json()).changes;
  return { page, overlay, card, alt, altAt, settle, file, original, read: () => readFile(file, 'utf8'), errors, posts, trace, url };
}
const shadow = (page, fn, arg) => page.evaluate(([f, a]) => new Function('root', 'arg', `return (${f})(root, arg)`)(document.querySelector('plumb-overlay').shadowRoot, a), [fn.toString(), arg]);
const visible = (root, sel) => [...root.querySelectorAll(sel)].filter((el) => !el.hidden && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).opacity !== '0');
const overlap = (r, s) => r.left < s.right - 0.5 && s.left < r.right - 0.5 && r.top < s.bottom - 0.5 && s.top < r.bottom - 0.5;
// point at an element's left padding (two moves: the spacing layer reads pointer moves)
const pointLeftPad = async (page, sel) => { const b = await page.locator(sel).boundingBox(); await page.mouse.move(b.x + 5, b.y + b.height / 2); await page.mouse.move(b.x + 4, b.y + b.height / 2); };

const tidyOpen = async (o, sel) => {
  const { page, card, alt } = o;
  await alt(sel, { x: 6, y: 6 }, '.ec .tidy-go');
  await card.locator('.tidy-go').click();
  await card.locator('.tidy-row, .note').first().waitFor({ timeout: 20000 });
  await page.waitForFunction(() => !/Reading/.test(document.querySelector('plumb-overlay').shadowRoot.querySelector('.ec .use')?.innerText ?? ''), null, { timeout: 20000 }).catch(() => {});
  return (await card.locator('.tidy-row').allInnerTexts()).map((r) => r.replace(/\s+/g, ' ').trim());
};

// Re-review of engine review 2 (docs/research/engine-review-2.md, "Re-review"), the overlay's half: a class added beside
// one of its family is never written into a variable other elements read (N5); an add into a component's own string,
// when its classes also come in from a usage the chain did not reach, is refused in plain words (B2); and the recipes are
// asked with the same chain class-site is, so an element's own classes take a shadow there (N7).
const REREVIEW_APP = `const LOOK = 'flex gap-s2 p-[14px] rounded-card bg-surface';
function QaTile({ className = '' }) {
  return <div id="qa-tile" className={\`flex gap-s2 p-s3 rounded-card bg-surface \${className}\`}><span>tile</span><span>two</span></div>;
}
function Frame({ as: As }) { return <As className="text-small" />; }
function QaBox({ className = '' }) {
  return <div id="qa-box" className={\`flex gap-s2 p-s3 rounded-card bg-surface \${className}\`}><span>box</span><span>two</span></div>;
}
export function App() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-s6 px-s4 py-s6">
      <div id="v1" className={\`\${LOOK} text-small\`}><span>one</span><span>two</span></div>
      <div id="v2" className={LOOK}><span>three</span><span>four</span></div>
      <Frame as={QaTile} />
      <QaBox />
    </main>
  );
}
`;

test('N7: the recipes are asked with the chain class-site gets: a shadow on an element’s own classes is written there, with the hashes it was read at', { timeout: 150000 }, async (t) => {
  const o = await open(t, { app: REREVIEW_APP, query: '' });
  const { page, overlay, card, alt, read, original, posts, errors } = o;
  const gets = []; page.on('request', (r) => { if (r.method() === 'GET' && /\/__plumb\/recipes\?/.test(r.url())) gets.push(new URL(r.url()).searchParams.get('chain')); });
  await alt('#qa-box');
  await card.locator('.drill[data-open="shadow"]').click();
  await overlay.locator('.ec-strip .shot[data-key="y:rest"]').click();
  await card.locator('.writes .edit').first().waitFor({ timeout: 20000 });
  assert.equal(await card.locator('.use').isDisabled(), false, (await card.innerText()).replace(/\s+/g, ' '));
  await card.locator('.use').click();
  await overlay.locator('.fx .said').filter({ hasText: /uses .* now/ }).waitFor({ timeout: 20000 });
  const line = (await read()).split('\n').find((l) => l.includes('id="qa-box"'));
  assert.match(line, /flex gap-s2 p-s3 rounded-card bg-surface shadow-rest \$\{className\}/, line);
  const preview = posts.find((p) => p.path === 'recipes/preview'), apply = posts.find((p) => p.path === 'recipes/apply');
  assert.ok(JSON.parse(gets[0] ?? '[]').length > 0, `GET recipes chain: ${gets[0]}`);
  assert.ok(preview?.body?.chain?.length > 0, JSON.stringify(preview?.body));
  assert.ok(apply?.body?.chain?.length > 0 && apply.body.hashes?.['src/App.jsx'], JSON.stringify(apply?.body));
  assert.notEqual(await read(), original);
  assert.deepEqual(errors, []);
});
