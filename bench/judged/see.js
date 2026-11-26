// The seen picture drawn over a live page, with nothing judged (docs/briefs/shape-engine.md, section 20, layer 1).
// It is here so a person can say whether the groups the engine sees are the groups they see.
//
//   read(win)   looks at the page once and gives plain rows, one per drawn area (a block of text, a picture, a drawn
//               box, a line), each with the drawn box it lies in. No tag name, role or source is used to decide
//               what a unit is: only what is drawn.
//   see(...)    the view: the page in a frame, the tree from seen.js outlined over it one level at a time.
import { grow, levels, RATIO } from './seen.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const host = (url) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
const PICTURE = new Set(['img', 'video', 'canvas', 'svg', 'picture', 'iframe', 'object', 'embed']);
const NEVER = new Set(['script', 'style', 'noscript', 'template', 'link', 'meta', 'head', 'title', 'br', 'wbr', 'plumb-overlay', 'nextjs-portal']);
const SHOWS = 6; // two fills this far apart on any channel (of 255) are two fills. Plumber's convention, not sourced.

export function read(win) {
  const doc = win.document, units = [], els = [];
  const vw = win.innerWidth, tall = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight, win.innerHeight);
  // any CSS colour, as four numbers, by letting the browser paint it
  const ctx = Object.assign(doc.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true }), known = new Map();
  const colour = (s) => {
    if (!known.has(s)) { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = s; ctx.fillRect(0, 0, 1, 1); known.set(s, [...ctx.getImageData(0, 0, 1, 1).data]); }
    return known.get(s);
  };
  const apart = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
  const push = (kind, el, parent, r, parts) => { units.push({ parent, kind, x: r.left, y: r.top, w: r.width, h: r.height }); els.push({ el, parts }); return units.length - 1; };
  const inline = (s) => s.display === 'inline' || s.display === 'contents';
  // the lines of text a block sets itself: its own text, and the text of what flows in its lines
  const ink = (el) => {
    const parts = [];
    for (const n of el.childNodes) {
      if (n.nodeType === 3 && n.nodeValue.trim()) { const r = doc.createRange(); r.selectNodeContents(n); parts.push(r); }
      else if (n.nodeType === 1 && !PICTURE.has(n.localName) && !NEVER.has(n.localName) && n.textContent.trim() && inline(win.getComputedStyle(n))) parts.push(n);
    }
    return parts.length ? parts : null;
  };
  const drawn = (s, behind) => {
    const c = colour(s.backgroundColor), fill = c[3] >= 128 && apart(c, behind) > SHOWS;
    let sides = 0;
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) if (parseFloat(s[`border${side}Width`]) > 0 && s[`border${side}Style`] !== 'none' && colour(s[`border${side}Color`])[3] > 38) sides++;
    return fill || sides >= 3 || s.boxShadow !== 'none' || s.backgroundImage !== 'none' ? { fill: fill ? c : null } : null;
  };
  const walk = (el, parent, behind) => {
    for (const c of el.children) {
      if (NEVER.has(c.localName) || c.checkVisibility?.({ checkOpacity: true, checkVisibilityCSS: true }) === false) continue;
      const s = win.getComputedStyle(c), r = c.getBoundingClientRect(), big = r.width >= 3 && r.height >= 3;
      if (PICTURE.has(c.localName)) { if (big) push('picture', c, parent, r); continue; }
      let here = parent, back = behind;
      const d = big && !inline(s) && drawn(s, behind);
      if (d) {
        // the page's own ground is not a box on it
        if (r.width >= vw * 0.95 && r.height >= tall * 0.95) back = d.fill ?? behind;
        else if (Math.min(r.width, r.height) <= 2) push('line', c, parent, r);
        else { here = push('box', c, parent, r); back = d.fill ?? behind; }
      }
      const parts = inline(s) ? null : ink(c);
      if (parts) { const t = inkBox(parts); if (t.width >= 3 && t.height >= 3) push('text', c, here, t, parts); }
      walk(c, here, back);
    }
  };
  walk(doc.body, -1, (() => { const b = colour(win.getComputedStyle(doc.body).backgroundColor); return b[3] >= 128 ? b : colour(win.getComputedStyle(doc.documentElement).backgroundColor)[3] >= 128 ? colour(win.getComputedStyle(doc.documentElement).backgroundColor) : [255, 255, 255, 255]; })());
  return { units, els };
}
// one box round every line of a block's text
export function inkBox(parts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of parts) for (const r of p.getClientRects()) { if (!r.width || !r.height) continue; x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); }
  return x1 < x0 ? { left: 0, top: 0, width: 0, height: 0 } : { left: x0, top: y0, width: x1 - x0, height: y1 - y0 };
}

const CSS = `
  .desk.two { display: grid; grid-template-columns: minmax(0, 1fr) 360px; }
  .view { position: relative; overflow: hidden; min-height: 0; }
  .side { overflow: auto; min-height: 0; background: var(--pl-paper); padding: var(--pl-space-6) var(--pl-space-6) 48px; display: grid; align-content: start; gap: var(--pl-space-6); }
  .side h2 { font: var(--pl-card-title); margin: 0; } .side p { font: var(--pl-card-meta); color: var(--pl-ink-2); margin: 0; }
  .bar a.path { text-decoration: none; } .acts a { text-decoration: none; }
  .steps { display: flex; align-items: center; gap: var(--pl-space-3); flex-wrap: wrap; }
  .steps .chip[aria-pressed="true"] { background: var(--pl-ink); color: var(--pl-paper); }
  .chip.u { --h: var(--pl-sky); --on: var(--pl-sky-on); }
  .key { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--pl-space-3); }
  .key li { display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: var(--pl-space-4); align-items: start; font: var(--pl-card-meta); }
  .key i { width: 22px; height: 16px; border-radius: 5px; box-sizing: border-box; border: 3px solid var(--h); margin-top: 1px; }
  .key b { font: var(--pl-card-body); display: block; } .key span { color: var(--pl-ink-2); }
  .t-box { --h: var(--pl-butter); } .t-groups { --h: var(--pl-lilac); } .t-run { --h: var(--pl-sky); } .t-pile { --h: var(--pl-coral); } .t-unit { --h: var(--pl-mint, var(--pl-pink)); }
  .now { padding: var(--pl-space-5); border-radius: 14px; background: var(--pl-paper-2); min-height: 86px; }
  .now b { font: var(--pl-card-body); display: block; margin-bottom: 2px; } .now span { font: var(--pl-card-meta); color: var(--pl-ink-2); }
  .seen { position: absolute; inset: 0; pointer-events: none; }
  .g { position: absolute; box-sizing: border-box; border: 3px solid var(--h); border-radius: 10px; box-shadow: 0 0 0 1px var(--pl-halo), inset 0 0 0 1px var(--pl-halo); }
  .g.on { background: color-mix(in oklab, var(--h) 22%, transparent); }
  .g.leaf { border-width: 1.5px; border-radius: 4px; box-shadow: none; }
  .layer.using { pointer-events: none; }
`;

const HOW = {
  box: (n) => `A drawn box. ${n.how ? `Inside, ${INNER[n.how.type](n.how, n.children.length)}` : n.children.length === 1 ? 'It holds one thing.' : ''}`,
  groups: (n) => `${n.children.length} parts, set apart by a gap ${n.ratio} times the gaps inside them. They sit ${n.axis === 'y' ? 'one under another' : 'side by side'}.`,
  run: (n) => `${n.children.length} things ${n.axis === 'y' ? 'in a column' : 'in a row'}, about ${n.gap}px apart, with no gap large enough to split them.`,
  pile: (n) => `${n.children.length} things that overlap, so no gap separates them.`,
  unit: () => 'One drawn area with nothing inside it.',
};
const INNER = {
  groups: (h, n) => `${n} parts set apart by a gap ${h.ratio} times the gaps inside them.`,
  run: (h, n) => `${n} things ${h.axis === 'y' ? 'in a column' : 'in a row'}, about ${h.gap}px apart.`,
  pile: (h, n) => `${n} things that overlap.`,
};
const NAME = { box: 'A drawn box', groups: 'Parts set apart by space', run: 'An even run', pile: 'A pile', unit: 'A single thing' };

export function see(el, root, base, loaded, soften) {
  const { set } = loaded;
  const link = (name) => (name ? `http://${name}.localhost:${loaded.port}/__judge/?seen=1` : null);
  root.innerHTML = `<style>${base}${CSS}</style>
    <header class="bar">
      <div class="where"><b class="count">${esc(set.title ?? set.name)}</b><a class="path" href="${esc(set.app)}" target="_blank" rel="noreferrer">${esc(host(set.app))}</a></div>
      <p class="ask">What the engine sees, before it reads a word. Hold <kbd>Space</kbd> to use the page.</p>
      <div class="acts">${loaded.list ? `<a class="s-btn bare" href="http://localhost:${loaded.port}/__judge/"><span>All sets</span></a>` : ''}
        ${link(loaded.before) ? `<a class="s-btn bare" href="${link(loaded.before)}"><span>Previous</span></a>` : ''}
        <button type="button" class="s-btn q again"><span>Read again</span></button>
        ${link(loaded.after) ? `<a class="s-btn" href="${link(loaded.after)}"><span>Next site</span></a>` : ''}</div>
    </header>
    <main class="desk two">
      <div class="view"><div class="stage"><iframe title="The page being read"></iframe><div class="layer"><div class="seen"></div></div></div></div>
      <aside class="side">
        <div><h2>Level</h2><p>Level 1 is the parts the page first falls into. Each level after splits those parts again.</p></div>
        <div class="steps"></div>
        <div class="now"><b>Point at a part</b><span>to see why the engine took it as one thing.</span></div>
        <ul class="key">
          <li class="t-box"><i></i><div><b>A drawn box</b><span>A fill, an outline or a shadow that holds things.</span></div></li>
          <li class="t-groups"><i></i><div><b>Parts set apart by space</b><span>The gap between them is at least ${RATIO} times the gaps inside them.</span></div></li>
          <li class="t-run"><i></i><div><b>An even run</b><span>A row or a column with gaps too alike to split.</span></div></li>
          <li class="t-pile"><i></i><div><b>A pile</b><span>Things that overlap.</span></div></li>
          <li class="t-unit"><i></i><div><b>A single thing</b><span>A block of text or a picture.</span></div></li>
        </ul>
        <p class="tally"></p>
      </aside>
    </main>`;
  soften(root);
  const $ = (sel) => root.querySelector(sel);
  const frame = $('iframe'), layer = $('.layer'), seen = $('.seen'), stage = $('.stage'), view = $('.view');
  const screen = set.screens[0];
  let scale = 1, got = null, tree = null, flat = [], level = 1, units = false, over = null, held = false;

  const fit = () => {
    const w = screen?.width ?? set.width ?? 1440, room = view.clientWidth - 32, tallness = view.clientHeight - 32;
    scale = Math.min(1, room / w);
    Object.assign(stage.style, { width: `${w}px`, height: `${Math.max(200, tallness / scale)}px`, transform: `translateX(-50%) scale(${scale})` });
  };
  // where a node is now: the page may have scrolled since it was read
  const nowOf = (n) => {
    if (n.type === 'unit' || n.type === 'box') { const { el: e, parts } = got.els[n.unit]; const r = parts ? inkBox(parts) : e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const c of n.children) { const r = nowOf(c); if (!r.w) continue; x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y); x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h); }
    return x1 < x0 ? { x: 0, y: 0, w: 0, h: 0 } : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  };
  let shown = [];
  const draw = () => {
    if (!tree) return;
    const h = stage.clientHeight, w = stage.clientWidth, html = [];
    shown = [];
    const add = (n, leaf) => {
      const r = nowOf(n);
      if (!r.w || r.y > h || r.y + r.h < 0 || r.x > w || r.x + r.w < 0) return;
      const pad = leaf ? 1 : n.type === 'box' ? 0 : 5;
      shown.push({ n, r, leaf });
      html.push(`<div class="g t-${n.type}${leaf ? ' leaf' : ''}${n === over ? ' on' : ''}" style="left:${r.x - pad}px;top:${r.y - pad}px;width:${r.w + pad * 2}px;height:${r.h + pad * 2}px"></div>`);
    };
    for (const { node, level: l } of flat) if (l === level) add(node, false);
    if (units) for (const { node } of flat) if (node.type === 'unit') add(node, true);
    seen.innerHTML = html.join('');
  };
  const steps = () => {
    const max = Math.max(1, ...flat.map((f) => f.level));
    if (level > max) level = max;
    $('.steps').innerHTML = Array.from({ length: max }, (_, k) => `<button type="button" class="chip" data-level="${k + 1}" aria-pressed="${k + 1 === level}">${k + 1}</button>`).join('')
      + `<button type="button" class="chip u" data-units aria-pressed="${units}">Every single thing</button>`;
  };
  // a page is read once it has stopped changing: the same things in the same places on two looks, 600 ms apart
  const still = async () => {
    const win = frame.contentWindow, mark = (g) => g.units.map((u) => `${u.kind}${Math.round(u.x)},${Math.round(u.y)},${Math.round(u.w)},${Math.round(u.h)}`).join('|');
    let last = mark(read(win));
    for (let n = 0; n < 14; n++) { await new Promise((f) => setTimeout(f, 600)); const now = mark(read(win)); if (now === last) return true; last = now; }
    return false;
  };
  const again = async () => {
    const win = frame.contentWindow; if (!win?.document?.body) return;
    $('.tally').textContent = 'Waiting for the page to stop moving.';
    const settled = await still();
    got = read(win); tree = grow(got.units); flat = levels(tree); over = null;
    const count = (k) => got.units.filter((u) => u.kind === k).length;
    $('.tally').textContent = `${count('text')} blocks of text, ${count('picture')} pictures, ${count('box')} drawn boxes and ${count('line')} lines, read at ${win.innerWidth} wide.${settled ? '' : ' The page was still moving after 8 seconds, so it was read as it stood.'}`;
    steps(); draw();
  };
  const arrive = () => new Promise((done) => {
    const ready = set.ready ?? {};
    if (!ready.press && !ready.until) return setTimeout(done, 1200);
    let n = 0, pressed = false;
    const t = setInterval(() => {
      const doc = frame.contentDocument; if (!doc?.body) return;
      if (ready.press && !pressed) { const b = [...doc.querySelectorAll('a, button')].find((e) => e.textContent.trim() === ready.press); if (b) { b.click(); pressed = true; } }
      const e = ready.until && doc.querySelector(ready.until), r = e?.getBoundingClientRect();
      const there = r?.width ? e.contains(doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)) : false;
      if ((ready.until ? there : pressed) || ++n > 80) { clearInterval(t); setTimeout(done, 1500); }
    }, 150);
  });
  const use = (on) => { held = !!on; layer.classList.toggle('using', held); };
  const key = (e, down) => { if (e.code === 'Space') { e.preventDefault(); use(down); } };
  let wait = 0;
  const soon = () => { cancelAnimationFrame(wait); wait = requestAnimationFrame(draw); };

  frame.addEventListener('load', () => {
    const win = frame.contentWindow, doc = win?.document; if (!doc) return;
    doc.addEventListener('scroll', soon, { capture: true, passive: true });
    win.addEventListener('keydown', (e) => key(e, true)); win.addEventListener('keyup', (e) => key(e, false));
    arrive().then(again);
  });
  // the wheel turns whatever scrolls under the pointer: many sites scroll a box of their own, not the window
  layer.addEventListener('wheel', (e) => {
    e.preventDefault();
    const win = frame.contentWindow, doc = win?.document; if (!doc) return;
    const r = frame.getBoundingClientRect(), s = r.width / frame.offsetWidth;
    for (let t = doc.elementFromPoint((e.clientX - r.left) / s, (e.clientY - r.top) / s); t && t !== doc.documentElement; t = t.parentElement) {
      if (t.scrollHeight > t.clientHeight + 1 && /(auto|scroll)/.test(win.getComputedStyle(t).overflowY)) return t.scrollBy(e.deltaX, e.deltaY);
    }
    win.scrollBy(e.deltaX, e.deltaY);
  }, { passive: false });
  layer.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect(), x = (e.clientX - r.left) / scale, y = (e.clientY - r.top) / scale;
    // the smallest outlined part under the pointer
    const hit = shown.filter((s) => !s.leaf && x >= s.r.x && x <= s.r.x + s.r.w && y >= s.r.y && y <= s.r.y + s.r.h).sort((a, b) => a.r.w * a.r.h - b.r.w * b.r.h)[0]?.n ?? null;
    if (hit === over) return;
    over = hit;
    $('.now').innerHTML = over ? `<b>${NAME[over.type]}</b><span>${esc(HOW[over.type](over))}</span>` : '<b>Point at a part</b><span>to see why the engine took it as one thing.</span>';
    draw();
  });
  layer.addEventListener('pointerleave', () => { over = null; draw(); });
  $('.side').addEventListener('click', (e) => {
    const l = e.target.closest('[data-level]'), u = e.target.closest('[data-units]');
    if (l) level = Number(l.dataset.level); else if (u) units = !units; else return;
    steps(); draw();
  });
  $('.again').addEventListener('click', again);
  window.addEventListener('keydown', (e) => key(e, true)); window.addEventListener('keyup', (e) => key(e, false));
  window.addEventListener('blur', () => use(false));
  new ResizeObserver(() => { fit(); soon(); }).observe(view);
  fit();
  if (screen) frame.src = screen.path;
}
