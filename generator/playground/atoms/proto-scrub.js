// Prototype A, "scrub the button's past" (one of three ways plumber could show faults that live in time: motion,
// micro-interactions, states). Open the atoms page with ?proto=scrub.
//
//   record   pressing a button starts a recording of it: every frame, what each of its parts looks like (transform,
//            opacity, clip, size, colours), and every tenth of a second plumber's engine judges what is drawn then
//   strip    letting go, a strip unfurls under the button: how much plumber finds wrong over time, in coral, with the
//            moments you pressed and let go marked; it opens parked at the worst moment
//   scrub    dragging along the strip (or the arrow keys) freezes the real button in its pose at that moment, the
//            fault painted on it (for words that lose their ground, the stretch of words that fails), one plain line
//            under the strip saying what is wrong; Esc or Live hands the button back
import { Craft, Theme } from '../../../overlay/src/craft.js';
import '../../../overlay/src/tokens.css';
import './proto-scrub.css';

const PROPS = ['transform', 'opacity', 'clip-path', 'width', 'height', 'background-color', 'color', 'visibility', 'filter', 'translate', 'scale'];
const JUDGE_EVERY = 100; // ms between plumber's verdicts while recording
const TAIL = 1100; // ms recorded after letting go: the release and the done state
const NOISE = /^experience\/font|sibling-match|^html\/|landmark|heading/;
const WEIGHT = (rule) => (/words-on-layers/.test(rule) ? 3 : /contrast|text-collision|hit-target/.test(rule) ? 2 : 1);

let rec = null, scrub = null;
const craft = new Craft({ now: true, theme: new Theme({ decisions: () => [] }) });

// ── recording ──────────────────────────────────────────────────────────────────────────────────────────────────
function judge(stage) {
  const S = stage.getBoundingClientRect();
  const els = [stage, ...stage.querySelectorAll('*')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  const out = craft.enrich(els.map((el, i) => ({ id: i, el, marks: [], dims: {}, file: 'atom', line: 1, column: 1 })));
  return out.flatMap((i) => { const r = i.el.getBoundingClientRect(); return i.marks.filter((m) => !NOISE.test(m.rule)).map((m) => ({
    rule: m.rule, says: m.title ?? m.what ?? '', why: m.because ?? '',
    box: [r.left - S.left, r.top - S.top, r.width, r.height],
    share: m.craft?.evidence?.share ?? null,
    spans: (m.craft?.evidence?.spans ?? []).map(([x, y, w, h]) => [x - S.left, y - S.top, w, h]) })); });
}
function sample(stage) {
  const parts = [];
  for (const el of stage.querySelectorAll('*')) { const cs = getComputedStyle(el); parts.push([el, PROPS.map((p) => cs.getPropertyValue(p))]); }
  return parts;
}
function start(stage) {
  release();
  rec = { stage, t0: performance.now(), frames: [], verdicts: [], events: [{ t: 0, name: 'pressed' }], up: null, lastJudge: -Infinity };
  const tick = () => {
    if (!rec || rec.stage !== stage) return;
    const t = performance.now() - rec.t0;
    rec.frames.push({ t, parts: sample(stage) });
    if (t - rec.lastJudge >= JUDGE_EVERY) { rec.lastJudge = t; rec.verdicts.push({ t, findings: judge(stage) }); }
    if (rec.up != null && t - rec.up > TAIL) return finish();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
function letGo() { if (rec && rec.up == null) { rec.up = performance.now() - rec.t0; rec.events.push({ t: rec.up, name: 'let go' }); } }

// ── the strip ──────────────────────────────────────────────────────────────────────────────────────────────────
function finish() {
  const r = rec; rec = null;
  if (!r || r.frames.length < 4) return;
  const section = r.stage.closest('.atom') ?? r.stage.parentElement;
  section.querySelector('.scrub')?.remove();
  const end = r.frames.at(-1).t;
  const sev = r.verdicts.map((v) => ({ t: v.t, n: v.findings.reduce((a, f) => a + WEIGHT(f.rule), 0) }));
  const max = Math.max(1, ...sev.map((s) => s.n));
  const W = 1000, H = 40, x = (t) => (t / end) * W, y = (n) => H - 4 - (n / max) * (H - 10);
  const area = `M0 ${H} ${sev.map((s) => `L${x(s.t).toFixed(1)} ${y(s.n).toFixed(1)}`).join(' ')} L${W} ${y(sev.at(-1)?.n ?? 0).toFixed(1)} L${W} ${H} Z`;
  const el = document.createElement('div');
  el.className = 'scrub pl-light';
  el.innerHTML = `
    <div class="scrub-track" role="slider" tabindex="0" aria-label="Scrub the recorded gesture" aria-valuemin="0" aria-valuemax="${Math.round(end)}">
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path class="scrub-sev" d="${area}"/><line class="scrub-base" x1="0" x2="${W}" y1="${H - 1}" y2="${H - 1}"/></svg>
      ${r.events.map((e, i, all) => { const near = i > 0 && (e.t - all[i - 1].t) / end < 0.12; return `<i class="scrub-event${near ? ' low' : ''}" style="left:${(e.t / end) * 100}%"><span>${e.name}</span></i>`; }).join('')}
      <b class="scrub-head"></b>
    </div>
    <div class="scrub-note"><p></p><button type="button" class="scrub-live">Live <kbd>Esc</kbd></button></div>`;
  r.stage.insertAdjacentElement('afterend', el); // directly under the button it is about
  const paint = document.createElement('div'); paint.className = 'scrub-paint';
  r.stage.appendChild(paint);
  scrub = { r, el, paint, end, touched: new Set() };
  const track = el.querySelector('.scrub-track');
  const at = (clientX) => { const b = track.getBoundingClientRect(); return Math.max(0, Math.min(1, (clientX - b.left) / b.width)) * end; };
  track.addEventListener('pointerdown', (e) => { track.setPointerCapture(e.pointerId); show(at(e.clientX)); });
  track.addEventListener('pointermove', (e) => { if (e.buttons & 1) show(at(e.clientX)); });
  track.addEventListener('keydown', (e) => { const step = e.shiftKey ? 200 : 33; if (e.key === 'ArrowRight') { show(scrub.t + step); e.preventDefault(); } if (e.key === 'ArrowLeft') { show(scrub.t - step); e.preventDefault(); } if (e.key === 'Home') show(0); if (e.key === 'End') show(end); });
  el.querySelector('.scrub-live').addEventListener('click', release);
  // it opens on the worst moment: the answer before the first touch
  // the worst moment: the most serious finding first (words losing their ground outrank a shadow's tint), then how many
  // within a rule, how much of the words it takes (a trail over 57% beats a thumb over 4%)
  const rank = (v) => [Math.max(0, ...v.findings.map((f) => WEIGHT(f.rule) * 100 + (f.share ?? 0))), v.findings.length];
  const worstV = r.verdicts.reduce((a, v) => { const [w, n] = rank(v), [aw, an] = rank(a); return w > aw || (w === aw && n > an) ? v : a; }, r.verdicts[0]);
  const worst = { t: worstV?.t ?? end, n: worstV?.findings.length ? 1 : 0 };
  requestAnimationFrame(() => { el.classList.add('open'); show(worst.n > 0 ? worst.t : end); });
}

// freeze the real button in its pose at time t, the fault painted on it, the strip's head and note following
function show(t) {
  if (!scrub) return;
  const { r, el, paint, end } = scrub;
  t = Math.max(0, Math.min(end, t)); scrub.t = t;
  const f = r.frames.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a));
  for (const [node, values] of f.parts) {
    if (!node.isConnected) continue;
    PROPS.forEach((p, i) => node.style.setProperty(p, values[i], 'important'));
    scrub.touched.add(node);
  }
  const v = [...r.verdicts].reverse().find((x) => x.t <= t + 1) ?? r.verdicts[0];
  const top = (v?.findings ?? []).slice().sort((a, b) => WEIGHT(b.rule) * 100 + (b.share ?? 0) - (WEIGHT(a.rule) * 100 + (a.share ?? 0)));
  // one loud thing: only the main finding is painted on the button; the rest are counted in the note
  paint.innerHTML = top.slice(0, 1).map((fd) => fd.spans.length
    ? fd.spans.map(([x, y, w, h]) => `<i class="scrub-fail" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"></i>`).join('')
    : `<i class="scrub-box" style="left:${fd.box[0]}px;top:${fd.box[1]}px;width:${fd.box[2]}px;height:${fd.box[3]}px"></i>`).join('');
  el.querySelector('.scrub-head').style.left = `${(t / end) * 100}%`;
  el.querySelector('.scrub-track').setAttribute('aria-valuenow', String(Math.round(t)));
  const when = r.events.filter((e) => e.t <= t).at(-1)?.name ?? 'pressed';
  const phase = when === 'let go' ? (t - r.up > 600 ? 'done' : 'just let go') : t < 120 ? 'pressed' : 'held';
  el.querySelector('.scrub-note p').innerHTML = top.length
    ? `<b>${(t / 1000).toFixed(2)}s, ${phase}:</b> ${top[0].says}${top.length > 1 ? ` <span>+${top.length - 1} more</span>` : ''}`
    : `<b>${(t / 1000).toFixed(2)}s, ${phase}:</b> <span class="ok">plumber finds nothing wrong here</span>`;
}

// hand the button back
function release() {
  if (!scrub) return;
  for (const node of scrub.touched) for (const p of PROPS) node.style.removeProperty(p);
  scrub.paint.remove(); scrub.el.remove(); scrub = null;
}

addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || e.target.closest('.scrub')) return;
  const stage = e.target.closest('[data-atom]');
  if (stage) start(stage); else release();
}, { capture: true });
addEventListener('pointerup', letGo, { capture: true });
addEventListener('pointercancel', letGo, { capture: true });
addEventListener('keydown', (e) => { if (e.key === 'Escape') release(); });
