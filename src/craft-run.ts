import { join, relative, resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { cacheDirectory, ignoreCache } from './paths.js';
import { UsageError } from './errors.js';
import { ask, desktop, hold, inside, open, reloaded, settle, sleep } from './craft-page.js';
import type { Browser, Page } from './craft-page.js';
import { hasAnswers, judge } from './craft-judge.js';
import type { Grey } from './craft-judge.js';
import { takeProbes } from './craft-probe.js';
import { docsUrl } from '../overlay/src/rule-docs.js';
import { BOUND_RULES, boundInSource } from '../overlay/src/pack-tells.js';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { makeFinding } from './messages.js';
import { tool } from './report.js';
import type { Declaration, Finding, Report, Site } from './report.js';

/** One craft finding as the page reports it (overlay/src/craft-run.js), with its source site. */
export interface CraftRecord {
  rule: string; title: string; because: string; action: string;
  /** the laws of UX the rule measures (overlay/src/laws.js); [] when its root is not one; null when unmapped */
  laws?: { id: string; name: string }[] | null;
  text: string; value: unknown; confidence: number | null;
  evidence: Record<string, unknown>;
  /** what decided it: a fixed rule over the drawn page, or a model reading the words (evidence.model names which) */
  /** the page's own fix: classes to write on the element, or advice in words */
  /** its place in the page (craft-headless.js pathKey), for a picture of it */
  path?: string;
  suggest?: { kind: string; from?: string; to?: string; text?: string; why?: string } | null;
  by?: 'rule' | 'model'; soft?: boolean; judged?: boolean; file: string | null; line: number | null; column: number | null; component: string | null; tag: string; count: number;
}
export interface CraftPage { route: string; url: string; read: number; complete: boolean; findings: CraftRecord[]; spec?: unknown;
  /** a proof run only: the errors checks threw on this page (the engine hides them, so a broken check looks like a quiet one) */
  thrown?: { rule: string; error: string }[] }
export interface CraftRunOptions { url: string; routes: string[]; root: string; timeout: number; viewport?: { width: number; height: number }; pairs?: boolean; probe?: boolean; probeBudget?: number; probeDrag?: boolean; judge?: boolean; scope?: string; recordProbe?: string; proof?: { without: string[] } }

const missing = `The headless run needs Playwright, an optional dependency.
  → npm i -D playwright && npx playwright install chromium
  Set PLUMBER_CHROMIUM to use an installed Chrome or Chromium instead.`;

async function playwright(): Promise<{ chromium: import('playwright').BrowserType }> {
  try { return await import('playwright') as unknown as { chromium: import('playwright').BrowserType }; }
  catch { throw new UsageError(missing); }
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
  // asked once the page has settled: what it fetches on mount (a list loading its rows) comes after the overlay is ready
  await settle(main);
  const needs = await ask<{ dark: boolean; scrolled: boolean; held: boolean }>(main, { op: 'needs' });
  const give = async (condition: string, data: unknown) => { if (process.env.PLUMBER_DEBUG) process.stderr.write(`craft: ${condition} pair ${JSON.stringify(data)?.slice(0, 600)}\n`); if (data) await ask(main, { op: 'pair', condition, data }); };
  if (needs.dark) await give('dark', await inside(browser, url, { viewport: desktop, colorScheme: 'dark' }, timeout, async page => {
    await open(page, url, timeout, false); await settle(page); return ask(page, { op: 'snapshot' });
  }).catch(quiet('dark')));
  if (needs.scrolled) await give('scrolled', await takeScrolled(browser, url, timeout).catch(quiet('scrolled')));
  if (needs.held) await give('held', await takeHeld(browser, url, timeout).catch(quiet('held')));
}

// The windows a page is read in: a full HD monitor, an HD laptop (the main read's own), an iPhone, a large Samsung phone.
// A layout that holds at one width and breaks at another is the commonest thing a read at one width cannot see.
const WINDOWS = [{ width: 1920, height: 1080 }, desktop, { width: 390, height: 844 }, { width: 412, height: 915 }];
const HOVERS = 6; // things tried under the pointer, per width

/** What the main read does not see: spacing at the other window widths, and words that meet other words at every
 *  width, at rest and with the pointer over each thing that listens for it. A hover presses nothing; each width is a
 *  page of its own. Spacing is the engine's whole read of the page at that width, kept for the rules that own a gap,
 *  a margin or a padding, so a finding here is the one the main read would make in a window that size. */
async function takeStates(browser: Browser, url: string, timeout: number): Promise<CraftRecord[]> {
  // side by side: each width is a page of its own, and most of its time is waiting for the pointer's effects
  const each = await Promise.all(WINDOWS.map(async viewport => {
    const out: CraftRecord[] = [], width = viewport.width;
    // a dev server that reloads the page once (it found a new dependency) takes the overlay away mid-read: once more
    const read = () => inside(browser, url, { viewport, reducedMotion: 'no-preference' }, timeout, async page => {
      const kept = out.length;
      try {
      await open(page, url, timeout, true);
      await settle(page);
      const note = (list: CraftRecord[], hover: boolean) => { for (const record of list) out.push({ ...record, evidence: { ...record.evidence, width, hover } }); };
      if (width !== desktop.width) {
        const spacing = new Set(await ask<string[]>(page, { op: 'spacing' }));
        const found = (await ask<{ findings: CraftRecord[] }>(page, { timeout, grey: false, scope: null })).findings.filter(record => spacing.has(record.rule));
        if (process.env.PLUMBER_DEBUG) process.stderr.write(`craft: spacing at ${width}px ${JSON.stringify(found.map(record => `${record.rule} ${record.file}:${record.line}`))}\n`);
        note(found, false);
      }
      note(await ask<CraftRecord[]>(page, { op: 'collisions' }), false);
      for (const key of await ask<string[]>(page, { op: 'hovers', budget: HOVERS })) {
        const at = await ask<{ cx: number; cy: number } | null>(page, { op: 'frame', key });
        if (!at) continue;
        await page.mouse.move(at.cx, at.cy, { steps: 3 });
        await sleep(450); // what the pointer brought in has arrived
        note(await ask<CraftRecord[]>(page, { op: 'collisions' }), true);
        await page.mouse.move(0, 0);
        await sleep(150);
      }
      } catch (error) { out.length = kept; throw error; }
    });
    await read().catch(read).catch(quiet(`states at ${width}px`));
    return out;
  }));
  return each.flat();
}

// when a finding from another state is true: said in the title, since at rest the page will not show it. Every width
// that showed it is named, so a finding of the phones alone reads as one
const when = (record: CraftRecord): string => {
  const widths = (record.evidence.widths as number[]).filter(width => width !== desktop.width), hover = record.evidence.hover === true;
  const sizes = widths.map(width => `${width}px`);
  const windows = sizes.length > 1 ? `in windows ${sizes.slice(0, -1).join(', ')} and ${sizes.at(-1)} wide` : `in a window ${sizes[0]} wide`;
  const parts = [...(widths.length ? [windows] : []), ...(hover ? ['with the pointer over it'] : [])];
  return parts.length ? ` Seen ${parts.join(', ')}.` : '';
};

// A dev server bound to one address family answers on `localhost` but not on `127.0.0.1` (Vite on ::1), or the
// reverse: the first loopback name that answers is the one the run opens. Any other host is used as given.
export async function reachable(base: string): Promise<string> {
  const loopback = ['127.0.0.1', 'localhost', '[::1]'], given = new URL(base);
  if (!loopback.includes(given.hostname)) return base;
  for (const host of [given.hostname, ...loopback.filter(name => name !== given.hostname)]) {
    const url = new URL(base); url.hostname = host;
    try { await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(2000) }); return url.href; } catch { /* the next name */ }
  }
  return base;
}

/** Headless Chromium for a run that reads pages (craft, census): Playwright's, or the Chrome PLUMBER_CHROMIUM names. */
export async function launchChromium(): Promise<Browser> {
  const { chromium } = await playwright();
  const executablePath = process.env.PLUMBER_CHROMIUM || process.env.PLUMB_CHROMIUM || undefined;
  try { return await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) }); }
  catch (error) {
    if (/Executable doesn't exist|Failed to launch/.test((error as Error).message)) throw new UsageError(`Chromium is not installed.\n  → npx playwright install chromium\n  Set PLUMBER_CHROMIUM to use an installed Chrome or Chromium instead.`);
    throw error;
  }
}

/** Whether the app's page loads plumber's overlay itself (plumber wired into its dev server). */
async function loadsOverlay(browser: Browser, url: string): Promise<boolean> {
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 30000 }).catch(() => {});
    return await page.waitForFunction(() => !!(window as unknown as { __plumb?: { overlay?: unknown } }).__plumb?.overlay, undefined, { timeout: 5000 }).then(() => true, () => false);
  } finally { await page.close(); }
}

/**
 * The page check with no setup: an app whose dev server doesn't load plumber's overlay gets it from plumber's own
 * server (the one `plumber serve --overlay` runs for hosts plumber can't wire), added to every page this run opens.
 * Only plumber's own headless browser sees it; the app and its files are not touched.
 */
async function carryOverlay(browser: Browser, root: string, base: string): Promise<() => Promise<void>> {
  const { serve } = await import('./session/server.js');
  // page: no discovery file is written, so a server the person runs later isn't refused, and nothing is left behind
  const daemon = await serve({ root, overlay: true, origin: new URL(base).origin, port: 0, page: true });
  const client = `http://127.0.0.1:${daemon.info.port}/__plumb/client.js`;
  const script = `(() => { if (window !== window.top || !/^https?:$/.test(location.protocol)) return; const add = () => { if (document.querySelector('script[data-plumb-token]')) return;
    const s = document.createElement('script'); s.type = 'module'; s.src = ${JSON.stringify(client)}; s.dataset.plumbToken = ${JSON.stringify(daemon.info.token)}; document.head.append(s); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add(); })();`;
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (options = {}) => { const context = await newContext({ ...options, bypassCSP: true }); await context.addInitScript(script); return context; };
  browser.newPage = async (options = {}) => { const context = await browser.newContext(options), page = await context.newPage(); page.once('close', () => { context.close().catch(() => {}); }); return page; };
  return () => daemon.close();
}

/**
 * A proof run (docs/briefs/new-check.md §6a): every page this run opens is judged without the named checks, and the
 * errors checks throw are kept (overlay/src/craft.js reads globalThis.__plumbProof).
 */
function proofRun(browser: Browser, without: string[]): void {
  const script = `globalThis.__plumbProof = { without: ${JSON.stringify(without)}, thrown: [] };`;
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (options = {}) => { const context = await newContext(options); await context.addInitScript(script); return context; };
  browser.newPage = async (options = {}) => { const context = await browser.newContext(options), page = await context.newPage(); page.once('close', () => { context.close().catch(() => {}); }); return page; };
}

/** Open every route in headless Chromium and run the craft engine over the whole page. */
export async function craftRun(options: CraftRunOptions): Promise<CraftPage[]> {
  const browser = await launchChromium();
  let stopOwn: (() => Promise<void>) | undefined;
  try {
    const pages: CraftPage[] = [], base = await reachable(options.url);
    if (!await loadsOverlay(browser, new URL(options.routes[0] ?? '/', base).href)) {
      process.stderr.write('Plumber isn\'t set up in this app\'s dev server, so the check brings its own copy into its own browser. Your app isn\'t changed.\n');
      stopOwn = await carryOverlay(browser, options.root, base);
    }
    if (options.proof) proofRun(browser, options.proof.without);
    for (const route of options.routes) {
      const url = new URL(route, base).href;
      // motion on: a page loaded with reduced motion hides every animation from every rule
      const page = await browser.newPage({ reducedMotion: 'no-preference', viewport: options.viewport ?? desktop });
      try {
        await open(page, url, options.timeout, true);
        // the route's own code and data first: a page judged while its route was still being fetched (a dev server
        // compiles a route on its first visit) was judged as its loading screen (algorecall's /login: 14 elements of 118)
        await settle(page, Math.min(options.timeout, 30000));
        if (options.pairs !== false) await takePairs(browser, url, page, options.timeout);
        if (options.probe !== false) {
          const list = await takeProbes(browser, url, options.timeout, { budget: options.probeBudget ?? 24, drag: options.probeDrag === true, ...(options.scope ? { scope: options.scope } : {}), ...(options.recordProbe ? { record: options.recordProbe } : {}) }).catch(quiet('probes'));
          if (process.env.PLUMBER_DEBUG) process.stderr.write(`craft: probes ${JSON.stringify(list)?.slice(0, 1500)}\n`);
          if (list?.length) await ask(page, { op: 'probes', list });
        }
        // the grey band is looked at only when there is an eye to ask (--judge) or answers already kept
        const asking = options.judge === true, grey = asking || await hasAnswers(options.root);
        // a page that reloads while it is read (a file saved, a dev server's watcher) is waited for and read again, twice
        // at most; then it is said in plain words, not as the browser library's own error (U66, 2026-11-20)
        let result!: Omit<CraftPage, 'route' | 'url'> & { route: string; url: string; grey?: Grey[] };
        try { result = await ask(page, { timeout: options.timeout, grey, scope: options.scope ?? null }); }
        catch (error) {
          if (!reloaded(error)) throw error;
          throw new Error(`${url} kept reloading while Plumber was reading it, for 30 s (a file changing, or the dev server restarting). Run it again once the page is still.`);
        }
        await photograph(page, result.findings, options.root);
        if (process.env.PLUMBER_DEBUG && result.grey) process.stderr.write(`craft: grey ${JSON.stringify(result.grey)?.slice(0, 800)}\n`);
        if (result.grey) {
          // a model is never asked when CI is set: the answers kept in the project are all there is
          result.findings.push(...await judge(page, result.grey, { root: options.root, asking: asking && !process.env.CI }));
          delete result.grey;
        }
        if (options.probe !== false && !options.scope) {
          // one finding per place: the main read's, else the first state that shows it (widest first, at rest first),
          // with every width that showed it
          const place = (record: CraftRecord) => `${record.rule}|${record.file}:${record.line}:${record.column}`;
          const seen = new Set(result.findings.map(place)), first = new Map<string, CraftRecord>();
          for (const record of await takeStates(browser, url, options.timeout).catch(quiet('states')) ?? []) {
            if (seen.has(place(record))) continue;
            const kept = first.get(place(record));
            if (!kept) first.set(place(record), { ...record, evidence: { ...record.evidence, widths: [record.evidence.width] } });
            else if (!(kept.evidence.widths as number[]).includes(record.evidence.width as number)) (kept.evidence.widths as number[]).push(record.evidence.width as number);
          }
          for (const record of first.values()) result.findings.push({ ...record, title: record.title + when(record) });
        }
        const thrown = options.proof ? await page.evaluate(() => (globalThis as unknown as { __plumbProof?: { thrown: { rule: string; error: string }[] } }).__plumbProof?.thrown ?? []).catch(() => []) : undefined;
        pages.push({ ...result, route, url, ...(thrown ? { thrown } : {}) });
      } finally { await page.close(); }
    }
    return pages;
  } finally { await browser.close(); await stopOwn?.(); }
}

/** Each writable fix's page and place, by its short key. */
export function pageFixPlaces(pages: CraftPage[], root: string): Map<string, { url: string; path: string }> {
  const places = new Map<string, { url: string; path: string }>();
  for (const page of pages) for (const record of page.findings) if (record.file && record.path) places.set(fixKey(recordKey(record, root)), { url: page.url, path: record.path });
  return places;
}

/** One page finding's key, and the short key its fix is applied by (`plumber apply p…`). */
const recordKey = (record: CraftRecord, root: string) => `${record.rule}:${relative(root, resolve(root, record.file!))}:${record.line ?? 1}:${record.column ?? 1}:${record.text}`;
const fixKey = (key: string) => `p${createHash('sha256').update(key).digest('hex').slice(0, 9)}`;
/** The CSS selector for a pathKey (`div:1>main:2` → `body > div:nth-of-type(1) > main:nth-of-type(2)`). */
export const pathSelector = (path: string) => ['body', ...path.split('>').map(part => { const [tag, n] = part.split(':'); return `${tag}:nth-of-type(${n})`; })].join(' > ');
export const shotsDirectory = (root: string) => join(cacheDirectory(root), 'shots');

/** A picture of one element with some of the page around it (24px), so its edges and its neighbours show. */
export async function shoot(page: Page, path: string, file: string): Promise<void> {
  const element = page.locator(pathSelector(path)).first();
  await element.scrollIntoViewIfNeeded({ timeout: 2000 });
  const box = await element.boundingBox({ timeout: 2000 });
  if (!box) throw new Error('the element is not drawn');
  const view = page.viewportSize() ?? desktop, x = Math.max(0, box.x - 24), y = Math.max(0, box.y - 24);
  // the page as its person sees it: plumber's own dock and marks are hidden for the picture, then given back
  const hide = (on: boolean) => page.evaluate((on) => { for (const el of document.querySelectorAll<HTMLElement>('plumb-overlay')) el.style.visibility = on ? 'hidden' : ''; }, on).catch(() => {});
  await hide(true);
  try { await page.screenshot({ path: file, animations: 'disabled', clip: { x, y, width: Math.min(view.width - x, box.width + 48), height: Math.min(view.height - y, box.height + 48) } }); }
  finally { await hide(false); }
}

/** A picture of each element the page check has a fix for, as it is now: the "before" of `plumber apply`. */
async function photograph(page: Page, records: CraftRecord[], root: string): Promise<void> {
  const writable = records.filter(r => r.file && r.path && r.suggest?.kind === 'class' && r.suggest.to?.trim());
  if (!writable.length) return;
  ignoreCache(root);
  await mkdir(shotsDirectory(root), { recursive: true });
  for (const record of writable.slice(0, 60)) {
    await shoot(page, record.path!, join(shotsDirectory(root), `${fixKey(recordKey(record, root))}-before.png`)).catch(() => {});
  }
}

const sources = new Map<string, string>();
const sourceOf = (file: string): string => { let t = sources.get(file); if (t === undefined) { try { t = readFileSync(file, 'utf8'); } catch { t = ''; } sources.set(file, t); } return t; };

/** The page's records in the CLI's Finding shape: one per rule and source site, ready for SARIF. */
export function craftFindings(pages: CraftPage[], root: string): Finding[] {
  const found = new Map<string, Finding>();
  for (const page of pages) for (const record of page.findings) {
    if (!record.file) continue; // an element Plumb cannot place has no line to name
    const file = resolve(root, record.file);
    // a badge or a dot that renders only under a condition shows real state: the tells pack keeps it (pack-tells.js)
    if (BOUND_RULES.has(record.rule) && boundInSource(sourceOf(file), record.line ?? 1, record.column ?? 1)) continue;
    const site: Site = { file, line: record.line ?? 1, column: record.column ?? 1, text: record.text };
    const key = recordKey(record, root);
    const hit = found.get(key);
    if (hit) continue; // a list's rows share one site
    const declaration: Declaration = { prop: record.rule, value: record.text, refs: [], when: [], site, owner: { kind: 'element', name: record.component ?? record.tag }, origin: 'class' };
    // an advisory finding (a judgement of taste) is a note: shown, never failing the run
    const docs = docsUrl(record.rule);
    // a class fix on a placed element is one plumber can write; advice stays words
    const fix = record.suggest?.kind === 'class' && record.suggest.to?.trim() ? record.suggest : undefined;
    const apply = fix ? { key: fixKey(key), from: fix.from ?? '', to: fix.to!, ...(fix.why ? { why: fix.why } : {}) } : undefined;
    found.set(key, { ...(apply ? { apply } : {}), ...makeFinding({ key, rule: record.rule, family: 'craft', severity: (record as { soft?: boolean }).soft ? 'info' : 'error', sites: [site], declaration, decisions: [],
      title: record.title, because: record.because, ...(record.action ? { action: record.action } : {}) }), ...(docs ? { docs } : {}) });
  }
  return [...found.values()].sort((a, b) => a.sites[0]!.file.localeCompare(b.sites[0]!.file) || a.sites[0]!.line - b.sites[0]!.line || a.rule.localeCompare(b.rule));
}

/** Just enough of a Report for the SARIF writer. */
export function craftReport(root: string, findings: Finding[]): Report {
  return { schemaVersion: 1, tool, root, findings } as unknown as Report;
}

export function formatCraft(pages: CraftPage[], findings: Finding[], root: string): string {
  const read = pages.reduce((n, page) => n + page.read, 0);
  const lines = [`React Plumber craft: ${pages.length} ${pages.length === 1 ? 'route' : 'routes'}, ${read} elements read, ${findings.length} ${findings.length === 1 ? 'finding' : 'findings'} from the craft, accessibility and generated-look checks. For your tokens, run plumber check.`]; // says what it counts (U35)
  for (const page of pages) if (!page.complete) lines.push(`  ${page.route}: stopped before every element was read (raise --timeout)`);
  // the laws each rule measures, as its records carry them
  const laws = new Map(pages.flatMap(page => page.findings.map(record => [record.rule, record.laws ?? []] as const)));
  for (const finding of findings) {
    const site = finding.sites[0]!, named = (laws.get(finding.rule) ?? []).map(law => law.name);
    lines.push('', `${relative(root, site.file)}:${site.line}:${site.column}  ${finding.rule}`, `  ${finding.title}`, `  ${finding.because}`, ...(named.length ? [`  Law: ${named.join(', ')}`] : []), ...(finding.docs ? [`  Read more: ${finding.docs}`] : []), ...(finding.action ? [`  → ${finding.action}`] : []),
      ...(finding.apply ? [`  Apply: plumber apply ${finding.apply.key}${finding.action ? '' : `  (${finding.apply.from ? `${finding.apply.from} → ${finding.apply.to}` : `adds ${finding.apply.to}`})`}`] : []));
  }
  return lines.join('\n') + '\n';
}
