// Prototype B, "thermal camera while held" (the second way plumber could show faults that live in time). Open the
// atoms page with ?proto=thermal.
//
//   warm     while a button is pressed, held or slid, plumber's engine judges what is drawn every tenth of a second,
//            and each fault it finds warms the part of the button it is on: the stretch of words that loses its
//            ground, or the part whose contrast fails. A fault that lasts glows hotter; one that passes cools off.
//   colour   butter where it is warm (a fault, briefly), coral where it is hot (a fault that stays), as plumber says
//            weakens and breaks everywhere else
//   after    letting go, the heat cools over about a second, and one line under the button names the hottest moment
//            and what was wrong then; nothing found says so in mint
import { Craft, Theme } from '../../../overlay/src/craft.js';
import '../../../overlay/src/tokens.css';
import './proto-thermal.css';

const JUDGE_EVERY = 100; // ms between plumber's verdicts
const TAIL = 1100; // ms still judged after letting go: the release and the done state
const CELL = 3; // CSS px per heat cell
const GLOW = 10; // CSS px the heat may glow past the button's edge
const COOL = 0.93; // heat kept per frame: a fault that stops is gone in about half a second
// only what you can see go wrong on the button: words losing their ground, contrast, words colliding, a target too
// small. A note about focus or headings has no place on the button's face.
const SEEN = /words-on-layers|contrast|text-collision|hit-target/;
const WEIGHT = (rule) => (/words-on-layers/.test(rule) ? 3 : /contrast|text-collision|hit-target/.test(rule) ? 2 : 1);

const craft = new Craft({ now: true, theme: new Theme({ decisions: () => [] }) });
let cam = null;

function judge(stage) {
  const S = stage.getBoundingClientRect();
  const els = [stage, ...stage.querySelectorAll('*')].filter((e) => !e.closest('.thermal') && (({ width, height }) => width > 0 && height > 0)(e.getBoundingClientRect()));
  return craft.enrich(els.map((el, i) => ({ id: i, el, marks: [], dims: {}, file: 'atom', line: 1, column: 1 })))
    .flatMap((i) => { const r = i.el.getBoundingClientRect(); return i.marks.filter((m) => SEEN.test(m.rule)).map((m) => ({
      rule: m.rule, says: m.title ?? m.what ?? '', share: m.craft?.evidence?.share ?? null,
      // where on the button it is: the failing stretch of words if plumber names one, else the part itself
      rects: (m.craft?.evidence?.spans?.length ? m.craft.evidence.spans : [[r.left, r.top, r.width, r.height]]).map(([x, y, w, h]) => [x - S.left, y - S.top, w, h]) })); });
}

// the hues, read from plumber's own tokens
function hues() {
  const probe = document.createElement('i'); probe.className = 'pl-light'; probe.style.display = 'none'; document.body.append(probe);
  const cs = getComputedStyle(probe), c = document.createElement('canvas').getContext('2d');
  const rgb = (name, fallback) => { c.fillStyle = fallback; c.fillStyle = cs.getPropertyValue(name).trim() || fallback; const h = c.fillStyle; return h.startsWith('#') ? [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) : h.match(/\d+/g).slice(0, 3).map(Number); };
  const out = { coral: rgb('--pl-coral', '#bf3a1e'), butter: rgb('--pl-butter', '#f2c94c') };
  probe.remove(); return out;
}

function start(stage) {
  stop(true);
  stage.closest('.atom')?.querySelector('.thermal-note')?.remove();
  const canvas = document.createElement('canvas'); canvas.className = 'thermal'; canvas.setAttribute('aria-hidden', 'true');
  stage.appendChild(canvas);
  cam = { stage, canvas, ctx: canvas.getContext('2d'), t0: performance.now(), up: null, lastJudge: -Infinity, hot: null, found: 0, size: null, heat: null, hue: hues() };
  const tick = () => {
    if (!cam || cam.stage !== stage) return;
    const t = performance.now() - cam.t0;
    fit();
    if ((cam.up == null || t - cam.up < TAIL) && t - cam.lastJudge >= JUDGE_EVERY) { cam.lastJudge = t; warm(judge(stage), t); }
    for (let i = 0; i < cam.heat.length; i++) cam.heat[i] *= COOL;
    draw();
    // after letting go and the tail, wait for the last warmth to fade, then say what it saw
    if (cam.up != null && t - cam.up > TAIL && !cam.heat.some((h) => h > 0.02)) return finish();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// the heat grid covers the button and a glow's width around it; a button that changes size starts a fresh grid
function fit() {
  const r = cam.stage.getBoundingClientRect(), w = Math.ceil((r.width + 2 * GLOW) / CELL), h = Math.ceil((r.height + 2 * GLOW) / CELL);
  if (cam.size && cam.size[0] === w && cam.size[1] === h) return;
  cam.size = [w, h]; cam.heat = new Float32Array(w * h);
  cam.canvas.width = w; cam.canvas.height = h;
  Object.assign(cam.canvas.style, { left: `${-GLOW}px`, top: `${-GLOW}px`, width: `${w * CELL}px`, height: `${h * CELL}px` });
}

function warm(findings, t) {
  const [W, H] = cam.size;
  let score = 0;
  for (const f of findings) {
    const add = 0.25 * WEIGHT(f.rule); score += WEIGHT(f.rule) * 100 + (f.share ?? 0);
    for (const [x, y, w, h] of f.rects) {
      const x0 = Math.max(0, Math.floor((x + GLOW) / CELL)), x1 = Math.min(W, Math.ceil((x + w + GLOW) / CELL));
      const y0 = Math.max(0, Math.floor((y + GLOW) / CELL)), y1 = Math.min(H, Math.ceil((y + h + GLOW) / CELL));
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const i = yy * W + xx; cam.heat[i] = Math.min(1.5, cam.heat[i] + add); }
    }
  }
  cam.found += findings.length;
  // the hottest moment: the most serious finding, then how much of the words it takes (as prototype A ranks them)
  const top = findings.slice().sort((a, b) => WEIGHT(b.rule) * 100 + (b.share ?? 0) - (WEIGHT(a.rule) * 100 + (a.share ?? 0)))[0];
  if (top && (!cam.hot || score > cam.hot.score)) cam.hot = { t, score, says: top.says, phase: phase(t), more: findings.length - 1 };
}
const phase = (t) => (cam.up == null ? (t < 150 ? 'as you pressed' : 'while you held it') : t - cam.up < 500 ? 'just after you let go' : 'once it was done');

function draw() {
  const { ctx, heat, size: [W, H], hue: { butter, coral } } = cam;
  const img = ctx.createImageData(W, H), d = img.data;
  for (let i = 0; i < heat.length; i++) {
    const h = Math.min(1, heat[i]); if (h < 0.02) continue;
    // warm is butter, hot is coral: the mix moves from one to the other as the heat rises
    const k = Math.min(1, Math.max(0, (h - 0.25) / 0.6));
    d[i * 4] = butter[0] + (coral[0] - butter[0]) * k; d[i * 4 + 1] = butter[1] + (coral[1] - butter[1]) * k; d[i * 4 + 2] = butter[2] + (coral[2] - butter[2]) * k;
    d[i * 4 + 3] = 255 * Math.min(0.78, h * 0.9);
  }
  ctx.putImageData(img, 0, 0);
}

function finish() {
  const c = cam; stop();
  const note = document.createElement('p'); note.className = 'thermal-note pl-light';
  note.innerHTML = c.hot
    ? `<b>Hottest ${c.hot.phase}, at ${(c.hot.t / 1000).toFixed(1)} s:</b> ${c.hot.says}${c.hot.more > 0 ? ` <span>+${c.hot.more} more then</span>` : ''}`
    : '<b class="ok">Cool the whole way:</b> plumber found nothing wrong while you used it.';
  c.stage.insertAdjacentElement('afterend', note);
  requestAnimationFrame(() => note.classList.add('open'));
}

function stop(clearNote) { if (!cam) return; cam.canvas.remove(); if (clearNote) cam.stage.closest('.atom')?.querySelector('.thermal-note')?.remove(); cam = null; }

addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  const stage = e.target.closest('[data-atom]');
  if (stage) start(stage);
}, { capture: true });
const letGo = () => { if (cam && cam.up == null) cam.up = performance.now() - cam.t0; };
addEventListener('pointerup', letGo, { capture: true });
addEventListener('pointercancel', letGo, { capture: true });
