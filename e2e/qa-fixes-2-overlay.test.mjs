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

test('timeline 3 + 4: a spacing write is one named step with its law; the panel’s Undo takes back that step (undo-group) and History says it', { timeout: 150000 }, async (t) => {
  const o = await open(t); if (!o) return;
  const { page, overlay, alt, read, original, trace, posts, errors } = o;
  await alt('#wrapper');
  await pointLeftPad(page, '#wrapper');
  await page.waitForFunction(() => /padding left/.test(document.querySelector('plumb-overlay').shadowRoot.querySelector('.sp-bub')?.innerText ?? ''));
  await page.mouse.wheel(0, -100);
  await overlay.locator('.fx .said').filter({ hasText: /padding left \d+px/ }).waitFor({ timeout: 20000 });
  assert.notEqual(await read(), original);
  const write = posts.find((p) => p.path === 'swaps');
  assert.ok(write?.body?.trace?.group, `the write is tagged with its step: ${JSON.stringify(write?.body)}`);
  const changes = (await trace()).filter((c) => c.group === write.body.trace.group);
  assert.ok(changes.length >= 1, 'the trace has the step');
  assert.equal(changes[0].meta?.step, 'Spacing');
  assert.ok((changes[0].meta?.laws ?? []).some((l) => l.name === 'Law of proximity'), JSON.stringify(changes[0].meta));

  // the panel's Undo: POST undo-group for that step, never a whole-file undo; the file is back; History says it
  await overlay.locator('.fx .said .undo').click();
  await page.waitForFunction(() => /Undone/.test(document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.wt:not([hidden]), .fx .said')?.textContent ?? ''), null, { timeout: 30000 });
  assert.equal(await read(), original);
  assert.deepEqual(posts.filter((p) => p.path === 'undo').map((p) => p.path), [], 'no whole-file undo');
  assert.deepEqual(posts.filter((p) => p.path === 'undo-group').map((p) => p.body.group), [write.body.trace.group]);
  const after = (await trace()).filter((c) => c.group === write.body.trace.group);
  assert.ok(after.every((c) => c.state === 'undone'), JSON.stringify(after.map((c) => c.state)));
  await overlay.locator('.wt').filter({ hasText: /Undone/ }).waitFor({ timeout: 10000 });
  assert.equal(await overlay.locator('.fx .said').filter({ hasText: /Undone/ }).count(), 0, 'History says it, with its Undo; the panel says nothing more');
  assert.deepEqual(errors, []);
});

test('N-05: a card whose classes are built in code lights no band, takes no wheel and writes nothing', { timeout: 120000 }, async (t) => {
  const o = await open(t); if (!o) return;
  const { page, overlay, alt, read, original, posts, errors } = o;
  await alt('#qa-built');
  await overlay.locator('.ec .down').waitFor({ timeout: 20000 });
  await page.evaluate(() => { window.__wheels = []; document.addEventListener('wheel', (e) => window.__wheels.push(e.defaultPrevented), { passive: true }); });
  await pointLeftPad(page, '#qa-built');
  await page.waitForTimeout(300);
  const lit = await shadow(page, (root) => ({ bubble: [...root.querySelectorAll('.sp-bub')].filter((b) => !b.hidden).length, bands: root.querySelectorAll('.sp-layer .sp-band').length }));
  assert.deepEqual(lit, { bubble: 0, bands: 0 }, 'nothing offered on a locked element');
  await page.mouse.wheel(0, -100);
  await page.waitForTimeout(1500);
  assert.deepEqual(await page.evaluate(() => window.__wheels), [false], 'the wheel is the page’s');
  assert.equal(await read(), original);
  assert.deepEqual(posts.filter((p) => /swap|prop|set/.test(p.path)), []);
  assert.deepEqual(errors, []);
});

test('N-08: "N problems here" on a card is one number for one element, read alone or with the whole page, and the bar’s unit', { timeout: 150000 }, async (t) => {
  const o = await open(t); if (!o) return;
  const { page, overlay, card, alt, settle, errors } = o;
  const here = async () => { await card.locator('.more').waitFor({ timeout: 20000 }); return Number(/(\d+) problems? here/.exec(await card.locator('.more').innerText())?.[1]); };
  await alt('#wrapper');
  await page.waitForTimeout(800);
  const alone = await here();
  // the bar, for the element read: its problems are the card's
  const bar = Number(/(\d+) problems?/.exec(await overlay.locator('.fx').innerText())?.[1] ?? NaN);
  await page.keyboard.press('Escape'); await card.waitFor({ state: 'hidden', timeout: 5000 });
  await page.keyboard.press('Escape'); await overlay.locator('.fx').waitFor({ state: 'hidden', timeout: 5000 });
  await page.keyboard.press('Alt+KeyB');
  await settle();
  await alt('#wrapper');
  await page.waitForTimeout(800);
  const whole = await here();
  assert.ok(alone > 0, `the wrapper has problems: ${alone}`);
  assert.equal(whole, alone, `the same element, read alone (${alone}) or with the page (${whole})`);
  assert.equal(bar, alone, `the bar says ${bar} for the element the card says ${alone} about`);
  assert.deepEqual(errors, []);
});

test('F8-05: a cause drawn inside and outside the element read counts its copies in one unit: here + outside = every copy on the page', { timeout: 150000 }, async (t) => {
  const o = await open(t); if (!o) return;
  const { page, overlay, alt, errors } = o;
  // the pair's gap, between its two children: the pair itself, never their words
  const pb = await page.locator('#qa-pair').boundingBox(), first = await page.locator('#qa-pair > span').first().boundingBox();
  await alt('#qa-pair', { x: first.x - pb.x + first.width + 3, y: pb.height / 2 });
  await page.keyboard.press('.');
  await overlay.locator('.fx .cause').waitFor({ timeout: 20000 });
  for (let i = 0; i < 12 && !/7px/.test(await overlay.locator('.fx .cause .cls').innerText()); i++) { await overlay.locator('.fx .cause .next').click(); await page.waitForTimeout(200); }
  const what = await overlay.locator('.fx .cause .what').innerText(), all = await overlay.locator('.fx').innerText();
  assert.match(await overlay.locator('.fx .cause .cls').innerText(), /7px/);
  const hereN = Number(/(\d+) here/.exec(what)?.[1] ?? 1), outside = Number(/draws (\d+) more outside it/.exec(all)?.[1] ?? NaN);
  const copies = await page.evaluate(() => document.querySelectorAll('span.px-\\[7px\\].rounded-tag').length);
  assert.equal(copies, 3);
  assert.equal(hereN + outside, copies, `${what} / ${all}`);
  assert.doesNotMatch(all, /other places|on the page ·/, 'copies are never called places');
  assert.deepEqual(errors, []);
});

test('F3-06: in Blueprint over the whole page, Esc closes the card and the next Esc leaves', { timeout: 120000 }, async (t) => {
  const o = await open(t); if (!o) return;
  const { page, overlay, alt, settle, errors } = o;
  await page.keyboard.press('Alt+KeyB');
  await settle();
  await alt('#truncated', { x: 10, y: 6 }, '.tc');
  await page.keyboard.press('Escape');
  await overlay.locator('.tc').waitFor({ state: 'hidden', timeout: 5000 });
  await page.keyboard.press('Escape');
  await overlay.locator('.fx').waitFor({ state: 'hidden', timeout: 5000 });
  assert.deepEqual(errors, []);
});

test('N-11: with a card open, Blueprint’s pill never shows over the card or the spacing bubble', { timeout: 120000 }, async (t) => {
  const o = await open(t); if (!o) return;
  const { page, alt, errors } = o;
  await page.keyboard.press('Alt+KeyB');
  await o.settle();
  await alt('#wrapper');
  for (const [dx, dy] of [[4, 20], [6, 40], [3, 60], [200, 4], [200, 7]]) {
    const b = await page.locator('#wrapper').boundingBox();
    await page.mouse.move(b.x + dx, b.y + dy); await page.mouse.move(b.x + dx + 1, b.y + dy);
    await page.waitForTimeout(150);
    const pills = await shadow(page, (root) => [...root.querySelectorAll('.bp-hint[data-on]')].filter((p) => getComputedStyle(p).visibility !== 'hidden' && getComputedStyle(p).opacity !== '0').map((p) => p.innerText));
    assert.deepEqual(pills, [], `pointing at ${dx},${dy}`);
  }
  assert.deepEqual(errors, []);
});

test('F3-04: with a card on the element under the fix bar, pointing at the bar (or Alt+clicking it) never lights a band or a bubble', { timeout: 120000 }, async (t) => {
  const o = await open(t, { viewport: { width: 1280, height: 800 } }); if (!o) return;
  const { page, overlay, card, altAt, settle, errors } = o;
  await page.locator('#tall').evaluate((n) => n.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(300);
  // the bar shows once Blueprint is on: read #tall first, then Alt+click through the bar
  const t0 = await page.locator('#tall').boundingBox();
  await altAt(t0.x + 300, t0.y + t0.height / 2);
  await card.locator('.drill').first().waitFor({ timeout: 20000 }); await settle();
  const bar = await overlay.locator('.fx').boundingBox();
  const at = [bar.x + 60, bar.y + bar.height / 2];
  const bubble = () => shadow(page, (root) => [...root.querySelectorAll('.sp-bub')].filter((b) => !b.hidden).map((b) => b.innerText.replace(/\s+/g, ' ')));
  for (let round = 0; round < 2; round++) {
    await page.mouse.move(700, 200); await page.mouse.move(700, 201);
    await page.mouse.move(at[0], at[1]); await page.mouse.move(at[0] + 1, at[1]);
    await page.waitForTimeout(250);
    assert.deepEqual(await bubble(), [], `round ${round}: pointing at the bar`);
    // Alt+click on the bar: the element under it is read; the bar is still pointed at
    await altAt(at[0] + 1, at[1]);
    await page.waitForTimeout(1500);
    const now = await overlay.locator('.fx').boundingBox();
    const onBar = at[0] + 1 >= now.x && at[0] + 1 <= now.x + now.width && at[1] >= now.y && at[1] <= now.y + now.height;
    if (onBar) assert.deepEqual(await bubble(), [], `round ${round}: after Alt+click on the bar`);
  }
  assert.deepEqual(errors, []);
});

test('F3-05 + timeline 10: at 820px, after Alt+click on words, one owner: no hint over the bar, and the bar is one line', { timeout: 120000 }, async (t) => {
  const o = await open(t, { viewport: { width: 820, height: 900 }, hints: true }); if (!o) return;
  const { page, overlay, alt, errors } = o;
  await alt('#prose', { x: 30, y: 6 }, '.tc');
  for (const wait of [100, 600, 1500]) {
    await page.waitForTimeout(wait);
    const seen = await shadow(page, (root) => {
      const on = (sel) => [...root.querySelectorAll(sel)].filter((el) => !el.hidden && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).opacity !== '0').map((el) => el.getBoundingClientRect());
      return { tip: on('.tip'), bar: on('.fx'), card: on('.tc'), setup: on('.rd-callout'), expanded: root.querySelectorAll('.fx .cause').length };
    });
    const pairs = [];
    for (const [a, b] of [['tip', 'bar'], ['tip', 'card'], ['setup', 'bar'], ['setup', 'tip'], ['bar', 'card']]) for (const r of seen[a]) for (const s of seen[b]) if (overlap(r, s)) pairs.push(`${a} over ${b}`);
    assert.deepEqual(pairs, [], `${wait}ms after: ${JSON.stringify(seen)}`);
    assert.equal(seen.expanded, 0, 'no fix expanded while the card is open');
  }
  assert.deepEqual(errors, []);
});

const tidyOpen = async (o, sel) => {
  const { page, card, alt } = o;
  await alt(sel, { x: 6, y: 6 }, '.ec .tidy-go');
  await card.locator('.tidy-go').click();
  await card.locator('.tidy-row, .note').first().waitFor({ timeout: 20000 });
  await page.waitForFunction(() => !/Reading/.test(document.querySelector('plumb-overlay').shadowRoot.querySelector('.ec .use')?.innerText ?? ''), null, { timeout: 20000 }).catch(() => {});
  return (await card.locator('.tidy-row').allInnerTexts()).map((r) => r.replace(/\s+/g, ' ').trim());
};

test('timeline 7: Tidy never evens out a gap that sets a group apart (proximity wins)', { timeout: 120000 }, async (t) => {
  const o = await open(t, { app: TIDY_APP, query: '' }); if (!o) return;
  const rows = await tidyOpen(o, '#aside');
  assert.ok(!rows.some((r) => /^Space (inside|above)/.test(r) && /even/.test(r)), rows.join('\n'));
  assert.deepEqual(o.errors, []);
});

test('timeline 8 + 3: on a block, Tidy evens the gaps through the children’s margins (never a gap that does nothing), as one Tidy step with its laws', { timeout: 150000 }, async (t) => {
  const o = await open(t, { app: TIDY_APP, query: '' }); if (!o) return;
  const { page, overlay, card, read, original, posts, trace, errors } = o;
  const rows = await tidyOpen(o, '#stack');
  assert.ok(rows.some((r) => /^Space above/.test(r)), rows.join('\n'));
  assert.ok(!rows.some((r) => /^Space inside/.test(r)), rows.join('\n'));
  await card.locator('.use:not([disabled])').waitFor({ timeout: 20000 });
  await card.locator('.use').click();
  await overlay.locator('.fx .said').filter({ hasText: /Tidied/ }).waitFor({ timeout: 20000 });
  const now = await read();
  assert.match(now, /<p className="mt-(?:s2|2) text-small">Second line<\/p>/, now);
  assert.doesNotMatch(now.split('id="stack"')[1].split('</div>')[0], /gap-/, 'no gap on a block');
  const group = posts.find((p) => /swaps|prop/.test(p.path))?.body?.trace?.group;
  assert.ok(group, 'tidy’s write names its step');
  const steps = (await trace()).filter((c) => c.group === group);
  assert.ok(steps.length && steps.every((c) => c.meta?.step === 'Tidy'), JSON.stringify(steps.map((c) => c.meta)));
  await page.waitForTimeout(500);
  await overlay.locator('.fx .said .undo').click();
  await page.waitForFunction(() => /Undone/.test(document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.wt:not([hidden]), .fx .said')?.textContent ?? ''), null, { timeout: 30000 });
  assert.equal(await read(), original);
  assert.deepEqual(errors, []);
});

test('N-07: copies one line of code draws are one Tidy change: listed once, written once', { timeout: 150000 }, async (t) => {
  const o = await open(t, { app: TIDY_APP, query: '' }); if (!o) return;
  const { card, overlay, posts, errors } = o;
  const rows = await tidyOpen(o, '#phone');
  assert.ok(rows.length > 0, 'something to tidy');
  assert.equal(new Set(rows).size, rows.length, `no row twice:\n${rows.join('\n')}`);
  assert.equal(rows.filter((r) => /Dismiss/.test(r)).length, 1, `the labels drawn by the map are one change:\n${rows.join('\n')}`);
  await card.locator('.use:not([disabled])').waitFor({ timeout: 20000 });
  await card.locator('.use').click();
  await overlay.locator('.fx .said').filter({ hasText: /Tidied/ }).waitFor({ timeout: 20000 });
  const edits = posts.filter((p) => p.path === 'swaps').flatMap((p) => p.body.edits.map((e) => JSON.stringify([p.body.file, e.line, e.column, e.from, e.to])));
  assert.equal(new Set(edits).size, edits.length, `no edit twice: ${edits.join(' ')}`);
  assert.deepEqual(errors, []);
});

test('N-04: a className that is a ternary of plain strings is writable in the branch it is written in', { timeout: 120000 }, async (t) => {
  const o = await open(t); if (!o) return;
  const { page, overlay, card, alt, read, original, errors } = o;
  await alt('#qa-tern');
  await page.waitForTimeout(500);
  assert.equal(await card.locator('.drill[disabled]').count(), 0, `not locked: ${await card.innerText()}`);
  await pointLeftPad(page, '#qa-tern');
  await page.waitForFunction(() => /padding left/.test(document.querySelector('plumb-overlay').shadowRoot.querySelector('.sp-bub')?.innerText ?? ''));
  await page.mouse.wheel(0, -100);
  await overlay.locator('.fx .said').filter({ hasText: /padding left \d+px/ }).waitFor({ timeout: 20000 });
  const now = await read(), line = now.split('\n').find((l) => l.includes('id="qa-tern"'));
  assert.match(line, /TONE \? 'flex gap-s2 [^']*p[ls]?-s4[^']*' : 'grid'/, line);
  assert.equal(now.split('\n').filter((l, i) => l !== original.split('\n')[i]).length, 1, 'only that line');
  assert.deepEqual(errors, []);
});

test('N-02: a padding change on a class in a variable a template reads is written in that variable, never into the template’s branch', { timeout: 120000 }, async (t) => {
  const o = await open(t); if (!o) return;
  const { page, overlay, alt, read, errors } = o;
  await alt('#qa-link', { x: 2, y: 2 }, '.ec .drill, .tc');
  if (await overlay.locator('.tc').isVisible()) { await page.keyboard.down('Alt'); await page.keyboard.press('ArrowUp'); await page.keyboard.up('Alt'); await overlay.locator('.ec .drill').first().waitFor({ timeout: 20000 }); }
  await pointLeftPad(page, '#qa-link');
  await page.waitForFunction(() => /padding left/.test(document.querySelector('plumb-overlay').shadowRoot.querySelector('.sp-bub')?.innerText ?? ''));
  await page.mouse.wheel(0, -100);
  await overlay.locator('.fx .said').filter({ hasText: /padding left \d+px/ }).waitFor({ timeout: 20000 });
  const now = await read();
  const look = now.split('\n').find((l) => l.includes('const look'));
  // the left padding goes where px-2.5 is written (the variable), beside it: never into the template's branch
  assert.match(look, /'inline-flex px-2\.5 pl-\S+ py-1 rounded-tag'/, look);
  assert.match(now, /\? '' : 'hover:bg-ground active:bg-surface'\}/, 'the branch is as it was');
  assert.deepEqual(errors, []);
});

test('N-03: the card names the line its layout write lands on (a component given its classes at the usage)', { timeout: 150000 }, async (t) => {
  const o = await open(t); if (!o) return;
  const { page, overlay, card, alt, read, original, errors } = o;
  const pb = await page.locator('#qa-panel').boundingBox(), first = await page.locator('#qa-panel > span').first().boundingBox();
  await alt('#qa-panel', { x: first.x - pb.x + first.width + 3, y: pb.height / 2 });
  const usage = original.split('\n').findIndex((l) => l.includes('p-4 flex gap-2')) + 1;
  await page.waitForTimeout(500);
  assert.match(await card.locator('.hd .at').first().innerText(), new RegExp(`App\\.jsx:${usage}$`), (await card.innerText()).replace(/\s+/g, ' '));
  await card.locator('.drill[data-open="layout"]').click();
  await card.locator('[data-lmode="grid"]').click();
  assert.match(await card.locator('.hd .at').first().innerText(), new RegExp(`App\\.jsx:${usage}$`), 'Writes names the same line');
  await card.locator('.use:not([disabled])').click();
  await overlay.locator('.fx .said').waitFor({ timeout: 20000 });
  const now = (await read()).split('\n');
  const changed = now.map((l, i) => (l !== original.split('\n')[i] ? i + 1 : 0)).filter(Boolean);
  assert.deepEqual(changed, [usage], `written at ${changed}, said ${usage}`);
  assert.match(now[usage - 1], /grid/);
  assert.deepEqual(errors, []);
});
