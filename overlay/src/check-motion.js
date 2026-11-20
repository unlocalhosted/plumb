/* ─────────────────────────────────────────────────────────
 * A CHECK'S FIX, MOVING · React Plumber
 *
 * Each check's example (the docs: What it checks), played with the same motion as the tiles of "How a change moves"
 * (show-motion.js: the guides, the beats, the spring, the rolling pill): one motion for every fix (interaction
 * principles 35b). A check is a spec: its scene, its guides, and at(p), the scene at any point p between broken (0)
 * and fixed (1). One player runs it two ways: Play (the beats: the guides draw in, the fix moves on the spring with
 * the guides following, the pill rolls and lands on your token, the guides go) and Drag (the same motion held at
 * wherever the hand is, landing when it reaches fixed).
 *
 *  CHECK_SPECS[id](stage) → { from, to, unit, name?, labels?: [before, after], guides: [{ el, kind }], at(p), track() }
 *  mountCheck(host, id, { tokensCss }) → { play(), scrub(p), at(p) } | null
 * ───────────────────────────────────────────────────────── */
import { BEAT } from './motion-beats.js';
import { MOTION_CSS, TILE_BEATS as T, rollValues, pillHtml, animateTo, waitFor } from './show-motion.js';

// the spring, sampled: the overlay's curve (motion-beats.js SPRING) as a function, so a held point and a played
// moment are the same place on it
const PTS = [[0, 0], [0.06, 0.21], [0.15, 0.62], [0.25, 0.9], [0.36, 1.01], [0.46, 1.02], [0.6, 1], [1, 1]];
export const spring = (t) => { for (let i = 1; i < PTS.length; i++) { const [x0, y0] = PTS[i - 1], [x1, y1] = PTS[i]; if (t <= x1) return y0 + (y1 - y0) * ((t - x0) / (x1 - x0 || 1)); } return 1; };
const mix = (a, b, p) => `color-mix(in oklab, ${b} ${Math.round(Math.max(0, Math.min(1, p)) * 100)}%, ${a})`;
const lerp = (a, b, p) => a + (b - a) * p;
const at = (el, css) => { el.style.cssText = css; };
const CSS = `
  .ck-scene { position: absolute; inset: 0; display: grid; place-items: center; }
  .btn2 { display: inline-flex; align-items: center; height: 40px; padding: 0 18px; border-radius: 9px; color: #fff; font: 600 14px system-ui; }
  .cap { position: absolute; left: 0; right: 0; bottom: 14px; text-align: center; font: 500 12px system-ui; color: #6b7280; }
  .panel { background: #f3f4f6; border-radius: 10px; font: 600 14px system-ui; }
  .dark { background: #0f172a; color: #f1f5f9; border-radius: 14px; padding: 18px 20px; display: grid; gap: 4px; min-width: 250px; font: 400 14px system-ui; }
  .light { background: #fff; color: #111827; border-radius: 14px; padding: 18px 20px; display: grid; gap: 4px; min-width: 250px; box-shadow: inset 0 0 0 1px rgb(0 0 0 / .08); font: 400 14px system-ui; }
  .menu { padding: 8px 14px; border-radius: 8px; background: #f3f4f6; font: 600 14px system-ui; }
  .sw { display: grid; grid-template-columns: 18px 1fr auto; gap: 10px; align-items: center; font: 500 13px system-ui; overflow: hidden; }
  .sw i { width: 18px; height: 18px; border-radius: 5px; } .sw small { color: #6b7280; }
  .badge { display: inline-flex; align-items: center; height: 22px; border-radius: 99px; background: #eef2ff; color: #3730a3; font-weight: 600; font-family: system-ui; }
  .g[data-off] { opacity: 0 !important; }
  .key { display: inline-grid; place-items: center; min-width: 30px; height: 24px; padding: 0 7px; border-radius: 6px; background: #f3f4f6; box-shadow: inset 0 -2px 0 #d1d5db; font: 600 11px system-ui; color: #374151; }
`;

// the guides a spec asks for, made in its stage
const make = (s, cls) => { const el = document.createElement('i'); el.className = `g ${cls}`; s.append(el); return el; };
const ringAround = (ring, el, s, pad = 7) => { const S = s.getBoundingClientRect(), r = el.getBoundingClientRect(); at(ring, `left:${r.left - S.left - pad}px;top:${r.top - S.top - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px;border-radius:${(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 8) + pad}px`); };
const pillOver = (pill, el, s, dy = 16) => { const S = s.getBoundingClientRect(), r = el.getBoundingClientRect(); at(pill, `left:${r.left - S.left + r.width / 2}px;top:${r.top - S.top - dy}px`); };
const pillLeft = (pill, y, x) => { at(pill, `left:${x}px;top:${y}px`); };

// a colour that changes on one element, its value a name (the colour checks)
const colourCheck = ({ html, pick, from, to, prop = 'background', labels, after }) => (s) => {
  s.innerHTML = `<div class="ck-scene">${html}</div>`;
  const el = s.querySelector(pick), ring = make(s, 'ring'), pill = make(s, 'pill');
  return { labels, guides: [{ el: ring, kind: 'ring' }, { el: pill, kind: 'pill' }],
    at: (p) => { el.style[prop] = mix(from, to, p); after?.(s, p); }, track: () => { ringAround(ring, el, s); pillOver(pill, el, s, 18); } };
};
const REBRAND = '<span class="cap">Your theme was rebranded from indigo to teal.</span>';
export const CHECK_SPECS = {
  'provenance/color/by-value': colourCheck({ html: `<div style="display:flex;gap:16px"><span class="btn2" style="background:#0f766e">Save</span><span class="btn2 up">Upgrade</span></div>${REBRAND}`,
    pick: '.up', from: '#4f46e5', to: '#0f766e', labels: ['#4f46e5, typed', 'primary'] }),
  'provenance/color/tier': colourCheck({ html: `<span class="btn2 go">Continue</span>${REBRAND}`, pick: '.go', from: '#2563eb', to: '#0f766e', labels: ['blue-600', 'action'] }),
  'provenance/color': colourCheck({ html: '<div class="dark"><b>Usage this month</b><span class="q">2,401 of 5,000 requests</span></div><span class="cap">Your app in its dark theme.</span>',
    pick: '.q', prop: 'color', from: '#4b5563', to: '#94a3b8', labels: ['#4b5563', 'muted'] }),
  'provenance/color/framework': colourCheck({ html: '<div class="dark"><b>Deployments</b><span class="q">Updated 2 minutes ago</span></div><span class="cap">Your app in its dark theme.</span>',
    pick: '.q', prop: 'color', from: '#475569', to: '#94a3b8', labels: ['slate-500, Tailwind’s', 'muted'] }),
  'existence/dead-class': colourCheck({ html: '<span class="btn2 go" style="color:#111;box-shadow:inset 0 0 0 1px #d1d5db">Get started</span>', pick: '.go', from: 'transparent', to: '#4f46e5', labels: ['brand-500: no CSS', 'primary'],
    after: (s, p) => { const b = s.querySelector('.go'); b.style.color = p > 0.5 ? '#fff' : '#111'; b.style.boxShadow = `inset 0 0 0 1px rgb(209 213 219 / ${1 - p})`; } }),
  'existence/dead-var': colourCheck({ html: '<div class="light"><b>Billing</b><span class="q">Next invoice on 1 December</span></div>', pick: '.q', prop: 'color', from: '#111827', to: '#64748b', labels: ['--text-muted: undefined', '--color-muted'] }),
  // a length on one place, measured: two hairlines, the I-beam, the pill rolling the number (as the Padding tile)
  'provenance/arbitrary': (s) => {
    s.innerHTML = `<div class="ck-scene"><div style="display:grid;gap:8px;width:220px">${['Profile', 'Billing', 'Team'].map((w, i) => `<div class="panel${i === 1 ? ' x' : ''}" style="padding:16px">${w}</div>`).join('')}</div></div>`;
    const x = s.querySelector('.x'), t = make(s, 'hl'), u = make(s, 'hl'), beam = make(s, 'beam'), pill = make(s, 'pill');
    return { from: 22, to: 16, unit: 'px', name: 'space-4', guides: [{ el: t, kind: 'h' }, { el: u, kind: 'h' }, { el: beam, kind: 'beam' }, { el: pill, kind: 'pill' }],
      at: (p) => { x.style.padding = `${lerp(22, 16, p)}px 16px`; },
      track: () => { const S = s.getBoundingClientRect(), r = x.getBoundingClientRect(), pt = parseFloat(getComputedStyle(x).paddingTop), y1 = r.top - S.top, y2 = y1 + pt;
        at(t, `top:${y1}px;left:0;right:0`); at(u, `top:${y2}px;left:0;right:0`); at(beam, `left:${r.left - S.left - 24}px;top:${y1}px;height:${y2 - y1}px`); pillLeft(pill, (y1 + y2) / 2, r.left - S.left - 56); } };
  },
  'provenance/radius': (s) => {
    s.innerHTML = `<div class="ck-scene"><div style="display:flex;gap:14px">${[0, 1, 2].map((i) => `<div class="panel${i === 1 ? ' x' : ''}" style="width:84px;height:68px;border-radius:12px"></div>`).join('')}</div></div>`;
    const x = s.querySelector('.x'), arc = make(s, 'arc'), pill = make(s, 'pill');
    return { from: 3, to: 12, unit: 'px', name: 'card', guides: [{ el: arc, kind: 'ring' }, { el: pill, kind: 'pill' }],
      at: (p) => { x.style.borderRadius = `${lerp(3, 12, p)}px`; },
      track: () => { const S = s.getBoundingClientRect(), r = x.getBoundingClientRect(), rad = parseFloat(getComputedStyle(x).borderTopLeftRadius); at(arc, `left:${r.left - S.left - 5}px;top:${r.top - S.top - 5}px;width:${Math.max(12, rad * 2) + 10}px;height:${Math.max(12, rad * 2) + 10}px;border-top-left-radius:${rad + 5}px`); pillOver(pill, x, s, 22); } };
  },
  'provenance/type': (s) => {
    s.innerHTML = `<div class="ck-scene"><div style="display:grid;gap:8px;width:210px;font-family:system-ui">${['Inbox', 'Starred', 'Sent'].map((w, i) => `<span class="panel" style="padding:7px 10px;font-weight:500"><span class="${i === 2 ? 'x' : ''}" style="font-size:14px">${w}</span></span>`).join('')}</div></div>`;
    const x = s.querySelector('.x'), cap = make(s, 'hl'), base = make(s, 'hl'), beam = make(s, 'beam'), pill = make(s, 'pill');
    return { from: 17, to: 14, unit: 'px', name: 'body', guides: [{ el: cap, kind: 'h' }, { el: base, kind: 'h' }, { el: beam, kind: 'beam' }, { el: pill, kind: 'pill' }],
      at: (p) => { x.style.fontSize = `${lerp(17, 14, p)}px`; },
      track: () => { const S = s.getBoundingClientRect(), r = x.getBoundingClientRect(), fs = parseFloat(getComputedStyle(x).fontSize), b = r.top - S.top + (r.height + fs * 0.72) / 2, c = b - fs * 0.72;
        at(cap, `top:${c}px;left:0;right:0`); at(base, `top:${b}px;left:0;right:0`); at(beam, `left:${r.left - S.left - 40}px;top:${c}px;height:${b - c}px`); pillLeft(pill, (b + c) / 2, r.left - S.left - 72); } };
  },
  'provenance/elevation': (s) => {
    const from = [0, 18, 40, -6, 0.45], to = [0, 1, 3, 0, 0.14];
    s.innerHTML = '<div class="ck-scene" style="background:#f3f4f6"><div style="display:flex;gap:22px"><div class="x" style="width:120px;height:80px;border-radius:12px;background:#fff"></div><div style="width:120px;height:80px;border-radius:12px;background:#fff;box-shadow:0 1px 3px rgb(0 0 0 / .14)"></div></div></div>';
    const x = s.querySelector('.x'), ring = make(s, 'ring'), pill = make(s, 'pill');
    let reach = 30;
    return { labels: ['glow, by hand', 'shadow-card'], guides: [{ el: ring, kind: 'ring' }, { el: pill, kind: 'pill' }],
      at: (p) => { const v = from.map((f, i) => lerp(f, to[i], p)); x.style.boxShadow = `0 ${v[1]}px ${v[2]}px ${v[3]}px rgb(${Math.round(lerp(79, 0, p))} ${Math.round(lerp(70, 0, p))} ${Math.round(lerp(229, 0, p))} / ${v[4]})`; reach = lerp(30, 6, p); },
      track: () => { ringAround(ring, x, s, reach); pillOver(pill, x, s, reach + 8); } };
  },
  'provenance/motion': (s) => {
    s.innerHTML = '<div class="ck-scene" style="align-content:center;gap:24px"><div style="display:flex;gap:10px"><span class="menu">File</span><span class="menu x">Edit</span><span class="menu">View</span></div><div style="position:relative;width:240px;height:10px"><i class="ghost" style="position:absolute;inset:0;border-radius:5px;border:1.5px dashed color-mix(in oklab, var(--pl-coral) 70%, transparent)"></i><i class="len" style="position:absolute;left:0;top:0;height:10px;width:240px;border-radius:5px;background:var(--c)"></i></div></div>';
    const x = s.querySelector('.x'), len = s.querySelector('.len'), pill = make(s, 'pill');
    return { from: 440, to: 150, step: 10, unit: 'ms', name: 'fast', guides: [{ el: pill, kind: 'pill' }],
      at: (p) => { len.style.width = `${lerp(240, 240 * 150 / 440, p)}px`; },
      track: () => { const S = s.getBoundingClientRect(), r = len.getBoundingClientRect(); pillLeft(pill, r.bottom - S.top + 26, r.right - S.left); },
      landed: () => { x.animate([{ background: '#f3f4f6' }, { background: '#4f46e5', color: '#fff', scale: .96, offset: .5 }, { background: '#f3f4f6' }], { duration: 300 }); } };
  },
  'provenance/z': (s) => {
    s.innerHTML = '<div class="ck-scene"><div style="position:relative;width:320px;height:160px;border-radius:12px;background:#f3f4f6"><div class="tip" style="position:absolute;left:150px;top:44px;padding:6px 10px;border-radius:8px;background:#111827;color:#fff;font:500 12px system-ui;white-space:nowrap;z-index:2">Last edited by Sam</div><div style="position:absolute;inset:22px 40px;display:grid;gap:12px;place-content:center;justify-items:center;background:#fff;border-radius:12px;box-shadow:0 10px 30px -8px rgb(0 0 0 / .3);font:600 14px system-ui;z-index:1">Delete project?<span class="btn2" style="background:#dc2626;height:32px">Delete</span></div></div></div>';
    const tip = s.querySelector('.tip'), ring = make(s, 'ring'), pill = make(s, 'pill');
    return { labels: ['z 999', 'tooltip layer'], guides: [{ el: ring, kind: 'ring' }, { el: pill, kind: 'pill' }],
      // under the dialog by the end: it sinks and goes behind as the layers are named
      at: (p) => { tip.style.zIndex = p > 0.5 ? 0 : 2; tip.style.opacity = String(lerp(1, 0.35, p)); tip.style.transform = `translateY(${lerp(0, 6, p)}px) scale(${lerp(1, 0.96, p)})`; },
      track: () => { ringAround(ring, tip, s, 6); pillOver(pill, tip, s, 14); } };
  },
  'dead/color': (s) => {
    const rows = [['primary', '#4f46e5', '31 uses'], ['muted', '#64748b', '18 uses'], ['danger', '#dc2626', '4 uses'], ['brand-old', '#7c3aed', 'unused'], ['accent-2', '#db2777', 'unused']];
    s.innerHTML = `<div class="ck-scene"><div class="list" style="display:grid;gap:6px;width:250px">${rows.map(([n, c, u]) => `<span class="sw${u === 'unused' ? ' dead' : ''}" style="height:24px"><i style="background:${c}"></i>${n}<small style="${u === 'unused' ? 'color:#dc2626' : ''}">${u}</small></span>`).join('')}</div></div>`;
    const dead = [...s.querySelectorAll('.dead')], list = s.querySelector('.list'), ring = make(s, 'ring'), pill = make(s, 'pill');
    return { labels: ['2 nobody uses', '3, each in use'], guides: [{ el: ring, kind: 'ring' }, { el: pill, kind: 'pill' }],
      at: (p) => { for (const d of dead) { d.style.height = `${lerp(24, 0, p)}px`; d.style.opacity = String(1 - p); d.style.marginTop = `${lerp(0, -6, p)}px`; } },
      track: () => { ringAround(ring, list, s, 8); pillOver(pill, list, s, 16); } };
  },
  'imitation/{Component}': (s) => {
    s.innerHTML = '<div class="ck-scene" style="gap:14px;align-content:center"><span class="btn2 x" style="background:#4f46e5">Invite</span><span style="font:500 12px system-ui;color:#6b7280">Press <span class="key">Tab</span></span></div>';
    const x = s.querySelector('.x'), ring = make(s, 'ring'), pill = make(s, 'pill');
    return { labels: ['div, by hand', '<Button>'], guides: [{ el: ring, kind: 'ring' }, { el: pill, kind: 'pill' }],
      at: (p) => { x.style.boxShadow = `0 0 0 ${lerp(0, 2, p)}px #fff, 0 0 0 ${lerp(0, 5, p)}px rgb(165 180 252 / ${p})`; },
      track: () => { ringAround(ring, x, s, 11); pillOver(pill, x, s, 20); } };
  },
  'ownership/{Component}': (s) => {
    s.innerHTML = '<div class="ck-scene"><div style="display:flex;gap:10px;align-items:center"><span class="badge x">Beta</span><span class="badge" style="padding:0 8px;font-size:12px">New</span></div></div>';
    const x = s.querySelector('.x'), ring = make(s, 'ring'), pill = make(s, 'pill');
    return { labels: ['styles laid over', 'size="sm"'], guides: [{ el: ring, kind: 'ring' }, { el: pill, kind: 'pill' }],
      at: (p) => { x.style.padding = `0 ${lerp(2, 8, p)}px`; x.style.fontSize = `${lerp(10, 12, p)}px`; },
      track: () => { ringAround(ring, x, s, 7); pillOver(pill, x, s, 16); } };
  },
};

// One player for every check: the tile's beats when played, the same motion held at a point when dragged
export function mountCheck(host, id, { tokensCss = '' } = {}) {
  const build = CHECK_SPECS[id];
  if (!build) return null;
  const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>${tokensCss}${MOTION_CSS}${CSS} .stage { height: 250px; } .ring, .arc { pointer-events: none; }</style><div class="stage"></div>`;
  const stage = root.querySelector('.stage'), spec = build(stage), pill = spec.guides.find((g) => g.kind === 'pill')?.el;
  const num = Number.isFinite(spec.from) && Number.isFinite(spec.to), vals = num ? rollValues(spec.from, spec.to, spec.step ?? 1, (v) => Math.round(v)) : null;
  let run = 0, p = 0, swapped = false;
  const setPill = (k, landed) => {
    if (!pill) return;
    if (num) {
      if (landed) { pill.innerHTML = pillHtml([Math.round(spec.to)], spec.unit, spec.name); return; }
      if (!pill.querySelector('.roll')) pill.innerHTML = pillHtml(vals, spec.unit);
      pill.querySelector('.roll > span').style.transform = `translateY(${-Math.min(1, Math.max(0, k)) * (vals.length - 1) * 22}px)`;
    } else {
      const want = k >= 0.5 ? 1 : 0;
      if (pill.dataset.side !== String(want)) { pill.dataset.side = String(want); pill.textContent = spec.labels[want]; if (swapped) animateTo(pill, [{ opacity: 0, filter: 'blur(2px)' }, { opacity: 1, filter: 'blur(0)' }], { duration: 200 }); swapped = true; }
    }
  };
  const show = (k, landed = false) => { p = k; spec.at(k); spec.track(); setPill(k, landed); stage.toggleAttribute('data-landed', landed); };
  // hidden by an attribute: the guides' places are rewritten every frame (style), which would wipe a hidden style
  const guides = (on) => { for (const g of spec.guides) g.el.toggleAttribute('data-off', !on); };
  guides(false); show(0);
  return {
    // the beats: guides draw in, a hold, the move on the spring (the guides following), the landing, the guides go
    async play() {
      const mine = ++run; swapped = false; pill && delete pill.dataset.side; show(0); guides(true);
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { show(1, true); await waitFor(900); if (mine === run) guides(false); return; }
      await Promise.all(spec.guides.map((g, i) => g.kind === 'h' ? animateTo(g.el, [{ transform: 'scaleX(0)', opacity: 0 }, { transform: 'scaleX(1)', opacity: 1 }], { duration: T.guides, delay: i * 40, easing: 'cubic-bezier(.2,.8,.2,1)' })
        : animateTo(g.el, [{ opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1 }], { duration: T.guides * 0.8, delay: 120, easing: 'cubic-bezier(.34,1.56,.64,1)' })));
      await waitFor(T.hold); if (mine !== run) return;
      const t0 = performance.now(), dur = T.move;
      await new Promise((done) => { const f = () => { if (mine !== run) return done(); const k = Math.min(1, (performance.now() - t0) / dur); show(spring(k)); if (k < 1) requestAnimationFrame(f); else done(); }; f(); });
      if (mine !== run) return;
      show(1, true); spec.landed?.(); pill && animateTo(pill, [{ scale: 1 }, { scale: 1.08 }, { scale: 1 }], { duration: 360, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      await waitFor(T.land + 380); if (mine !== run) return;
      await Promise.all(spec.guides.map((g) => animateTo(g.el, [{ opacity: 1 }, { opacity: 0 }], { duration: T.out, easing: 'ease-out' })));
      if (mine === run) { for (const g of spec.guides) g.el.getAnimations().forEach((a) => a.cancel()); guides(false); }
    },
    // the same motion, held: the guides show, the scene and the pill sit where the hand is, it lands at the end
    scrub(k) { run++; for (const g of spec.guides) g.el.getAnimations().forEach((a) => a.cancel()); guides(true); show(k, k >= 0.999); },
    // a still: the scene at p, no guides (a gallery card's picture)
    still(k) { run++; guides(false); show(k); },
    get p() { return p; },
  };
}
