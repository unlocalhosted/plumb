// React Plumber used, and React Plumber failing, in someone's app with someone's extension: what the app hears.
//
// "Hears" is what Next's dialog, webpack's overlay and an error reporter hear: the window's error and
// unhandledrejection events and console.error, listened for before any framework code runs, plus Next's issues badge.
// Every case asserts there was none. The last proves the listening works: the app's own errors are all heard.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { hostileBrowser } from './browser.mjs';
import { installApp, serve } from './hosts.mjs';

const heardOn = new WeakMap();
let watching;
function watchedBrowser() {
  watching ??= (async () => {
    const context = await hostileBrowser();
    await context.exposeBinding('__appHeard', ({ page }, item) => { heardOn.get(page)?.push(item); });
    await context.addInitScript(() => {
      const tell = (kind, value) => {
        const item = { kind, message: String(value?.message ?? value).slice(0, 300), stack: String(value?.stack ?? '').slice(0, 1500) };
        window.__appHeard?.(item).catch(() => {});
      };
      addEventListener('error', (event) => tell('error', event.error ?? event.message));
      addEventListener('unhandledrejection', (event) => tell('unhandled rejection', event.reason));
      const error = console.error;
      console.error = function (...args) {
        tell('console.error', args.find((arg) => arg instanceof Error) ?? args.map(String).join(' '));
        return error.apply(this, args);
      };
    });
    return context;
  })();
  return watching;
}

async function visit(t, url, { before, load = 'ready' } = {}) {
  const page = await (await watchedBrowser()).newPage(), heard = [];
  t.after(() => page.close());
  heardOn.set(page, heard);
  let out = 0, busyAt = Date.now();
  const asking = new Set();
  page.on('request', (request) => { if (/\/__plumb\//.test(request.url())) { asking.add(request); out = asking.size; busyAt = Date.now(); } });
  const answered = (request) => { if (asking.delete(request)) { out = asking.size; busyAt = Date.now(); } };
  page.on('requestfinished', answered);
  page.on('requestfailed', answered);
  // until Plumber has stopped asking, which is when a failure of one of its questions has had its chance to be heard
  const settled = async (max = 8000) => {
    for (const end = Date.now() + max; Date.now() < end; await delay(100)) if (!out && Date.now() - busyAt > 700) return;
  };
  await before?.(page);
  await page.goto(url, { waitUntil: load === 'early' ? 'commit' : 'load', timeout: 120000 });
  if (load === 'ready') {
    await page.waitForFunction(() => window.__plumb?.ready, null, { timeout: 60000 });
    await page.evaluate(() => window.__plumb.ready());
  }
  const badge = () => page.evaluate(() => [...document.querySelectorAll('nextjs-portal')].some((portal) => !!portal.shadowRoot?.querySelector('[data-issues-open], [data-issues-count]')));
  const clean = async () => {
    await settled();
    await delay(300);
    assert.deepEqual(heard, [], 'the app heard an error');
    assert.equal(await badge().catch(() => false), false, "Next's issues badge is showing");
  };
  return { page, heard, badge, settled, clean };
}

const pointIn = (page, selector) => page.evaluate((selector) => {
  const el = document.querySelector(selector);
  if (!el) return null;
  el.scrollIntoView({ block: 'center', behavior: 'instant' });
  const node = [...el.childNodes].find((n) => n.nodeType === 3 && n.data.trim()), range = document.createRange();
  range.setStart(node, 2); range.setEnd(node, 3);
  const box = range.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}, selector);

async function holdAlt(page) {
  // let go before, while and after the reading comes back: a withdrawn question is one that used to be heard
  for (const [selector, ms] of [['.title', 25], ['.lead', 120], ['.client', 260], ['.mdx p', 60], ['.title', 450]]) {
    const at = await pointIn(page, selector);
    if (!at) continue;
    await page.mouse.move(2, 2);
    await page.keyboard.down('Alt');
    await page.mouse.move(at.x, at.y, { steps: 2 });
    await delay(ms);
    await page.keyboard.up('Alt');
    await delay(150);
  }
}
const inBlueprint = (page) => page.evaluate(() => !!document.querySelector('plumb-overlay')?.hasAttribute('data-blueprint'));
async function doubleClick(page, selector, wait = 10000) {
  const at = await pointIn(page, selector);
  await page.mouse.dblclick(at.x, at.y);
  const tag = page.locator('plumb-overlay .tx-tag:not([hidden])');
  try { await tag.first().waitFor({ timeout: wait }); } catch { return { kind: 'nothing' }; }
  return { kind: await tag.first().getAttribute('data-kind'), says: await tag.first().innerText() };
}
async function leave(page) {
  await page.keyboard.press('Escape');
  await page.mouse.click(2, 2);
  await delay(550); // past the double-click interval
}
async function everyGesture(page, settled) {
  await holdAlt(page);
  await page.keyboard.press('Alt+b');
  await settled(5000);
  if (await inBlueprint(page)) await page.keyboard.press('Alt+b');
  await doubleClick(page, '.lead', 1500);
  await leave(page);
}
const counts = async (page) => {
  for (const end = Date.now() + 30000; Date.now() < end; await delay(300)) {
    await page.click('#count', { timeout: 5000 }).catch(() => {});
    if (/Count [1-9]/.test(await page.textContent('#count').catch(() => ''))) return true;
  }
  return false;
};

/** Every case, as subtests, on one host. */
export async function appHearsNothing(t, name, bundler) {
  const app = await installApp(name), server = await serve(t, app, bundler), url = server.url;
  const origin = new URL(url).origin;
  // compile the page before any case times it
  await fetch(url, { signal: AbortSignal.timeout(120000) });

  await t.test('holding Alt, Blueprint and editing words', async (t) => {
    const { page, settled, clean } = await visit(t, url);
    await holdAlt(page);
    await page.keyboard.press('Alt+b');
    await page.waitForFunction(() => document.querySelector('plumb-overlay').hasAttribute('data-blueprint'), null, { timeout: 10000 });
    await settled();
    await page.keyboard.press('Alt+b');
    for (const selector of ['.title', '.lead', '.client']) {
      assert.equal((await doubleClick(page, selector)).kind, 'edit', `${selector} is edited on a double-click`);
      await leave(page);
    }
    if (app.next) {
      const mdx = await doubleClick(page, '.mdx p');
      assert.equal(mdx.kind, 'refused', 'words from MDX are refused');
      assert.match(mdx.says, /MDX/, 'and the refusal says what to do about them');
      await leave(page);
    }
    await clean();
  });

  await t.test('holding Alt while the page is still loading', async (t) => {
    const { page, clean } = await visit(t, url, { load: 'early' });
    await page.keyboard.down('Alt');
    await page.mouse.move(90, 70);
    await delay(1500);
    await page.keyboard.up('Alt');
    await page.waitForLoadState('load');
    await clean();
  });

  await t.test('words beside a bold run, edited and saved', async (t) => {
    const was = await app.read();
    t.after(() => writeFile(join(app.root, app.page), was));
    const { page, settled, clean } = await visit(t, url);
    assert.equal((await doubleClick(page, '.lead')).kind, 'edit');
    await page.keyboard.type('Text'); // over the word the double-click selected
    await page.keyboard.press('Enter');
    let now = '';
    for (let i = 0; i < 100 && !now.includes('Text on the page'); i++) { await delay(100); now = await app.read(); }
    assert.equal(now, was.replace('Words on the page', 'Text on the page'), 'the source has that edit and no other');
    await page.waitForFunction(() => document.querySelector('.lead')?.textContent.startsWith('Text on the page'), null, { timeout: 20000 });
    await settled();
    await delay(550); // past the double-click interval
    assert.equal((await doubleClick(page, '.lead')).kind, 'edit', 'the saved words can be edited again');
    await leave(page);
    await clean();
  });

  const answers = (status) => (route) => route.fulfill({ status, body: '{}', contentType: 'application/json', headers: { 'access-control-allow-origin': origin } });
  for (const [what, handle] of [
    ['can’t be reached', (route) => route.abort('connectionrefused')],
    ['answers 500', answers(500)],
    ['refuses the token', answers(401)],
  ]) {
    await t.test(`Plumber’s server ${what}, and every gesture is tried`, async (t) => {
      const { page, settled, clean } = await visit(t, url);
      await page.route('**/__plumb/**', handle);
      await everyGesture(page, settled);
      await clean();
    });
  }

  const refuse = (pattern) => (page) => page.route(pattern, (route) => route.abort('connectionrefused'));
  for (const [what, before] of [
    ['is still reading the project', (page) => page.route(/\/__plumb\/health/, answers(503))],
    ['can’t answer at all', refuse(/\/__plumb\/health/)],
    ['can’t serve its stylesheet', refuse(/\/__plumb\/src\/tokens\.css/)],
    ['can’t serve one of its modules', refuse(/\/__plumb\/src\/sourcemap\.js/)],
  ]) {
    await t.test(`the page loads while Plumber ${what}: the app works`, async (t) => {
      const { page, clean } = await visit(t, url, { before, load: 'load' });
      assert.ok(await counts(page), 'the app still answers a click');
      await clean();
    });
  }

  if (app.next) {
    await t.test('the sidecar can’t be reached: the overlay loads through the route', async (t) => {
      const elsewhere = (address) => address.pathname.startsWith('/__plumb/') && address.origin !== origin;
      const { page, clean } = await visit(t, url, { before: refuse(elsewhere) });
      assert.equal((await doubleClick(page, '.title')).kind, 'edit');
      await leave(page);
      await clean();
    });
  }

  await t.test('the app’s own errors are still the app’s, and are heard', async (t) => {
    const { page, heard, badge } = await visit(t, url);
    await page.evaluate(() => {
      const script = document.createElement('script');
      script.textContent = "setTimeout(function appThrows() { throw new Error('APP THROW') });"
        + "Promise.reject(new Error('APP REJECT'));"
        + "setTimeout(function appDefines() { Object.defineProperty(Object.freeze({}), 'x', { value: 1 }) });"
        // handled by the app: only the extension's copy of it is left to be heard, so the extension is really in
        + "fetch('file:///nowhere').catch(function () {});";
      document.body.append(script);
    });
    const find = (pattern) => heard.find((item) => pattern.test(item.message));
    for (let i = 0; i < 80 && ![/APP THROW/, /APP REJECT/, /define property/, /Failed to fetch/].every(find); i++) await delay(100);
    assert.ok(find(/APP THROW/), "the app's throw is heard");
    assert.ok(find(/APP REJECT/), "the app's rejection is heard");
    assert.ok(find(/Failed to fetch/), 'the fetch-wrapping extension is in the page');
    assert.doesNotMatch(find(/define property/)?.stack ?? 'not heard: /__plumb/', /\/__plumb\//, "the app's error names the app's line, not Plumber's");
    if (app.next) {
      for (let i = 0; i < 50 && !await badge(); i++) await delay(100);
      assert.ok(await badge(), "Next's issues badge is seen when there is an issue");
    }
  });

  await t.test('the dev server stops under an open page, and every gesture is tried', async (t) => {
    const { page, settled, clean } = await visit(t, url);
    await server.stop();
    await everyGesture(page, settled);
    await clean();
  });
}
