import { relative, resolve } from 'node:path';
import { UsageError } from './errors.js';
import { ask, desktop, hold, inside, open, settle, sleep } from './craft-page.js';
import type { Browser, Page } from './craft-page.js';
import { hasAnswers, judge } from './craft-judge.js';
import type { Grey } from './craft-judge.js';
import { takeProbes } from './craft-probe.js';
import { makeFinding } from './messages.js';
import { tool } from './report.js';
import type { Declaration, Finding, Report, Site } from './report.js';

/** One craft finding as the page reports it (overlay/src/craft-run.js), with its source site. */
export interface CraftRecord {
  rule: string; title: string; because: string; action: string; text: string; value: unknown; confidence: number | null;
  evidence: Record<string, unknown>; soft?: boolean; judged?: boolean; file: string | null; line: number | null; column: number | null; component: string | null; tag: string; count: number;
}
export interface CraftPage { route: string; url: string; read: number; complete: boolean; findings: CraftRecord[]; spec?: unknown }
export interface CraftRunOptions { url: string; routes: string[]; root: string; timeout: number; viewport?: { width: number; height: number }; pairs?: boolean; probe?: boolean; probeBudget?: number; probeDrag?: boolean; judge?: boolean }

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
        if (options.probe !== false) {
          const list = await takeProbes(browser, url, options.timeout, { budget: options.probeBudget ?? 24, drag: options.probeDrag === true }).catch(quiet('probes'));
          if (process.env.PLUMBER_DEBUG) process.stderr.write(`craft: probes ${JSON.stringify(list)?.slice(0, 1500)}\n`);
          if (list?.length) await ask(page, { op: 'probes', list });
        }
        // the grey band is looked at only when there is an eye to ask (--judge) or answers already kept
        const asking = options.judge === true, grey = asking || await hasAnswers(options.root);
        const result = await page.evaluate((o) => (window as unknown as { __plumb: { craft(o: unknown): Promise<unknown> } }).__plumb.craft(o), { timeout: options.timeout, grey }) as Omit<CraftPage, 'route' | 'url'> & { route: string; url: string; grey?: Grey[] };
        if (process.env.PLUMBER_DEBUG && result.grey) process.stderr.write(`craft: grey ${JSON.stringify(result.grey)?.slice(0, 800)}\n`);
        if (result.grey) {
          // a model is never asked when CI is set: the answers kept in the project are all there is
          result.findings.push(...await judge(page, result.grey, { root: options.root, asking: asking && !process.env.CI }));
          delete result.grey;
        }
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
