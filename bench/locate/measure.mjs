// Measures the overlay's own locate path in a page: window.__plumb.locate(element, { explain: true }), the call
// e2e/locate.test.mjs, e2e/owner-locate.test.mjs and e2e/stamp.test.mjs make. Nothing of locate is reimplemented here.
import { setTimeout as delay } from 'node:timers/promises';

// Runs in the page. Two passes over the same sampled elements: the first on a freshly loaded page (cold: source
// maps and resolve answers not yet fetched), the second straight after (warm).
async function inPage({ rootSelector, cap, timeoutMs }) {
  const root = rootSelector ? document.querySelector(rootSelector) : document.body;
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT', 'TEMPLATE', 'TITLE', 'HEAD']);
  const SKIP_CLOSEST = 'plumb-overlay, nextjs-portal, next-route-announcer, [data-react-grab], [data-react-grab-root]';
  const skip = (el) => SKIP_TAGS.has(el.tagName) || !!el.closest(SKIP_CLOSEST);
  const fiberOf = (el) => el[Object.keys(el).find((k) => k.startsWith('__reactFiber$'))];
  const STAMP = /^(.+):(\d+):(\d+)#([a-f0-9]{12})$/;
  const stampOf = (fiber) => {
    const raw = fiber?.memoizedProps?.['data-plumb-source'];
    const m = typeof raw === 'string' && STAMP.exec(raw);
    return m ? { file: decodeURIComponent(m[1]), line: Number(m[2]), column: Number(m[3]) } : null;
  };
  const siblings = (el) => [...el.parentElement.children].filter((s) => !skip(s));
  const keyOf = (el) => {
    const parts = [];
    for (let n = el; n && n !== root; n = n.parentElement) parts.push(n.localName + ':' + siblings(n).indexOf(n));
    return parts.reverse().join('/');
  };
  const fnv = (text) => { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

  const all = [...root.querySelectorAll('*')].filter((el) => !skip(el));
  // the sampling rule: every element when there are at most `cap`; else those whose key hashes to 0 mod ceil(N/cap)
  const k = Math.max(1, Math.ceil(all.length / cap));
  const picked = all.map((el) => ({ el, key: keyOf(el) })).filter(({ key }) => k === 1 || fnv(key) % k === 0);

  const compact = (r) => {
    if (!r) return { found: false, reason: 'null-result' };
    if (r.__timeout) return { found: false, reason: 'timeout' };
    if (r.__error) return { found: false, reason: 'threw', detail: { step: String(r.__error).slice(0, 200) } };
    if (r.location === null || r.reason) {
      const { considered, ...detail } = r.detail ?? {};
      const text = JSON.stringify(detail);
      return { found: false, reason: r.reason, step: detail.step ?? null, detail: text.length > 600 ? { truncated: text.slice(0, 600) } : detail, considered: considered?.length ?? 0 };
    }
    return {
      found: true, via: r.via, file: r.file, line: r.line, column: r.column, component: r.component ?? null, usage: !!r.usage, partial: !!r.partial,
      chain: (r.chain ?? []).slice(0, 6).map((l) => `${l.file}:${l.line}:${l.column}${l.component ? ' ' + l.component : ''}${l.usage ? ' (usage)' : ''}`),
    };
  };
  const timed = async (el) => {
    const t0 = performance.now();
    let result;
    try {
      result = await Promise.race([window.__plumb.locate(el, { explain: true }), new Promise((done) => setTimeout(() => done({ __timeout: true }), timeoutMs))]);
    } catch (error) { result = { __error: error?.message ?? String(error) }; }
    return { ms: performance.now() - t0, result: compact(result) };
  };

  const rows = [];
  for (const { el, key } of picked) {
    const fiber = fiberOf(el);
    const owners = new Set();
    for (let o = fiber?._debugOwner, i = 0; o && i < 64; o = o._debugOwner, i++) { const s = stampOf(o); if (s) owners.add(s.file); }
    // files of the components that own it and of the elements above it: a wrong answer in one of them is an "ancestor"
    for (let p = el.parentElement, i = 0; p && i < 64; p = p.parentElement, i++) { const s = stampOf(fiberOf(p)); if (s) owners.add(s.file); }
    // which kind of component drew it: a fiber owner is a client component; an owner without a fiber is a server component's debug info
    const owner = fiber?._debugOwner;
    const kind = !owner ? 'unknown' : owner.tag !== undefined && owner.stateNode !== undefined ? 'client' : 'server';
    const row = { key, tag: el.localName, stamp: stampOf(fiber), domStamp: el.getAttribute('data-plumb-source'), kind, ownerFiles: [...owners], connected: true };
    if (!el.isConnected) { row.connected = false; rows.push(row); continue; }
    const first = await timed(el);
    row.coldMs = first.ms; Object.assign(row, first.result);
    rows.push(row);
  }
  for (let i = 0; i < picked.length; i++) {
    if (!rows[i].connected || !picked[i].el.isConnected) continue;
    const again = await timed(picked[i].el);
    rows[i].warmMs = again.ms; rows[i].warmSame = again.result.found === rows[i].found && again.result.file === rows[i].file && again.result.line === rows[i].line && again.result.column === rows[i].column;
  }
  return { total: all.length, sampleEvery: k, rows };
}

// Waits for the page to settle: the overlay connected, the root drawn, and 600 ms without a DOM change.
export async function settle(page, { rootSelector, waitMs = 150_000 }) {
  await page.waitForFunction(() => window.__plumb?.ready, undefined, { timeout: waitMs });
  await page.evaluate(() => window.__plumb.ready());
  await page.waitForFunction((sel) => (sel ? document.querySelector(sel)?.children.length > 0 : document.body.children.length > 1), rootSelector, { timeout: waitMs });
  await page.evaluate(() => new Promise((done) => {
    let last = performance.now();
    const observer = new MutationObserver(() => { last = performance.now(); });
    observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
    const stop = performance.now() + 8_000;
    const tick = () => { if (performance.now() - last > 600 || performance.now() > stop) { observer.disconnect(); done(); } else setTimeout(tick, 100); };
    tick();
  }));
}

// A screen whose module cannot load (an import that does not resolve) never draws its root; waiting on it is waste.
class BrokenPage extends Error {}
const broken = (message) => /dynamically imported module|Failed to resolve import|Cannot find module|is not defined|is not a function/.test(message);

// One page: load, settle, measure, all inside one deadline, so no page can hold the run. A reload mid-measure
// (dependency re-optimisation) throws; the caller retries once. A page that cannot load fails at once, without a retry.
export async function measurePage(browser, url, { rootSelector, cap = 150, timeoutMs = 20_000, deadlineMs = 240_000 }) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const errors = [];
  let navigations = 0, fail, timer;
  const failed = new Promise((_, reject) => { fail = reject; });
  failed.catch(() => {});
  timer = setTimeout(() => fail(new Error(`page deadline: ${deadlineMs} ms`)), deadlineMs);
  page.on('pageerror', (e) => { const message = String(e.message).slice(0, 300); errors.push(message); if (broken(message)) fail(new BrokenPage(message)); });
  page.on('framenavigated', (frame) => { if (frame === page.mainFrame()) navigations++; });
  try {
    return await Promise.race([failed, (async () => {
      const t0 = performance.now();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 150_000 });
      await settle(page, { rootSelector });
      const loadMs = performance.now() - t0;
      const before = navigations;
      const out = await page.evaluate(inPage, { rootSelector, cap, timeoutMs });
      if (navigations !== before) throw new Error('page navigated while measuring');
      return { ...out, loadMs, pageErrors: errors };
    })()]);
  } finally { clearTimeout(timer); await page.close().catch(() => {}); }
}

export async function measureWithRetry(browser, url, options) {
  try { return await measurePage(browser, url, options); }
  catch (first) {
    if (first instanceof BrokenPage) return { failed: 'page could not load: ' + first.message };
    await delay(1000);
    try { return { ...(await measurePage(browser, url, options)), retried: String(first.message).slice(0, 200) }; }
    catch (second) { return { failed: String(second.message).slice(0, 600) }; }
  }
}

// ---- judging ----
// Truth is the stamp the overlay reads on the vite-stamped host. Its kind comes from what locate answered there:
//   host   the stamp is this element's own JSX opening (locate: via 'stamp', not a usage)
//   usage  the stamp is a component's usage forwarded onto the element (a library drew the host)
//   null   no stamp on the element: nothing to judge against
export function truthOf(row) {
  if (!row.stamp || !row.connected) return null;
  const kind = row.found && row.via === 'stamp' && !row.usage ? 'host' : row.found && (row.via === 'stamp-usage' || row.usage) ? 'usage' : 'unconfirmed';
  return { ...row.stamp, kind, ownerFiles: row.ownerFiles, tag: row.tag };
}

const same = (a, b) => a.file === b.file;
export function judge(row, truth) {
  if (!row.connected) return 'detached';
  if (!truth) return row.found ? 'unjudged-found' : 'unjudged-refused';
  if (truth.tag !== row.tag) return row.found ? 'unjudged-found' : 'unjudged-refused';
  if (truth.kind === 'unconfirmed') return row.found ? 'unjudged-found' : 'unjudged-refused';
  if (!row.found) return truth.kind === 'usage' ? 'usage-refused' : 'refused';
  if (truth.kind === 'usage') {
    const atUsage = (l) => l === `${truth.file}:${truth.line}:${truth.column}`;
    return `${row.file}:${row.line}:${row.column}` === `${truth.file}:${truth.line}:${truth.column}` || row.chain.some((l) => atUsage(l.split(' ')[0])) ? 'usage-match' : 'usage-miss';
  }
  if (same(row, truth)) {
    if (row.line === truth.line) return row.column === truth.column ? 'exact' : 'line-only';
    return 'file-only';
  }
  return truth.ownerFiles.includes(row.file) ? 'wrong-file-ancestor' : 'wrong-file-other';
}
export const inChain = (row, truth) => !!truth && row.found && row.chain.some((l) => l.split(' ')[0] === `${truth.file}:${truth.line}:${truth.column}`);
