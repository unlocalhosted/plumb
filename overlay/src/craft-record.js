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
 *  window.__plumbRec.events        [{ type, t, at }] pointer and key events in capture phase, with their time (ms) and place
 *  window.__plumbRec.anims         [{ t, at, kind, name, duration, delay, iterations, props }] every animation or transition,
 *                                  when it was first seen: the timings a gesture set going (probes, layer 5)
 *  window.__plumbRec.sample(…)     a computed-style sampler on every frame, for press feedback and interrupted motion
 *  window.__plumbRec.tip(…)        how long a tooltip takes to show after the pointer comes in
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
  const find = (k) => {
    let n = document.body;
    for (const step of k ? k.split('>') : []) {
      const [tag, i] = step.split(':');
      let seen = 0, hit = null;
      for (const c of n.children) if (c.localName === tag && ++seen === Number(i)) { hit = c; break; }
      if (!hit) return null;
      n = hit;
    }
    return n;
  };
  rec.find = find;
  // events: what a gesture did, and when
  rec.events = []; rec.firstMove = null;
  for (const type of ['pointerdown', 'pointerup', 'click', 'keydown']) {
    addEventListener(type, (e) => rec.events.push({ type, t: performance.now(), at: e.target?.nodeType === 1 ? key(e.target) : '' }), true);
  }
  addEventListener('pointermove', () => { rec.firstMove ??= performance.now(); }, true);
  // animations: every one that runs, seen on the next frame
  rec.anims = [];
  const seen = new WeakSet();
  const watch = () => {
    for (const a of document.getAnimations()) {
      if (seen.has(a)) continue;
      seen.add(a);
      const e = a.effect, target = e?.target;
      if (!target || e.pseudoElement || target.closest?.('plumb-overlay')) continue;
      const timing = e.getComputedTiming();
      let props = [];
      try { props = [...new Set(e.getKeyframes().flatMap((f) => Object.keys(f)).filter((p) => !['offset', 'computedOffset', 'easing', 'composite'].includes(p)))]; } catch {}
      rec.anims.push({ t: performance.now(), at: key(target), el: target, kind: a.transitionProperty ? 'transition' : 'animation', name: a.animationName ?? a.transitionProperty ?? '',
        duration: Number(timing.duration) || 0, delay: timing.delay || 0, iterations: timing.iterations, props });
    }
    requestAnimationFrame(watch);
  };
  requestAnimationFrame(watch);
  // the animations first seen since `t0`, apart from those on or inside the element at `except`
  rec.since = (t0, except) => {
    const skip = except ? find(except) : null;
    return rec.anims.filter((a) => a.t >= t0 && !(skip && skip.contains(a.el))).map(({ el, ...rest }) => rest);
  };
  // a sampler: each frame for `ms`, the computed `props` of the element at `at` (looked up each frame, so a surface that
  // mounts later is caught)
  rec.samples = new Map();
  rec.sample = (at, props, ms) => {
    const id = rec.samples.size + 1, frames = [], t0 = performance.now();
    rec.samples.set(id, new Promise((done) => {
      const tick = () => {
        const el = find(at), t = performance.now();
        if (el) { const s = getComputedStyle(el); frames.push({ t, v: Object.fromEntries(props.map((p) => [p, s[p]])) }); } else frames.push({ t, v: null });
        if (t - t0 < ms) requestAnimationFrame(tick); else done(frames);
      };
      requestAnimationFrame(tick);
    }));
    return id;
  };
  // how long a tooltip takes to show once the pointer moves in; `other` ignores the tooltip the last call found
  rec.tip = (ms, other, at) => new Promise((done) => {
    const ignore = other ? rec.tipNode : null;
    const target = at ? find(at) : null;
    rec.firstMove = null;
    // the clock starts when the pointer comes onto the trigger, not when it sets off towards it
    const enter = (e) => { if (rec.firstMove === null && target?.contains(e.target)) rec.firstMove = performance.now(); };
    addEventListener('pointerover', enter, true);
    const stop = (value) => { removeEventListener('pointerover', enter, true); done(value); };
    const t0 = performance.now();
    const tick = () => {
      const t = performance.now();
      const tips = [...document.querySelectorAll('[role="tooltip"]')].filter((n) => n !== ignore && n.isConnected);
      if (tips.length && rec.firstMove !== null) { rec.tipNode = tips[0]; return stop({ ms: t - rec.firstMove }); }
      if (t - t0 > ms) return stop(null);
      requestAnimationFrame(tick);
    };
    tick();
  });
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
