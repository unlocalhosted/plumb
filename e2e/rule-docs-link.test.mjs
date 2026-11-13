// The "i" beside a craft finding (overlay/src/fixpanel.js, its URL from overlay/src/rule-docs.js): in the fix panel a
// craft finding's name carries a link to its rule's page in the docs, and a finding of the theme carries none. The
// link is reached by keyboard (focus and Enter, or I with the fix in hand), named for what it opens, and opens that rule's page in a new tab by click or Enter;
// Enter on it never takes the fix in hand. The page it names exists: the docs' rules reference has that rule's heading.
// Proved through real Vite, React and Chromium on the overlay demo's app.
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';
import { DOCS_ORIGIN, docsUrl, ruleAnchor } from '../overlay/src/rule-docs.js';

const repo = fileURLToPath(new URL('../', import.meta.url));

// A card whose inner panel sits flush in its corner with the card's own radius (craft/concentric-radius), beside a
// padding typed by hand (a theme finding, no rule page)
const PAGE = `
export function App() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-s6 px-s4 py-s6">
      <section id="card" className="rounded-card bg-surface p-s2">
        <div id="inner" className="rounded-card bg-ground p-s4 text-body">Inner panel</div>
      </section>
      <section id="loose" className="rounded-card bg-surface p-[18px] text-body">Loose</section>
    </main>
  );
}
`;

test('A craft finding in the fix panel carries an "i" that opens its rule’s page; a theme finding carries none', { timeout: 150000 }, async (t) => {
  let launched;
  try { launched = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined }); }
  catch (error) { if (!/Executable doesn't exist/.test(error.message)) throw error; t.skip('Playwright Chromium missing. Install with: npx playwright install chromium'); return; }
  t.after(() => launched.close());

  const root = await mkdtemp(join(repo, 'fixtures/.rule-docs-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await writeFile(join(root, 'src/App.jsx'), PAGE);
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    optimizeDeps: { noDiscovery: true, include: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'react-dom/client'] },
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close());
  await server.listen();

  const context = await launched.newContext({ reducedMotion: 'reduce', viewport: { width: 1200, height: 900 } });
  // the docs site answers for itself here: what was asked for is recorded, nothing leaves the machine
  const asked = [];
  await context.route(`${DOCS_ORIGIN}/**`, (route) => { asked.push(route.request().url()); return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Rules</title>' }); });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  const overlay = page.locator('plumb-overlay');
  await page.keyboard.press('Alt+B');
  await overlay.locator('.fx[data-settled]').waitFor({ timeout: 20000 });
  const source = () => readFile(join(root, 'src/App.jsx'), 'utf8');

  // the craft finding's rule, as plumber reads it on this page
  const rules = await page.evaluate(async () => (await window.__plumb.craft({ timeout: 20000 })).findings.map((f) => f.rule));
  assert.ok(rules.includes('craft/concentric-radius'), `the inner panel is a craft finding: ${rules.join(', ')}`);
  const url = docsUrl('craft/concentric-radius');

  // walk the causes: the theme's padding has no "i", the craft finding has one
  await page.keyboard.press('Enter');
  const cause = overlay.locator('.fx .cause');
  await cause.waitFor({ timeout: 10000 });
  const seen = new Map();
  for (let i = 0; i < 12 && seen.size < 2; i++) {
    const name = await cause.locator('.cls').innerText();
    if (!seen.has(name)) seen.set(name, { what: await cause.locator('.what > span').first().innerText(), info: await cause.locator('.info').count() });
    if (seen.size < 2) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(150); }
  }
  assert.deepEqual(seen.get('p-[18px]')?.info, 0, `a theme finding has no rule page: ${JSON.stringify([...seen])}`);
  const craft = [...seen.values()].find((s) => s.info === 1);
  assert.ok(craft, `the craft finding carries one "i": ${JSON.stringify([...seen])}`);
  while (!(await cause.locator('.info').count())) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(150); }

  // named for what it opens, pointing at the rule's own page
  const what = (await cause.locator('.what > span').first().innerText()).trim();
  const info = overlay.getByRole('link', { name: `Why “${what}” matters (opens in a new tab)` });
  assert.equal(await info.count(), 1, `the link's accessible name says what it opens: ${what}`);
  assert.equal(await info.getAttribute('href'), url);
  assert.equal(await info.getAttribute('target'), '_blank');
  // it sits on the finding's line and never pushes it: a target of at least 24px
  const box = await info.boundingBox();
  assert.ok(box.width >= 24 && box.height >= 24, `24px target: ${JSON.stringify(box)}`);

  // a click opens the rule's page in a new tab
  const [clicked] = await Promise.all([context.waitForEvent('page'), info.click()]);
  await clicked.waitForLoadState();
  assert.equal(clicked.url(), url);
  await clicked.close();

  // by keyboard: focused, Enter opens the page, and the fix in hand stays untaken
  const before = await source();
  await info.focus();
  assert.equal(await overlay.evaluate((o) => o.shadowRoot.activeElement?.classList.contains('info')), true, 'the "i" takes focus');
  const [entered] = await Promise.all([context.waitForEvent('page'), page.keyboard.press('Enter')]);
  await entered.waitForLoadState();
  assert.equal(entered.url(), url);
  await page.waitForTimeout(600);
  assert.equal(await source(), before, 'Enter on the "i" writes nothing');
  assert.equal(await overlay.locator('.fx .said').count(), 0, 'no fix was taken');
  // with the fix in hand Tab is the next fix, so the "i" has its own key: I, from anywhere on the page
  assert.equal(await info.getAttribute('aria-keyshortcuts'), 'I');
  await overlay.evaluate((o) => o.shadowRoot.activeElement?.blur());
  const [keyed] = await Promise.all([context.waitForEvent('page'), page.keyboard.press('i')]);
  await keyed.waitForLoadState();
  assert.equal(keyed.url(), url);
  assert.equal(await source(), before, 'I writes nothing');
  assert.deepEqual(asked, Array(3).fill(url.split('#')[0]), 'only the docs page was asked for, once per open (the anchor stays in the tab)');

  // the page it names is there: the docs' rules reference gives this rule a heading with that anchor
  const reference = JSON.parse(await readFile(join(repo, 'site/src/docs/recordings/reference/rules.json'), 'utf8'));
  const ids = JSON.stringify(reference);
  assert.ok(ids.includes('"craft/concentric-radius"'), 'the rules reference lists craft/concentric-radius');
  assert.equal(new URL(url).hash, `#${ruleAnchor('craft/concentric-radius')}`);
  assert.deepEqual(errors, []);
});
