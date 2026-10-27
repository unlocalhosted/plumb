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
 * ───────────────────────────────────────────────────────── */
import { locate } from './locate.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function craftRun(overlay, { timeout = 60000, quiet = 600 } = {}) {
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
