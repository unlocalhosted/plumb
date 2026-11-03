/**
 * CENSUS · the project's text, measured on every route, once (docs/briefs/page-cleanup.md, type layer)
 *
 * A page proposes the type ladder of its own text, so two pages of one site disagree (crafting-ui: Title 19px on
 * /motion/standards, 21px on /stickers). The ladder belongs to the project: every route is read headless, every
 * stamped element with its own words is measured as drawn (the same reading Blueprint makes of one page), and the
 * lot is kept under the cache. A page then asks for the project's ladder (`system` with scope "project") and is told
 * which of its own places move.
 *
 *  routes   the ones given, else every same-origin link found from `/`, breadth first, up to `max`
 *  stale    each stamp carries its file's hash (file:line:column#hash): an entry whose file has changed since is left
 *           out when the census is read, and that route's next read brings it back
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { atomicWrite } from './atomic-write.js';
import { sourceHash } from './collect/cache.js';
import { cacheDirectory, ignoreCache } from './paths.js';
import type { CensusEntry } from './session/engine.js';

export interface CensusRoute { route: string; elements: number }
/** each entry says the route it was measured on, so one page's places can be read out of the project's */
/** One distance between two children of a stack (overlay/src/stacks.js), row level only: section breaks are left out. */
export interface CensusGap { stamp: string; d: number; em?: number | null; route?: string }
export interface ProjectCensus { schemaVersion: 1; at: string; url: string; viewport: { width: number; height: number }; routes: CensusRoute[]; entries: (CensusEntry & { route?: string })[]; gaps?: CensusGap[]; /** routes found but not read: the cap was reached */ left: number }
export interface CensusOptions { url: string; root: string; routes?: string[]; max?: number; timeout?: number }

export const censusPath = (root: string) => resolve(cacheDirectory(root), 'census.json');

// In the page: every stamped element that holds words of its own, its type as drawn, and whether it sits in a list.
// The twin of Blueprint's #system census (overlay/src/blueprint.js): keep the two reading the same things.
function readPage() {
  const census = [...document.body.querySelectorAll('[data-plumb-source]')].filter((el) => !el.closest('plumb-overlay') && [...el.childNodes].some((n) => n.nodeType === 3 && /[\p{L}\p{N}]/u.test(n.nodeValue ?? ''))).map((el) => {
    const cs = getComputedStyle(el);
    return { stamp: el.getAttribute('data-plumb-source')!, tag: el.localName, list: !!el.closest('li, ul, ol, dl'), computed: { size: parseFloat(cs.fontSize), lineHeight: cs.lineHeight === 'normal' ? null : parseFloat(cs.lineHeight), letterSpacing: cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing), weight: parseInt(cs.fontWeight, 10), transform: cs.textTransform } };
  });
  const links = [...document.querySelectorAll('a[href]')].map((a) => (a as HTMLAnchorElement).href);
  return { census, links };
}
// In the page: the spacing pass's own reader, loaded from the dev server (one reader for the page and the census)
const readGaps = `(async () => { try { const m = await import('/__plumb/src/stacks.js'); return m.readStacks().flatMap((s) => s.gaps.filter((g) => g.d > 0.5 && !g.section).map((g) => ({ stamp: s.stamp, d: g.d, em: g.em }))); } catch { return []; } })()`;

/** Read the routes, two pages at a time, keep the census under the cache, and say what was read and what was left. */
export async function takeCensus(options: CensusOptions): Promise<ProjectCensus> {
  // the browser side loads only when a census is taken: the session reads the kept one without it
  const { launchChromium, reachable } = await import('./craft-run.js'), { desktop, settle } = await import('./craft-page.js');
  const base = await reachable(options.url), origin = new URL(base).origin, max = options.max ?? 120, timeout = options.timeout ?? 30000;
  const given = (options.routes ?? []).filter(Boolean), queue = given.length ? [...given] : ['/'], seen = new Set(queue.map(r => new URL(r, base).pathname));
  const browser = await launchChromium(), routes: CensusRoute[] = [], entries: ProjectCensus['entries'] = [], gaps: CensusGap[] = [];
  let taken = 0;
  const reader = async () => {
    const page = await browser.newPage({ viewport: desktop, reducedMotion: 'reduce' });
    try {
      for (;;) {
        const route = queue.shift();
        if (route === undefined) { if (taken - routes.length > 0) { await new Promise(r => setTimeout(r, 200)); continue; } return; }
        if (taken >= max) { queue.unshift(route); return; }
        taken++;
        try { await page.goto(new URL(route, base).href, { waitUntil: 'load', timeout }); } catch { routes.push({ route, elements: 0 }); continue; }
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
        await settle(page);
        const { census, links } = await page.evaluate(readPage);
        routes.push({ route, elements: census.length });
        entries.push(...census.map(entry => ({ ...entry, route })));
        gaps.push(...(await page.evaluate(readGaps) as CensusGap[]).map(gap => ({ ...gap, route })));
        // only when no routes were given: the site's own links, one path each, no fragments, queries or files
        if (!given.length) for (const link of links) {
          let at: URL; try { at = new URL(link); } catch { continue; }
          if (at.origin !== origin || seen.has(at.pathname) || /\.[a-z0-9]+$/i.test(at.pathname)) continue;
          seen.add(at.pathname); queue.push(at.pathname);
        }
      }
    } finally { await page.close(); }
  };
  try { await Promise.all([reader(), reader()]); } finally { await browser.close(); }
  const census: ProjectCensus = { schemaVersion: 1, at: new Date().toISOString(), url: base, viewport: desktop, routes: routes.filter(r => r.elements > 0 || given.includes(r.route)), entries, gaps, left: queue.length };
  ignoreCache(options.root);
  await atomicWrite(censusPath(options.root), JSON.stringify(census));
  return census;
}

/** The kept census, less the entries whose file has changed since it was read. Null when there is none. */
export async function projectCensus(root: string): Promise<{ census: ProjectCensus; entries: CensusEntry[]; gaps: CensusGap[]; stale: number } | null> {
  let census: ProjectCensus;
  try { census = JSON.parse(await readFile(censusPath(root), 'utf8')) as ProjectCensus; } catch { return null; }
  if (census?.schemaVersion !== 1 || !Array.isArray(census.entries)) return null;
  const hashes = new Map<string, string | null>();
  const current = async (file: string) => {
    if (!hashes.has(file)) hashes.set(file, await readFile(resolve(root, file), 'utf8').then(text => sourceHash(text).slice(0, 12), () => null));
    return hashes.get(file);
  };
  const fresh = async (stamp: string) => {
    const m = /^(.+):\d+:\d+#([a-f0-9]+)$/.exec(stamp);
    let file = m?.[1] ?? ''; try { file = decodeURIComponent(file); } catch { /* as written */ }
    return !!m && await current(file) === m[2];
  };
  const entries: CensusEntry[] = [], gaps: CensusGap[] = [];
  let stale = 0;
  for (const entry of census.entries) if (await fresh(entry.stamp)) entries.push(entry); else stale++;
  for (const gap of census.gaps ?? []) if (await fresh(gap.stamp)) gaps.push(gap);
  return { census, entries, gaps, stale };
}
