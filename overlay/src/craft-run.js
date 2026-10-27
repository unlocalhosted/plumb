/* ─────────────────────────────────────────────────────────
 * CRAFT RUN · Plumb overlay
 *
 * The craft engine over the whole page, as plain JSON, for the headless run (`plumber craft`). It is blueprint's
 * reader doing the reading (every element it would read, off-screen too, with the same source mapping), turned on
 * without a person and left as it was found; this module only waits for the reader to run dry, then asks where in
 * the source each craft finding lives.
 *
 *  window.__plumb.craft({ timeout }) → { route, url, read, complete, findings: [{ rule, title, because, action,
 *    text, value, confidence, evidence, file, line, column, component, tag, count }] }
 *
 *  dedupe  rows of a list share one site: one finding per rule, text and source site, `count` says how many elements
 *
 * The runner's other questions (src/craft-run.ts), asked as window.__plumb.craft({ op, … }):
 *  needs                      → { dark, scrolled, held }: which pairs this page gives a reason to take
 *  snapshot                   → one record per element of the page as it is (asked of a page under a condition)
 *  scrollers · prep { key }   → the scroll containers; scroll one into view with its content hidden
 *  skeletons · heights { keys } → the skeletons now and their containers' sizes
 *  pair { condition, data }   → hand another condition's page in (before the run); reset forgets them all
 * ───────────────────────────────────────────────────────── */
import { locate } from './locate.js';
import { PAIRS, pairIn, pairsReset, resetKeys, snapshot, hasDarkStyles, scrollers, skeletons, heightsAt, fromKey } from './craft-headless.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The runner's questions of the page, apart from the run itself
function operate(options) {
  const { op } = options;
  if (op === 'needs') {
    const fetched = performance.getEntriesByType('resource').some((e) => (e.initiatorType === 'fetch' || e.initiatorType === 'xmlhttprequest') && !e.name.includes('/__plumb/'));
    return { dark: PAIRS.includes('dark') && hasDarkStyles(), scrolled: PAIRS.includes('scrolled') && scrollers().length > 0, held: PAIRS.includes('held') && fetched };
  }
  if (op === 'snapshot') { resetKeys(); return snapshot(); }
  if (op === 'scrollers') { resetKeys(); return scrollers(); }
  if (op === 'prep') {
    const el = fromKey(options.key);
    if (!el) return null;
    if (!document.getElementById('plumb-hide')) document.head.append(Object.assign(document.createElement('style'), { id: 'plumb-hide', textContent: '[data-plumb-hide] * { visibility: hidden !important; }' }));
    for (const old of document.querySelectorAll('[data-plumb-hide]')) old.removeAttribute('data-plumb-hide');
    el.setAttribute('data-plumb-hide', '');
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    const at = options.at === 'end' ? el.scrollHeight : 0;
    el.scrollTop = at;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, max: el.scrollHeight - el.clientHeight };
  }
  if (op === 'unprep') { for (const old of document.querySelectorAll('[data-plumb-hide]')) old.removeAttribute('data-plumb-hide'); return true; }
  if (op === 'skeletons') { resetKeys(); return skeletons(); }
  if (op === 'heights') { resetKeys(); return heightsAt(options.keys); }
  if (op === 'recorded') return JSON.parse(JSON.stringify({ now: performance.now(), spinners: window.__plumbRec?.spinners ?? [], shifts: window.__plumbRec?.shifts ?? [] }));
  if (op === 'pair') { pairIn(options.condition, options.data); return true; }
  if (op === 'reset') { pairsReset(); return true; }
  throw new Error(`Unknown craft operation ${op}.`);
}

export async function craftRun(overlay, { timeout = 60000, quiet = 600, op, ...rest } = {}) {
  if (op) return operate({ op, ...rest });
  resetKeys();
  const blueprint = overlay?.blueprintReader;
  if (!blueprint) throw new Error('The Plumb overlay is not mounted on this page.');
  const was = blueprint.active;
  const started = performance.now();
  let complete = true;
  try {
    blueprint.enter({ instant: true });
    // done: the reader has nothing left, and what it handed on has not changed for `quiet` ms (the theme's decisions
    // arrive late and judge everything again)
    let last = '', since = performance.now();
    for (;;) {
      const key = blueprint.items.map((i) => i.id + ':' + i.marks.length).join(',');
      if (key !== last || !blueprint.settled) (last = key), (since = performance.now());
      else if (performance.now() - since >= quiet) break;
      if (performance.now() - started > timeout) { complete = false; break; }
      await sleep(100);
    }
    const found = new Map();
    for (const item of blueprint.items) {
      const marks = item.marks.filter((m) => m.family === 'craft');
      if (!marks.length) continue;
      const at = await locate(item.el, { explain: true, batch: true }).catch(() => null);
      const site = at?.file ? at : null;
      for (const m of marks) {
        const key = [m.rule, m.text, site ? `${site.file}:${site.line}:${site.column}` : item.file ?? ''].join('|');
        const hit = found.get(key);
        if (hit) { hit.count++; continue; }
        found.set(key, {
          rule: m.rule, title: m.title, because: m.because, action: m.action, text: m.text, value: m.value ?? null,
          confidence: m.craft?.confidence ?? null, evidence: m.craft?.evidence ?? {}, suggest: m.craft?.suggest ?? null, soft: !!m.soft,
          file: site?.file ?? item.file ?? null, line: site?.line ?? null, column: site?.column ?? null,
          component: site?.component ?? null, tag: item.el.localName, count: 1,
        });
      }
    }
    return { route: location.pathname + location.search, url: location.href, read: blueprint.items.length, complete, findings: JSON.parse(JSON.stringify([...found.values()])) };
  } finally {
    if (!was) blueprint.leave({ instant: true });
  }
}
