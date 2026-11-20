// Prototype C, "state dial" (the third way plumber could show faults that live in time). Open the atoms page with
// ?proto=dial.
//
//   dial     under every button, a knob with five stops: at rest, pointed at, pressed, mid-gesture, done. Each stop's
//            pip is mint when plumber finds nothing wrong in that state and coral when it does, so the whole life of
//            the button reads at a glance
//   learn    at rest is caught as the page settles, pointed at when the pointer rests on the button before its first
//            press (after it, the button may be showing a later state, as press-then-confirm does); the other three
//            are caught the first time you use it (press, hold or slide it through). Until then their pips are empty
//   turn     turning the knob (drag it, press a pip, or the arrow keys) shows the button frozen in that state, the
//            main fault painted on it, and one line saying what plumber finds there; Esc or using the button hands it back
import { Craft, Theme } from '../../../overlay/src/craft.js';
import '../../../overlay/src/tokens.css';
import './proto-dial.css';

const STATES = [['rest', 'At rest'], ['hover', 'Pointed at'], ['pressed', 'Pressed'], ['mid', 'Mid-gesture'], ['done', 'Done']];
const PROPS = ['transform', 'opacity', 'clip-path', 'width', 'height', 'background-color', 'color', 'border-color', 'box-shadow', 'visibility', 'filter', 'translate', 'scale'];
const SAMPLE_EVERY = 100; // ms between snapshots while the button is in use
const TAIL = 1300; // ms after letting go until it counts as done
// what decides a state: what you can see go wrong on the button's face (as prototype B). A shadow's tint or a note
// about focus is the same in every state, so it would paint every pip coral and tell the states apart by nothing.
const SEEN = /words-on-layers|contrast|text-collision|hit-target/;
const WEIGHT = (rule) => (/words-on-layers/.test(rule) ? 3 : /contrast|text-collision|hit-target/.test(rule) ? 2 : 1);
const ARC = 240, A0 = -120; // the knob turns through 240°, from -120° (at rest) to +120° (done)
const angle = (i) => A0 + (ARC * i) / (STATES.length - 1);

const craft = new Craft({ now: true, theme: new Theme({ decisions: () => [] }) });
const dials = new Map(); // stage → dial
let use = null; // the button being used: { dial, t0, up, samples }

// ── a snapshot: what plumber finds in the button now, and a still copy of it to show later ──────────────────────
function snap(stage) {
  const S = stage.getBoundingClientRect();
  const live = [...stage.children].filter((c) => !c.classList.contains('dial-still') && !c.classList.contains('dial-paint'));
  const els = [stage, ...live.flatMap((c) => [c, ...c.querySelectorAll('*')])].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  const findings = craft.enrich(els.map((el, i) => ({ id: i, el, marks: [], dims: {}, file: 'atom', line: 1, column: 1 })))
    .flatMap((i) => { const r = i.el.getBoundingClientRect(); return i.marks.filter((m) => SEEN.test(m.rule)).map((m) => ({
      rule: m.rule, says: m.title ?? m.what ?? '', share: m.craft?.evidence?.share ?? null,
      rects: (m.craft?.evidence?.spans?.length ? m.craft.evidence.spans : [[r.left, r.top, r.width, r.height]]).map(([x, y, w, h]) => [x - S.left, y - S.top, w, h]) })); })
    .sort((a, b) => WEIGHT(b.rule) * 100 + (b.share ?? 0) - (WEIGHT(a.rule) * 100 + (a.share ?? 0)));
  // the still: the button's parts copied with how they look this instant written onto them
  const still = document.createElement('div'); still.className = 'dial-still';
  for (const c of live) {
    const copy = c.cloneNode(true), from = [c, ...c.querySelectorAll('*')], to = [copy, ...copy.querySelectorAll('*')];
    from.forEach((el, i) => { const cs = getComputedStyle(el); for (const p of PROPS) to[i].style.setProperty(p, cs.getPropertyValue(p), 'important'); to[i].style.setProperty('transition', 'none', 'important'); to[i].style.setProperty('animation', 'none', 'important'); });
    to.forEach((el) => { el.removeAttribute('id'); el.setAttribute('tabindex', '-1'); });
    still.append(copy);
  }
  return { findings, still, size: [S.width, S.height] };
}

// ── the dial ───────────────────────────────────────────────────────────────────────────────────────────────────
function mount(stage) {
  if (dials.has(stage)) return;
  const el = document.createElement('div'); el.className = 'dial pl-light';
  el.innerHTML = `
    <div class="dial-knob-wrap">
      ${STATES.map(([id, name], i) => { const a = (angle(i) - 90) * Math.PI / 180;
        return `<button type="button" class="dial-pip empty" data-i="${i}" style="left:${50 + 44 * Math.cos(a)}%;top:${50 + 44 * Math.sin(a)}%" aria-label="${name}"><span>${name}</span></button>`; }).join('')}
      <div class="dial-knob" role="slider" tabindex="0" aria-label="Button state" aria-valuemin="0" aria-valuemax="${STATES.length - 1}" aria-valuenow="0" aria-valuetext="At rest"><i></i></div>
    </div>
    <div class="dial-read"><p class="dial-state">At rest</p><p class="dial-says"></p></div>`;
  stage.insertAdjacentElement('afterend', el);
  const d = { stage, el, snaps: new Array(STATES.length).fill(null), at: null };
  dials.set(stage, d);
  const knob = el.querySelector('.dial-knob');
  el.querySelectorAll('.dial-pip').forEach((p) => p.addEventListener('click', () => turn(d, +p.dataset.i)));
  // drag the knob round: the stop nearest the pointer's angle
  const toStop = (e) => { const b = knob.getBoundingClientRect(), deg = Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2)) * 180 / Math.PI + 90;
    const a = ((deg + 540) % 360) - 180; return Math.round(Math.max(0, Math.min(1, (a - A0) / ARC)) * (STATES.length - 1)); };
  knob.addEventListener('pointerdown', (e) => { knob.setPointerCapture(e.pointerId); turn(d, toStop(e)); });
  knob.addEventListener('pointermove', (e) => { if (e.buttons & 1) turn(d, toStop(e)); });
  knob.addEventListener('keydown', (e) => {
    const i = d.at ?? 0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { turn(d, Math.min(STATES.length - 1, i + 1)); e.preventDefault(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { turn(d, Math.max(0, i - 1)); e.preventDefault(); }
    if (e.key === 'Home') turn(d, 0); if (e.key === 'End') turn(d, STATES.length - 1);
  });
  // at rest, as the page settles
  setTimeout(() => keep(d, 0, snap(stage)), 400);
  // pointed at: when the pointer has rested on the button long enough for its hover to finish
  let hoverT = null;
  stage.addEventListener('pointerenter', () => { clearTimeout(hoverT); hoverT = setTimeout(() => { if (!use && d.at == null && !d.snaps[2]) keep(d, 1, snap(stage)); }, 220); });
  stage.addEventListener('pointerleave', () => clearTimeout(hoverT));
  read(d);
}

function keep(d, i, s) { d.snaps[i] = s; const pip = d.el.querySelectorAll('.dial-pip')[i];
  pip.classList.remove('empty'); pip.classList.toggle('bad', s.findings.length > 0); pip.classList.toggle('good', !s.findings.length);
  if (d.at === i) turn(d, i); else if (d.at == null) read(d); }

// show the button frozen in state i, the main fault painted on it
function turn(d, i) {
  free(d, true);
  d.at = i;
  d.el.querySelector('.dial-knob').style.setProperty('--turn', `${angle(i)}deg`);
  d.el.querySelectorAll('.dial-pip').forEach((p, j) => p.classList.toggle('on', j === i));
  const s = d.snaps[i];
  if (s) {
    d.stage.classList.add('dialing');
    const still = s.still.cloneNode(true); d.stage.append(still);
    const paint = document.createElement('div'); paint.className = 'dial-paint pl-light';
    paint.innerHTML = (s.findings[0]?.rects ?? []).map(([x, y, w, h]) => `<i style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"></i>`).join('');
    d.stage.append(paint);
  }
  read(d);
}

// the words beside the knob: the state, and what plumber finds in it
function read(d) {
  const i = d.at ?? 0, s = d.snaps[i], knob = d.el.querySelector('.dial-knob');
  knob.setAttribute('aria-valuenow', String(i)); knob.setAttribute('aria-valuetext', STATES[i][1]);
  d.el.querySelector('.dial-state').textContent = d.at == null ? 'Live' : STATES[i][1];
  const says = d.el.querySelector('.dial-says');
  if (d.at == null) { const caught = d.snaps.filter(Boolean), bad = caught.filter((x) => x.findings.length).length;
    says.innerHTML = caught.length < STATES.length ? `Use the button once to fill the dial (${caught.length} of ${STATES.length} states caught).`
      : bad ? `<b class="bad">Wrong in ${bad} of ${STATES.length} states.</b> Turn the knob to see each.` : '<b class="ok">Right in every state.</b>'; return; }
  says.innerHTML = !s ? 'Not caught yet: use the button once and plumber reads this state.'
    : s.findings.length ? `${s.findings[0].says}${s.findings.length > 1 ? ` <span>+${s.findings.length - 1} more</span>` : ''}`
      : '<b class="ok">Plumber finds nothing wrong here.</b>';
}

// hand the button back
function free(d, keepAt) {
  d.stage.classList.remove('dialing');
  d.stage.querySelectorAll(':scope > .dial-still, :scope > .dial-paint').forEach((x) => x.remove());
  if (!keepAt) { d.at = null; d.el.querySelector('.dial-knob').style.setProperty('--turn', `${A0}deg`); d.el.querySelectorAll('.dial-pip').forEach((p) => p.classList.remove('on')); read(d); }
}

// ── using the button: snapshots every tenth of a second, sorted into pressed, mid-gesture and done ──────────────
function begin(d) {
  free(d);
  use = { d, t0: performance.now(), up: null, samples: [], last: -Infinity };
  const tick = () => {
    if (!use || use.d !== d) return;
    const t = performance.now() - use.t0;
    if (t - use.last >= SAMPLE_EVERY) { use.last = t; use.samples.push({ t, ...snap(d.stage) }); }
    if (use.up != null && t - use.up >= TAIL) { use.samples.push({ t, ...snap(d.stage) }); return end(); }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
function end() {
  const { d, up, samples } = use; use = null;
  const near = (t) => samples.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a));
  // pressed is just after the press; mid-gesture is halfway through a hold or a slide, or, for a single press, the
  // moment it answers (its wait, its question) between letting go and done
  keep(d, 2, near(90));
  keep(d, 3, up > 300 ? near(up / 2) : near(up + 350));
  keep(d, 4, samples.at(-1));
  read(d);
}

addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || e.target.closest('.dial')) return;
  const stage = e.target.closest('[data-atom]'); const d = stage && dials.get(stage);
  if (d) begin(d);
}, { capture: true });
const letGo = () => { if (use && use.up == null) use.up = performance.now() - use.t0; };
addEventListener('pointerup', letGo, { capture: true });
addEventListener('pointercancel', letGo, { capture: true });
addEventListener('keydown', (e) => { if (e.key === 'Escape') for (const d of dials.values()) free(d); });

// a dial under every button, as each one is drawn
const find = () => document.querySelectorAll('[data-atom]').forEach((s) => s.childElementCount && mount(s));
new MutationObserver(find).observe(document.body, { childList: true, subtree: true });
find();
