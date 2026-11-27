// What the headless craft run does to a page: open it with the overlay, let it settle, ask its craft engine a question.
import { fileURLToPath } from 'node:url';
import { UsageError } from './errors.js';

export type Page = import('playwright').Page;
export type Browser = import('playwright').Browser;
export type BrowserContextOptions = import('playwright').BrowserContextOptions;

/** The recorder every pair page starts with (overlay/src/craft-record.js, shipped beside dist/). */
export const RECORDER = fileURLToPath(new URL('../overlay/src/craft-record.js', import.meta.url));
export const sleep = (ms: number) => new Promise<void>(done => setTimeout(done, ms));
export const desktop = { width: 1280, height: 800 };

/** The page reloaded under a question (a file saved, a dev server's watcher): its context went, or the new page was
 *  asked before plumber's script was back on it ("reading 'craft'", U66). A closed page is not a reload. */
export const reloaded = (error: unknown) => /Execution context was destroyed|navigation|plumb-not-ready|reading 'craft'/i.test(String((error as Error)?.message ?? error));

/** After a reload: the page loaded again, plumber's script back on it, and the overlay's first read done (bounded). */
export async function back(page: Page, timeout = 15000): Promise<void> {
  await page.waitForLoadState('load', { timeout }).catch(() => {});
  await page.waitForFunction(() => { const p = (window as unknown as { __plumb?: { craft?: unknown; overlay?: unknown } }).__plumb; return !!(p?.craft && p.overlay); }, undefined, { timeout });
  await page.evaluate((limit) => Promise.race([(window as unknown as { __plumb: { ready?(): Promise<unknown> } }).__plumb.ready?.(),
    new Promise((done) => setTimeout(done, limit))]), timeout).catch(() => {});
  await settle(page, Math.min(timeout, 5000));
}

/** How long a page may keep reloading under a question before it is said: a burst of saves is waited out. */
export const RELOADING = 30000;

/** A question for the page's craft engine (overlay/src/craft-run.js, `op`). A page that reloads under it is waited
 *  for and asked again while the reloads last, up to RELOADING ms; then the last reload's error is thrown for the
 *  caller to say (U66: touched once a second for 12 s, a count of 4 tries gave up while the saves still came). */
export async function ask<T>(page: Page, args: Record<string, unknown>, within = RELOADING): Promise<T> {
  const until = Date.now() + within;
  for (;;) {
    try {
      return await page.evaluate((a) => {
        const p = (window as unknown as { __plumb?: { craft?(o: unknown): Promise<unknown> } }).__plumb;
        if (!p?.craft) throw new Error('plumb-not-ready');
        return p.craft(a);
      }, args) as T;
    } catch (error) {
      if (!reloaded(error) || Date.now() >= until) throw error;
      await back(page);
    }
  }
}

/** Open a route and wait for the overlay. `ready` also waits for the server's first read of the project. */
export async function open(page: Page, url: string, timeout: number, ready: boolean): Promise<void> {
  try { await page.goto(url, { waitUntil: 'load', timeout }); }
  catch (error) { throw new UsageError(`Could not open ${url}: ${(error as Error).message.split('\n')[0]}\n  → start your dev server, then: plumber craft --url <its address>`); }
  // a dev server that reloads once (dependency optimizing) destroys the first context: try again
  for (let attempt = 0; ; attempt++) {
    try {
      await page.waitForFunction(() => (window as unknown as { __plumb?: { overlay?: unknown } }).__plumb?.overlay, undefined, { timeout: Math.min(timeout, 15000) });
      if (!ready) return;
      // ready() waits while the server reads; a server that never finishes is a timeout, not a hang
      await page.evaluate((limit) => Promise.race([(window as unknown as { __plumb: { ready(): Promise<unknown> } }).__plumb.ready(),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`the overlay was not ready after ${limit}ms`)), limit))]), timeout);
      return;
    } catch (error) {
      const message = (error as Error).message;
      if (attempt < 3 && /context was destroyed|navigation/i.test(message)) { await page.waitForLoadState('load'); continue; }
      throw new UsageError(`${url} has no React Plumber overlay (${message.split('\n')[0]}).\n  → add plumb() to the Vite plugins and run the dev server: plumber install --overlay`);
    }
  }
}

/** The page has drawn what it will draw: no request out, nothing added to the page and no loading placeholder, all for
 * STILL ms at once (for up to `network` ms in all), then fonts in.
 *
 * "Network quiet" alone was read too early on a big app: cal.com's event types went quiet while its scripts started up,
 * then asked for its list, and one run read 151 elements where the next read 42 (2026-11-26). Quiet has to hold while
 * the page itself stops changing. */
const STILL = 800;
const PLACEHOLDER = '[aria-busy="true"], .animate-pulse, [data-loading="true"], [class*="skeleton" i]';
export async function settle(page: Page, network = 5000): Promise<boolean> {
  const end = Date.now() + network;
  await page.waitForLoadState('networkidle', { timeout: network }).catch(() => {});
  // requests out right now, counted from here on (the overlay's own reads to /__plumb/ are not the page's)
  let out = 0, last = Date.now(), settled = false;
  const mine = (r: import('playwright').Request) => !r.url().includes('/__plumb/') && ['fetch', 'xhr', 'script', 'document', 'stylesheet'].includes(r.resourceType());
  const sent = (r: import('playwright').Request) => { if (mine(r)) { out++; last = Date.now(); } };
  const done = (r: import('playwright').Request) => { if (mine(r)) { out = Math.max(0, out - 1); last = Date.now(); } };
  page.on('request', sent); page.on('requestfinished', done); page.on('requestfailed', done);
  try {
    while (Date.now() < end) {
      // the page's own changes for one window: elements added or removed, words changed, a placeholder still up
      const left = Math.max(0, end - Date.now());
      const still = await page.evaluate(({ window: ms, placeholder }) => new Promise<boolean>((resolve) => {
        let changed = false;
        // a placeholder stands in for content, so it has some size: a pulsing status dot (8px, "Live") is the page
        // at rest, and reading it as loading held every run of that page for the full limit (ledger example, 53 s)
        const waiting = () => [...document.querySelectorAll(placeholder)].some((el) => { const box = el.getBoundingClientRect(); return box.width > 16 || box.height > 16; });
        const watch = new MutationObserver((list) => { if (list.some((m) => m.type === 'characterData' || m.addedNodes.length || m.removedNodes.length)) changed = true; });
        watch.observe(document.body, { subtree: true, childList: true, characterData: true });
        setTimeout(() => { watch.disconnect(); resolve(!changed && !waiting()); }, ms);
      }), { window: Math.min(STILL, left), placeholder: PLACEHOLDER }).catch(() => true);
      if (still && out === 0 && Date.now() - last >= STILL) { settled = true; break; }
      if (!left) break;
    }
  } finally { page.off('request', sent); page.off('requestfinished', done); page.off('requestfailed', done); }
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  return settled;
}

/** The same route in a page of its own, with the recorder in before the app's first script. */
export async function inside<T>(browser: Browser, url: string, contextOptions: BrowserContextOptions, timeout: number, work: (page: Page) => Promise<T>, before?: (page: Page) => Promise<void>): Promise<T> {
  const context = await browser.newContext(contextOptions);
  try {
    const page = await context.newPage();
    await page.addInitScript({ path: RECORDER });
    await before?.(page);
    return await work(page);
  } finally { await context.close(); }
}

/** Responses of the app (not of Plumb) held back by `delay` ms. Returns when the first and last were let through. */
export async function hold(page: Page, delay: number): Promise<{ first(): number | null; last(): number | null }> {
  let first: number | null = null, last: number | null = null;
  await page.route('**/*', async route => {
    const request = route.request();
    if (!['fetch', 'xhr'].includes(request.resourceType()) || request.url().includes('/__plumb/')) return route.continue();
    first ??= Date.now();
    await sleep(delay);
    last = Date.now();
    await route.continue().catch(() => {});
  });
  return { first: () => first, last: () => last };
}

