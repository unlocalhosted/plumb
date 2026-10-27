/* ─────────────────────────────────────────────────────────
 * CRAFT RECORD · React Plumber
 *
 * A plain script the headless run (src/craft-run.ts) adds to a page before the app's own scripts, so it sees the
 * page from its first frame. It only watches: it writes nothing to the page and stays quiet in a page nobody reads.
 * It is not an overlay module (the live overlay never loads it).
 *
 *  window.__plumbRec.key(el)       the element's place in the page: tag and index among same-tag siblings, from body
 *  window.__plumbRec.spinners      [{ at, t0, t1 }] each spinner that appeared and went: the place of the nearest
 *                                  ancestor still on the page afterwards, and when it showed and went (ms)
 *  window.__plumbRec.shifts        [{ t, value, input, at: [place of each shifted node] }]
 *  window.__plumbRec.timeline      { start(), stop() } → what changed on the page after a gesture (probes, layer 5)
 *
 * Keep `key` in step with pathKey in craft-headless.js.
 * ───────────────────────────────────────────────────────── */
(() => {
  if (window.__plumbRec) return;
  const SPIN = '[role="status"], .animate-spin, [data-spinner]';
  const key = (el) => {
    const out = [];
    for (let n = el; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
      let i = 1;
      for (let s = n.previousElementSibling; s; s = s.previousElementSibling) if (s.localName === n.localName) i++;
      out.push(`${n.localName}:${i}`);
    }
    return out.reverse().join('>');
  };
  const rec = (window.__plumbRec = { key, spinners: [], shifts: [], live: new Map() });
  const shown = (el) => el.isConnected && !el.closest('plumb-overlay') && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const scan = () => {
    const t = performance.now();
    const now = new Set([...document.querySelectorAll(SPIN)].filter(shown));
    for (const el of now) if (!rec.live.has(el)) {
      const chain = []; for (let n = el.parentElement; n; n = n.parentElement) chain.push(n);
      rec.live.set(el, { t0: t, chain });
    }
    for (const [el, v] of rec.live) if (!now.has(el)) {
      const host = v.chain.find((n) => n.isConnected);
      rec.spinners.push({ at: host ? key(host) : '', t0: v.t0, t1: t });
      rec.live.delete(el);
    }
  };
  const start = () => {
    new MutationObserver(scan).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'role', 'aria-busy'] });
    scan();
  };
  if (document.documentElement) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        const at = [];
        for (const s of e.sources ?? []) { const n = s.node?.nodeType === 3 ? s.node.parentElement : s.node; if (n?.isConnected) at.push(key(n)); }
        rec.shifts.push({ t: e.startTime, value: e.value, input: e.hadRecentInput, at });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {}
})();
