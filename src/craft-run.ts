import { relative, resolve } from 'node:path';
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
export interface CraftRunOptions { url: string; routes: string[]; root: string; timeout: number; viewport?: { width: number; height: number } }

const missing = `The headless run needs Playwright, an optional dependency.
  → npm i -D playwright && npx playwright install chromium
  Set PLUMBER_CHROMIUM to use an installed Chrome or Chromium instead.`;

async function playwright(): Promise<{ chromium: import('playwright').BrowserType }> {
  try { return await import('playwright') as unknown as { chromium: import('playwright').BrowserType }; }
  catch { throw new UsageError(missing); }
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
      const page = await browser.newPage({ reducedMotion: 'reduce', viewport: options.viewport ?? { width: 1280, height: 800 } });
      try {
        try { await page.goto(url, { waitUntil: 'load', timeout: options.timeout }); }
        catch (error) { throw new UsageError(`Could not open ${url}: ${(error as Error).message.split('\n')[0]}\n  → start your dev server, then: plumber craft --url <its address>`); }
        // a dev server that reloads once (dependency optimizing) destroys the first context: try again
        for (let attempt = 0; ; attempt++) {
          try {
            await page.waitForFunction(() => (window as unknown as { __plumb?: { overlay?: unknown } }).__plumb?.overlay, undefined, { timeout: Math.min(options.timeout, 15000) });
            await page.evaluate(() => (window as unknown as { __plumb: { ready(): Promise<unknown> } }).__plumb.ready());
            break;
          } catch (error) {
            const message = (error as Error).message;
            if (attempt < 3 && /context was destroyed|navigation/i.test(message)) { await page.waitForLoadState('load'); continue; }
            throw new UsageError(`${url} has no React Plumber overlay (${message.split('\n')[0]}).\n  → add plumb() to the Vite plugins and run the dev server: plumber install --overlay`);
          }
        }
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
    found.set(key, makeFinding({ key, rule: record.rule, family: 'craft', severity: 'error', sites: [site], declaration, decisions: [],
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
