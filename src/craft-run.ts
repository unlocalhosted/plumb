import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UsageError } from './errors.js';
import { makeFinding } from './messages.js';
import { tool } from './report.js';
import type { Declaration, Finding, Report, Site } from './report.js';

/** One craft finding as the page reports it (overlay/src/craft-run.js), with its source site. */
export interface CraftRecord {
  rule: string; title: string; because: string; action: string; text: string; value: unknown; confidence: number | null;
  evidence: Record<string, unknown>; file: string | null; line: number | null; column: number | null; component: string | null; tag: string; count: number;
}
export interface CraftPage { route: string; url: string; read: number; complete: boolean; findings: CraftRecord[] }
export interface CraftRunOptions { url: string; routes: string[]; root: string; timeout: number; viewport?: { width: number; height: number }; pairs?: boolean }
type Page = import('playwright').Page;
type Browser = import('playwright').Browser;
type BrowserContextOptions = import('playwright').BrowserContextOptions;

const missing = `The headless run needs Playwright, an optional dependency.
  → npm i -D playwright && npx playwright install chromium
  Set PLUMBER_CHROMIUM to use an installed Chrome or Chromium instead.`;

async function playwright(): Promise<{ chromium: import('playwright').BrowserType }> {
  try { return await import('playwright') as unknown as { chromium: import('playwright').BrowserType }; }
  catch { throw new UsageError(missing); }
}

/** The recorder every pair page starts with (overlay/src/craft-record.js, shipped beside dist/). */
const RECORDER = fileURLToPath(new URL('../overlay/src/craft-record.js', import.meta.url));
const sleep = (ms: number) => new Promise<void>(done => setTimeout(done, ms));
const desktop = { width: 1280, height: 800 };

/** A question for the page's craft engine (overlay/src/craft-run.js, `op`). */
const ask = <T>(page: Page, args: Record<string, unknown>): Promise<T> =>
  page.evaluate((a) => (window as unknown as { __plumb: { craft(o: unknown): Promise<unknown> } }).__plumb.craft(a), args) as Promise<T>;

/** Open a route and wait for the overlay. `ready` also waits for the server's first read of the project. */
async function open(page: Page, url: string, timeout: number, ready: boolean): Promise<void> {
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
async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await sleep(300);
}

/** The same route in a page of its own, with the recorder in before the app's first script. */
async function inside<T>(browser: Browser, url: string, contextOptions: BrowserContextOptions, timeout: number, work: (page: Page) => Promise<T>, before?: (page: Page) => Promise<void>): Promise<T> {
  const context = await browser.newContext(contextOptions);
  try {
    const page = await context.newPage();
    await page.addInitScript({ path: RECORDER });
    await before?.(page);
    return await work(page);
  } finally { await context.close(); }
}

/** Responses of the app (not of Plumb) held back by `delay` ms. Returns when the first and last were let through. */
async function hold(page: Page, delay: number): Promise<{ first(): number | null; last(): number | null }> {
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

interface Spinner { at: string; t0: number; t1: number }
interface Recorded { spinners: Spinner[]; shifts: { t: number; value: number; input: boolean; at: string[] }[]; now: number }

/** The page while its responses wait, and after: skeletons and spinners, fast and slow. Null when it fetches nothing. */
async function takeHeld(browser: Browser, url: string, timeout: number): Promise<unknown> {
  const slow = await inside(browser, url, { viewport: desktop }, timeout, async page => {
    const gate = await hold(page, 2000);
    await open(page, url, timeout, false);
    // the first response has been waiting a second: the skeletons are on the page
    for (let waited = 0; gate.first() === null && waited < 3000; waited += 100) await sleep(100);
    if (gate.first() === null) return null;
    const wait = gate.first()! + 1000 - Date.now();
    if (wait > 0) await sleep(wait);
    const during = await ask<{ at: string; h: number; n: number }[]>(page, { op: 'skeletons' });
    const mark = (await ask<Recorded>(page, { op: 'recorded' })).now;
    // every response is in, and the page has settled
    while (Date.now() < (gate.last() ?? 0) + 800) await sleep(100);
    await settle(page);
    const after = await ask<{ at: string; h: number | null; n: number | null }[]>(page, { op: 'heights', keys: during.map(item => item.at) });
    const recorded = await ask<Recorded>(page, { op: 'recorded' });
    const skeletons = during.map((item, index) => {
      const landed = after[index]!;
      const shift = recorded.shifts.filter(entry => entry.t > mark && !entry.input && entry.at.some(place => place === item.at || place.startsWith(`${item.at}>`))).reduce((sum, entry) => sum + entry.value, 0);
      return { at: item.at, before: { h: item.h, n: item.n }, after: { h: landed.h, n: landed.n }, shift };
    });
    return { skeletons, spinners: recorded.spinners };
  });
  if (!slow) return null;
  const fast = await inside(browser, url, { viewport: desktop }, timeout, async page => {
    const gate = await hold(page, 50);
    await open(page, url, timeout, false);
    for (let waited = 0; gate.first() === null && waited < 3000; waited += 100) await sleep(100);
    await settle(page);
    return (await ask<Recorded>(page, { op: 'recorded' })).spinners;
  });
  const longest = (list: Spinner[], at: string) => list.filter(item => item.at === at).reduce<number | null>((most, item) => Math.max(most ?? 0, item.t1 - item.t0), null);
  const spinners = [...new Set(slow.spinners.map(item => item.at))].map(at => ({ at, fast: longest(fast, at), slow: longest(slow.spinners, at) }));
  return { skeletons: slow.skeletons, spinners };
}

/** Does anything at a scroll container's edges change with how far it is scrolled? Its content hidden, so only the container's own painting is compared. */
async function takeScrolled(browser: Browser, url: string, timeout: number): Promise<unknown> {
  return inside(browser, url, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }, timeout, async page => {
    await open(page, url, timeout, false);
    await settle(page);
    const found = (await ask<{ k: string; hasMask: boolean }[]>(page, { op: 'scrollers' })).slice(0, 12);
    const out: { k: string; cue: boolean }[] = [];
    for (const item of found) {
      if (item.hasMask) { out.push({ k: item.k, cue: true }); continue; }
      try {
        const bands: Buffer[][] = [];
        for (const at of ['start', 'end']) {
          const r = await ask<{ x: number; y: number; w: number; h: number } | null>(page, { op: 'prep', key: item.k, at });
          if (!r || r.h > 760 || r.w < 40) throw new Error('out of view');
          await sleep(80);
          const clip = (y: number) => ({ x: Math.max(0, r.x + 2), y, width: Math.max(8, Math.min(r.w - 16, 390 - r.x - 2)), height: 12 });
          bands.push([await page.screenshot({ clip: clip(r.y + 2) }), await page.screenshot({ clip: clip(r.y + r.h - 14) }), await page.screenshot({ clip: clip(r.y + r.h / 2 - 6) })]);
        }
        const [start, end] = bands as [Buffer[], Buffer[]];
        const same = start[0]!.equals(end[0]!) && start[1]!.equals(end[1]!) && start[0]!.equals(start[2]!) && start[1]!.equals(start[2]!);
        out.push({ k: item.k, cue: !same });
      } catch { /* a container that can't be framed says nothing */ }
    }
    await ask(page, { op: 'unprep' });
    return out;
  });
}

const quiet = (what: string) => (error: unknown) => { if (process.env.PLUMBER_DEBUG) process.stderr.write(`craft: ${what}: ${(error as Error).message}\n`); return null; };

/** The pairs this page gives a reason to take, handed to the page that is read. A pair that fails is a rule that stays quiet. */
async function takePairs(browser: Browser, url: string, main: Page, timeout: number): Promise<void> {
  const needs = await ask<{ dark: boolean; scrolled: boolean; held: boolean }>(main, { op: 'needs' });
  const give = async (condition: string, data: unknown) => { if (process.env.PLUMBER_DEBUG) process.stderr.write(`craft: ${condition} pair ${JSON.stringify(data)?.slice(0, 600)}\n`); if (data) await ask(main, { op: 'pair', condition, data }); };
  if (needs.dark) await give('dark', await inside(browser, url, { viewport: desktop, colorScheme: 'dark' }, timeout, async page => {
    await open(page, url, timeout, false); await settle(page); return ask(page, { op: 'snapshot' });
  }).catch(quiet('dark')));
  if (needs.scrolled) await give('scrolled', await takeScrolled(browser, url, timeout).catch(quiet('scrolled')));
  if (needs.held) await give('held', await takeHeld(browser, url, timeout).catch(quiet('held')));
}

/** Open every route in headless Chromium and run the craft engine over the whole page. */
export async function craftRun(options: CraftRunOptions): Promise<CraftPage[]> {
  const { chromium } = await playwright();
  const executablePath = process.env.PLUMBER_CHROMIUM || process.env.PLUMB_CHROMIUM || undefined;
  let browser;
  try { browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) }); }
  catch (error) {
    if (/Executable doesn't exist|Failed to launch/.test((error as Error).message)) throw new UsageError(`Chromium is not installed.\n  → npx playwright install chromium\n  Set PLUMBER_CHROMIUM to use an installed Chrome or Chromium instead.`);
    throw error;
  }
  try {
    const pages: CraftPage[] = [];
    for (const route of options.routes) {
      const url = new URL(route, options.url).href;
      // motion on: a page loaded with reduced motion hides every animation from every rule
      const page = await browser.newPage({ reducedMotion: 'no-preference', viewport: options.viewport ?? desktop });
      try {
        await open(page, url, options.timeout, true);
        if (options.pairs !== false) await takePairs(browser, url, page, options.timeout);
        const result = await page.evaluate((timeout) => (window as unknown as { __plumb: { craft(o: unknown): Promise<unknown> } }).__plumb.craft({ timeout }), options.timeout) as Omit<CraftPage, 'route' | 'url'> & { route: string; url: string };
        pages.push({ ...result, route, url });
      } finally { await page.close(); }
    }
    return pages;
  } finally { await browser.close(); }
}

/** The page's records in the CLI's Finding shape: one per rule and source site, ready for SARIF. */
export function craftFindings(pages: CraftPage[], root: string): Finding[] {
  const found = new Map<string, Finding>();
  for (const page of pages) for (const record of page.findings) {
    if (!record.file) continue; // an element Plumb cannot place has no line to name
    const file = resolve(root, record.file);
    const site: Site = { file, line: record.line ?? 1, column: record.column ?? 1, text: record.text };
    const key = `${record.rule}:${relative(root, file)}:${site.line}:${site.column}:${record.text}`;
    const hit = found.get(key);
    if (hit) continue; // a list's rows share one site
    const declaration: Declaration = { prop: record.rule, value: record.text, refs: [], when: [], site, owner: { kind: 'element', name: record.component ?? record.tag }, origin: 'class' };
    // an advisory finding (a judgement of taste) is a note: shown, never failing the run
    found.set(key, makeFinding({ key, rule: record.rule, family: 'craft', severity: (record as { soft?: boolean }).soft ? 'info' : 'error', sites: [site], declaration, decisions: [],
      title: record.title, because: record.because, ...(record.action ? { action: record.action } : {}) }));
  }
  return [...found.values()].sort((a, b) => a.sites[0]!.file.localeCompare(b.sites[0]!.file) || a.sites[0]!.line - b.sites[0]!.line || a.rule.localeCompare(b.rule));
}

/** Just enough of a Report for the SARIF writer. */
export function craftReport(root: string, findings: Finding[]): Report {
  return { schemaVersion: 1, tool, root, findings } as unknown as Report;
}

export function formatCraft(pages: CraftPage[], findings: Finding[], root: string): string {
  const read = pages.reduce((n, page) => n + page.read, 0);
  const lines = [`React Plumber craft: ${pages.length} ${pages.length === 1 ? 'route' : 'routes'}, ${read} elements read, ${findings.length} ${findings.length === 1 ? 'finding' : 'findings'}`];
  for (const page of pages) if (!page.complete) lines.push(`  ${page.route}: stopped before every element was read (raise --timeout)`);
  for (const finding of findings) {
    const site = finding.sites[0]!;
    lines.push('', `${relative(root, site.file)}:${site.line}:${site.column}  ${finding.rule}`, `  ${finding.title}`, `  ${finding.because}`, ...(finding.action ? [`  → ${finding.action}`] : []));
  }
  return lines.join('\n') + '\n';
}
