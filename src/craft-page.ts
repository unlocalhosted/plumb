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

/** A question for the page's craft engine (overlay/src/craft-run.js, `op`). */
export const ask = <T>(page: Page, args: Record<string, unknown>): Promise<T> =>
  page.evaluate((a) => (window as unknown as { __plumb: { craft(o: unknown): Promise<unknown> } }).__plumb.craft(a), args) as Promise<T>;

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

/** The page has drawn what it will draw: requests quiet, fonts in. */
export async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await sleep(300);
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

