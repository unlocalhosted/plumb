/* ─────────────────────────────────────────────────────────
 * CRAFT RUN · Plumb overlay
 *
 * The craft engine over the whole page, as plain JSON, for the headless run (`plumber craft`). It is blueprint's
 * reader doing the reading (every element it would read, off-screen too, with the same source mapping), turned on
 * without a person and left as it was found; this module only waits for the reader to run dry, then asks where in
 * the source each craft finding lives.
 *
 *  window.__plumb.craft({ timeout, scope }) → { route, url, read, complete, findings: [{ rule, title, because, action,
 *    text, value, confidence, evidence, file, line, column, component, tag, count }] }
 *
 *  dedupe  rows of a list share one site: one finding per rule, text and source site, `count` says how many elements
 *  hidden  read without drawing: the overlay's blueprint stays out of sight while it reads (a page asking for itself)
 *  scope   a CSS selector: only that element and what's inside it is read, as an Alt+click reads one element, so a
 *          census rule counts that subtree alone; nothing matching it is an error, never a silent whole-page read
 *
 * The runner's other questions (src/craft-run.ts), asked as window.__plumb.craft({ op, … }):
 *  needs                      → { dark, scrolled, held }: which pairs this page gives a reason to take
 *  snapshot                   → one record per element of the page as it is (asked of a page under a condition)
 *  scrollers · prep { key }   → the scroll containers; scroll one into view with its content hidden
 *  skeletons · heights { keys } → the skeletons now and their containers' sizes
 *  pair { condition, data }   → hand another condition's page in (before the run); reset forgets them all
 *  candidates                 → what a gesture may be tried on: { presses, toggles, menus, tooltips } (keys of places)
 *  frame { key }              → scroll an element into view; its centre
 *  now · sample · taken · since · tip · state · surfaces · where · anchor · subtrigger · spinning   the probe's reads
 *  probes { list }            → hand the recorded gestures in (before the run)
 * ───────────────────────────────────────────────────────── */
import { locate } from './locate.js';
import { PAIRS, pairIn, pairsReset, resetKeys, snapshot, hasDarkStyles, scrollers, skeletons, heightsAt, fromKey, pathKey, candidates, probesIn, sourcesIn, wantedSources } from './craft-headless.js';
import { request } from './api.js';
import { Facts, Theme, spec } from './craft.js';
import { RULES } from './craft-rules.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The runner's questions of the page, apart from the run itself
async function operate(options) {
  const { op } = options;
  const rec = window.__plumbRec;
  if (op === 'candidates') { resetKeys(); return candidates(options.scope); }
  if (op === 'frame') {
    const el = fromKey(options.key);
    if (!el) return null;
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
    const r = el.getBoundingClientRect();
    return { cx: r.x + r.width / 2, cy: r.y + r.height / 2, x: r.x, y: r.y, w: r.width, h: r.height };
  }
  if (op === 'rect') { const r = fromKey(options.key)?.getBoundingClientRect(); return r ? { cx: r.x + r.width / 2, cy: r.y + r.height / 2, x: r.x, y: r.y, w: r.width, h: r.height } : null; }
  if (op === 'now') return performance.now();
  if (op === 'sample') return rec.sample(options.key, options.props, options.ms);
  if (op === 'taken') return { frames: await rec.samples.get(options.id), events: JSON.parse(JSON.stringify(rec.events)) };
  if (op === 'since') return JSON.parse(JSON.stringify(rec.since(options.t0, options.except)));
  if (op === 'tip') return rec.tip(options.ms, options.other, options.at, options.from);
  if (op === 'state') {
    const el = fromKey(options.key);
    const menus = [...document.querySelectorAll('[role="menu"]')].filter((m) => m.getClientRects().length);
    return { expanded: el?.getAttribute('aria-expanded') === 'true', menus: menus.length, open: el?.getAttribute('data-state') === 'open' };
  }
  if (op === 'surfaces') return [...document.querySelectorAll('[cmdk-root], [role="dialog"], [role="alertdialog"], [role="listbox"]')].filter((e) => e.getClientRects().length && !e.closest('plumb-overlay')).map(pathKey);
  if (op === 'where') {
    const el = fromKey(options.key);
    const at = el && await locate(el, { explain: true, batch: true }).catch(() => null);
    return at?.file ? { file: at.file, line: at.line, column: at.column, component: at.component ?? null } : null;
  }
  if (op === 'anchor') { const el = document.querySelector('main') ?? document.body.firstElementChild; return el ? pathKey(el) : ''; }
  // the first item of the open menu, by its centre (a plain item: not one that opens a submenu)
  if (op === 'menuitem') {
    const item = [...document.querySelectorAll('[role="menu"] [role^="menuitem"]:not([aria-haspopup="menu"]):not([aria-disabled="true"])')].find((e) => e.getClientRects().length && !e.closest('plumb-overlay'));
    if (!item) return null;
    const r = item.getBoundingClientRect();
    return { cx: r.x + r.width / 2, cy: r.y + r.height / 2, x: r.x, y: r.y, w: r.width, h: r.height };
  }
  if (op === 'subtrigger') {
    const sub = [...document.querySelectorAll('[role="menu"] [aria-haspopup]:not([aria-haspopup="false"])')].find((e) => e.getClientRects().length);
    if (!sub) return null;
    const menu = sub.closest('[role="menu"]');
    const label = (n) => (n.innerText ?? n.textContent ?? '').trim().split('\n')[0].trim();
    const rects = (nodes) => [...nodes].filter((n) => n !== sub && n.getClientRects().length).map((n) => { const r = n.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, label: label(n) }; });
    const r = sub.getBoundingClientRect(), m = menu.getBoundingClientRect();
    return { key: pathKey(sub), label: label(sub), cx: r.x + r.width / 2, cy: r.y + r.height / 2, h: r.height, menu: { x: m.x, y: m.y, w: m.width, h: m.height }, siblings: rects(menu.querySelectorAll('[role^="menuitem"]')) };
  }
  if (op === 'submenu') {
    const sub = fromKey(options.key);
    const menus = [...document.querySelectorAll('[role="menu"]')].filter((m) => m.getClientRects().length);
    const inner = menus.find((m) => !m.contains(sub));
    if (!inner) return null;
    const r = inner.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }
  if (op === 'spinning') return [...(rec?.live?.values() ?? [])].map((v) => v.t0).concat((rec?.spinners ?? []).map((v) => v.t0));
  if (op === 'events') return JSON.parse(JSON.stringify(rec.events));
  if (op === 'tips') return [...document.querySelectorAll('[role="tooltip"]')].filter((n) => n.isConnected).length;
  if (op === 'probes') { probesIn(options.list); return true; }
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

// What the code says about the elements a rule will ask about: where each was written, then the server's index of it
async function prepareSources() {
  const found = [];
  await Promise.all(wantedSources().map(async (el) => {
    const at = await locate(el, { explain: true, batch: true }).catch(() => null);
    if (!at?.file) return;
    const s = await request('structure', { file: at.file, line: at.line, column: at.column }).catch(() => null);
    if (s) found.push({ k: pathKey(el), s });
  }));
  sourcesIn(found);
}

// The grey band (docs/briefs/craft-hard-rules.md, judge): what the rules marked `judge` measured but would not stand
// behind (confidence from 0.6 up to the floor). The engine drops these; the headless run hands them to the judge.
async function greyPass() {
  // every element with a box: the reader keeps only the ones it has something to say about
  const els = [...document.body.querySelectorAll('*')].filter((el) => !el.closest('plumb-overlay') && !el.closest('svg') && el.getClientRects().length && !['script', 'style', 'noscript'].includes(el.localName));
  const facts = new Facts();
  facts.items = els;
  const theme = new Theme({});
  const out = [];
  for (const el of els) {
    const item = { el };
    for (const rule of RULES) {
      if (!rule.judge) continue;
      let found = [];
      try { found = rule.check({ el: item.el, facts }, theme) ?? []; } catch {}
      for (const f of found) {
        if (!((f.confidence ?? 0) >= 0.6 && f.confidence < 0.8)) continue;
        const at = await locate(item.el, { explain: true, batch: true }).catch(() => null);
        if (!at?.file) continue;
        out.push({ rule: rule.id, at: pathKey(item.el), title: f.title, because: f.because, what: f.what, text: f.text, value: f.value ?? null, evidence: f.evidence ?? {}, confidence: f.confidence,
          file: at.file, line: at.line, column: at.column, component: at.component ?? null, tag: item.el.localName, count: 1 });
      }
    }
  }
  return out.slice(0, 12);
}

export async function craftRun(overlay, { timeout = 60000, quiet = 600, op, grey = false, scope = null, hidden = false, ...rest } = {}) {
  if (op) return operate({ op, scope, ...rest });
  resetKeys();
  await prepareSources();
  const blueprint = overlay?.blueprintReader;
  if (!blueprint) throw new Error('The Plumb overlay is not mounted on this page.');
  const within = scope ? document.querySelector(scope) : null;
  if (scope && !within) throw new Error(`Nothing on this page matches the scope ${scope}.`);
  const was = blueprint.active;
  const host = hidden ? document.querySelector('plumb-overlay') : null, shown = host?.style.visibility ?? '';
  if (host) host.style.visibility = 'hidden';
  const started = performance.now();
  let complete = true;
  try {
    if (within && was) blueprint.leave({ instant: true }); // a scope is read on its own, not added to a whole-page read
    blueprint.enter({ instant: true, scope: within });
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
      // its own craft marks, and those the theme's mark outranked on the same facet (verdict.js craftUnder)
      const marks = [...item.marks.filter((m) => m.family === 'craft'), ...item.marks.flatMap((m) => m.craftUnder ?? [])];
      if (!marks.length) continue;
      const at = await locate(item.el, { explain: true, batch: true }).catch(() => null);
      for (const m of marks) {
        // a finding about something that isn't on the page at rest (a palette) names where its code lives itself
        const own = m.craft?.evidence?.at;
        const site = own?.file ? own : at?.file ? at : null;
        const key = [m.rule, m.text, site ? `${site.file}:${site.line}:${site.column}` : item.file ?? ''].join('|');
        const hit = found.get(key);
        if (hit) { hit.count++; continue; }
        found.set(key, {
          rule: m.rule, title: m.title, because: m.because, action: m.action, laws: m.laws ?? null, text: m.text, value: m.value ?? null,
          confidence: m.craft?.confidence ?? null, evidence: m.craft?.evidence ?? {}, suggest: m.craft?.suggest ?? null, soft: !!m.soft,
          file: site?.file ?? item.file ?? null, line: site?.line ?? null, column: site?.column ?? null,
          component: site?.component ?? null, tag: item.el.localName, count: 1,
        });
      }
    }
    const result = { route: location.pathname + location.search, url: location.href, read: blueprint.items.length, complete, findings: JSON.parse(JSON.stringify([...found.values()])),
      // the standard the page was judged against (docs/briefs/craft-spec.md): the project's, once the server handed it over
      spec: spec.loaded ? JSON.parse(JSON.stringify(spec.value)) : null };
    // asked for only when there is an eye to ask (a judge flag, or answers already kept): otherwise the result is as it was
    if (grey) result.grey = JSON.parse(JSON.stringify(await greyPass()));
    return result;
  } finally {
    if (!was || within) blueprint.leave({ instant: true });
    if (was && within) blueprint.enter({ instant: true });
    if (host) host.style.visibility = shown;
  }
}
