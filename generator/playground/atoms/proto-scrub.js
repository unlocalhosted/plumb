// Prototype A, "scrub the button's past" (one of three ways plumber could show faults that live in time: motion,
// micro-interactions, states). Open the atoms page with ?proto=scrub.
//
//   record   pressing a button starts a recording of it: every frame, what each of its parts looks like (transform,
//            opacity, clip, size, colours) and what it says, and every tenth of a second plumber judges what is drawn
//   story    letting go, the story of the gesture unfurls under the button, as lanes on one time line, each read
//            against its standard: your hand (pressed, held, let go); its answer (how soon anything changed, against
//            Nielsen's 0.1 s); its movement (how long it moves after you let go, against Material's 0.5 s); its words
//            (when they stay readable, when the fill takes them). It opens parked at the worst moment
//   scrub    dragging along the lanes (or the arrow keys) freezes the real button in its pose at that moment, the
//            fault painted on it, one plain line saying what it says and what is wrong then; Esc or Live hands it back
import { Craft, Theme } from '../../../overlay/src/craft.js';
import '../../../overlay/src/tokens.css';
import './proto-scrub.css';

const PROPS = ['transform', 'opacity', 'clip-path', 'width', 'height', 'background-color', 'color', 'visibility', 'filter', 'translate', 'scale'];
const JUDGE_EVERY = 100; // ms between plumber's verdicts while recording
const TAIL = 1100; // ms recorded after letting go: the release and the done state
// the standards each lane is read against (generator/data/standards.mjs, checked against their pages)
const ANSWER_LIMIT = 100; // Nielsen: 0.1 s feels instantaneous
const SETTLE_LIMIT = 500; // Material 3: its longest suggested transition
const WORDS = /words-on-layers|contrast/;
const NOISE = /^experience\/font|sibling-match|^html\/|landmark|heading/;
const s1 = (ms) => `${(ms / 1000).toFixed(1)} s`;

let rec = null, scrub = null;
const craft = new Craft({ now: true, theme: new Theme({ decisions: () => [] }) });

// ── recording ──────────────────────────────────────────────────────────────────────────────────────────────────
function judge(stage) {
  const S = stage.getBoundingClientRect();
  const els = [stage, ...stage.querySelectorAll('*')].filter((e) => !e.closest('.scrub-paint') && (({ width, height }) => width > 0 && height > 0)(e.getBoundingClientRect()));
  const out = craft.enrich(els.map((el, i) => ({ id: i, el, marks: [], dims: {}, file: 'atom', line: 1, column: 1 })));
  return out.flatMap((i) => { const r = i.el.getBoundingClientRect(); return i.marks.filter((m) => !NOISE.test(m.rule)).map((m) => ({
    rule: m.rule, says: m.title ?? m.what ?? '', why: m.because ?? '',
    box: [r.left - S.left, r.top - S.top, r.width, r.height],
    share: m.craft?.evidence?.share ?? null,
    spans: (m.craft?.evidence?.spans ?? []).map(([x, y, w, h]) => [x - S.left, y - S.top, w, h]) })); });
}
function sample(stage) {
  // each part: how it looks (to freeze it later) and where it sits in the button (a part sliding along counts as moving,
  // as it does for the judge)
  const parts = [], S = stage.getBoundingClientRect();
  for (const el of stage.querySelectorAll('*')) { const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    parts.push([el, PROPS.map((p) => cs.getPropertyValue(p)), `${Math.round(r.x - S.x)},${Math.round(r.y - S.y)},${Math.round(r.width)},${Math.round(r.height)}`]); }
  return parts;
}
// the words a person can read on it now: text whose parents are all visible enough to read
function saying(stage) {
  const out = new Set(), w = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) {
    const t = n.textContent.trim(); if (!t) continue;
    let o = 1; for (let e = n.parentElement; e && e !== stage.parentElement; e = e.parentElement) { const cs = getComputedStyle(e); o *= +cs.opacity; if (cs.visibility === 'hidden' || cs.display === 'none') o = 0; }
    if (o > 0.5 && n.parentElement.getBoundingClientRect().width > 0) out.add(t); // a library's measuring copy says it twice
  }
  return [...out].join(' ');
}
// how many of the button's parts look different from the frame before
const changed = (a, b) => a.parts.reduce((n, [, v, box], i) => n + (b.parts[i] && (box !== b.parts[i][2] || v.some((x, j) => x !== b.parts[i][1][j])) ? 1 : 0), 0);

function start(stage) {
  release();
  // the pose before the page answers (this listener runs before the button's own), and plumber's verdict on it, so the
  // first frame that differs is the answer and judging never delays it
  rec = { stage, t0: performance.now(), frames: [], verdicts: [], events: [{ t: 0, name: 'pressed' }], up: null, lastJudge: 0 };
  rec.frames.push({ t: 0, parts: sample(stage), says: saying(stage) }); rec.verdicts.push({ t: 0, findings: rest.get(stage) ?? [] });
  const tick = () => {
    if (!rec || rec.stage !== stage) return;
    const t = performance.now() - rec.t0;
    rec.frames.push({ t, parts: sample(stage), says: saying(stage) });
    if (t - rec.lastJudge >= JUDGE_EVERY) { rec.lastJudge = t; rec.verdicts.push({ t, findings: judge(stage) }); }
    if (rec.up != null && t - rec.up > TAIL) return finish();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
function letGo() { if (rec && rec.up == null) { rec.up = performance.now() - rec.t0; rec.events.push({ t: rec.up, name: 'let go' }); } }

// ── reading the recording: what each lane says ──────────────────────────────────────────────────────────────────
function read(r) {
  const end = r.frames.at(-1).t, up = r.up ?? end;
  // movement: per frame, how many parts changed since the frame before
  const moves = r.frames.map((f, i) => ({ t: f.t, n: i ? changed(f, r.frames[i - 1]) : 0 }));
  const first = moves.find((m) => m.n > 0)?.t ?? null;
  const lastMove = [...moves].reverse().find((m) => m.n > 0)?.t ?? null;
  const settle = lastMove != null && lastMove > up ? lastMove - up : 0;
  const stillMoving = lastMove != null && end - lastMove < 50 && settle > 0;
  // the words: the stretches where plumber finds them unreadable, and how much of them is lost
  const lost = []; let cur = null;
  r.verdicts.forEach((v, i) => {
    const w = v.findings.filter((f) => WORDS.test(f.rule)), next = r.verdicts[i + 1]?.t ?? end;
    // a layer passing under the words (a fill, a trail) is one cause; the words fading on their own ground is another
    if (w.length) { const share = Math.max(0, ...w.map((f) => f.share ?? 0)), layer = w.some((f) => /words-on-layers/.test(f.rule));
      if (cur) { cur.to = next; cur.share = Math.max(cur.share, share); cur.layer ||= layer; } else lost.push(cur = { from: v.t, to: next, share, layer }); }
    else cur = null;
  });
  // a flicker shorter than a tenth and a half of a second is gone before anyone could read the words anyway
  for (let i = lost.length - 1; i >= 0; i--) if (lost[i].to - lost[i].from < 150) lost.splice(i, 1);
  // what it says along the way: each new set of words, from when it first shows
  const says = []; for (const f of r.frames) if (f.says && f.says !== says.at(-1)?.text) says.push({ t: f.t, text: f.says });
  return { end, up, moves, first, settle, stillMoving, lost, says };
}

// ── the story ──────────────────────────────────────────────────────────────────────────────────────────────────
function finish() {
  const r = rec; rec = null;
  if (!r || r.frames.length < 4) return;
  const section = r.stage.closest('.atom') ?? r.stage.parentElement;
  section.querySelector('.scrub')?.remove();
  const L = read(r), { end, up } = L, pct = (t) => `${(Math.max(0, Math.min(end, t)) / end) * 100}%`;
  // movement drawn in 60 steps, each the most that moved in it, so a drag's frame-to-frame flicker reads as one motion
  const W = 1000, H = 22, BINS = 60, bins = new Array(BINS).fill(0);
  for (const m of L.moves) { const i = Math.min(BINS - 1, Math.floor((m.t / end) * BINS)); bins[i] = Math.max(bins[i], m.n); }
  const maxN = Math.max(1, ...bins), bw = W / BINS;
  const motion = `M0 ${H} ${bins.map((n, i) => { const y = (H - 2 - (n / maxN) * (H - 5)).toFixed(1); return `L${(i * bw).toFixed(1)} ${y} L${((i + 1) * bw).toFixed(1)} ${y}`; }).join(' ')} L${W} ${H} Z`;
  const answerOk = L.first != null && L.first <= ANSWER_LIMIT, settleOk = L.settle <= SETTLE_LIMIT, lostMs = L.lost.reduce((a, x) => a + x.to - x.from, 0);
  const ms = (x) => (x < 1000 ? `${Math.round(x)} ms` : s1(x));
  const most = Math.max(0, ...L.lost.map((x) => x.share)), mostPct = Math.round(most <= 1 ? most * 100 : most);
  // the press and the let-go, and the scrub head, run through every lane's row (not over the words above it)
  const marks = r.events.map((e) => `<i class="scrub-event" style="left:${pct(e.t)}"></i>`).join('') + '<b class="scrub-head"></b>';
  // only what is wrong gets a lane: the problem in plain words, when it happened, and the fix
  const lane = (problem, body, fix) => `
    <div class="lane"><p class="lane-head">${problem}</p><div class="lane-body">${body}${marks}</div><p class="lane-fix"><b>Fix</b> ${fix}</p></div>`;
  const lanes = [];
  if (L.lost.length) lanes.push(lane(`Its words can’t be read for ${s1(lostMs)}${mostPct ? `, ${mostPct}% at worst` : ''}`,
    `${L.lost.map((x) => `<i class="seg lost" style="left:${pct(x.from)};width:calc(${pct(x.to)} - ${pct(x.from)})"></i>`).join('')}`,
    L.lost.some((x) => x.layer)
      ? 'Redraw the words in the fill’s text colour and clip them to the fill with <code>clip-path</code>.'
      : 'Keep the words at full <code>opacity</code>; swap them at once.'));
  if (!settleOk) lanes.push(lane(`It ${L.stillMoving ? 'is still moving' : 'keeps moving'} ${ms(L.settle)} after you let go`,
    `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path class="motion" d="${motion}"/></svg>
     <i class="seg over" style="left:${pct(up + SETTLE_LIMIT)};width:calc(${pct(up + L.settle)} - ${pct(up + SETTLE_LIMIT)})"></i>`,
    `Settle in about 300 ms; drop the motion under <code>prefers-reduced-motion</code>.`));
  if (!answerOk) lanes.push(lane(L.first == null ? 'Nothing changes when you press it' : `It takes ${ms(L.first)} to answer the press`,
    `<i class="seg over" style="left:${pct(ANSWER_LIMIT)};width:calc(${pct(L.first ?? end)} - ${pct(ANSWER_LIMIT)})"></i>`,
    'Answer on <code>:active</code>: sink it onto its lip, or start the fill.'));
  const el = document.createElement('div');
  el.className = 'scrub pl-light';
  el.innerHTML = lanes.length ? `
    <div class="scrub-track" role="slider" tabindex="0" aria-label="Scrub the recorded gesture" aria-valuemin="0" aria-valuemax="${Math.round(end)}">
      ${lanes.join('')}
      <div class="scrub-when">${up / end < 0.25 ? `<span style="left:0">pressed, let go</span>` : `<span style="left:0">pressed</span><span class="end" style="left:${pct(up)}">let go</span>`}</div>
    </div>
    <div class="scrub-note"><p></p><button type="button" class="scrub-live">Live <kbd>Esc</kbd></button></div>`
    : '<p class="scrub-clean">Nothing wrong in this gesture.</p>';
  r.stage.insertAdjacentElement('afterend', el); // directly under the button it is about
  if (!lanes.length) { requestAnimationFrame(() => el.classList.add('open')); return; }
  const paint = document.createElement('div'); paint.className = 'scrub-paint';
  r.stage.appendChild(paint);
  scrub = { r, L, el, paint, end, touched: new Set() };
  const track = el.querySelector('.scrub-track');
  const at = (clientX) => { const b = track.querySelector('.lane-body').getBoundingClientRect(); return Math.max(0, Math.min(1, (clientX - b.left) / b.width)) * end; };
  track.addEventListener('pointerdown', (e) => { track.setPointerCapture(e.pointerId); show(at(e.clientX)); });
  track.addEventListener('pointermove', (e) => { if (e.buttons & 1) show(at(e.clientX)); });
  track.addEventListener('keydown', (e) => { const step = e.shiftKey ? 200 : 33; if (e.key === 'ArrowRight') { show(scrub.t + step); e.preventDefault(); } if (e.key === 'ArrowLeft') { show(scrub.t - step); e.preventDefault(); } if (e.key === 'Home') show(0); if (e.key === 'End') show(end); });
  el.querySelector('.scrub-live').addEventListener('click', release);
  // it opens on the first problem the lanes show: the words lost, else the movement past its limit, else the late answer
  const opening = L.lost[0] ? (L.lost[0].from + L.lost[0].to) / 2 : !settleOk ? up + (SETTLE_LIMIT + L.settle) / 2 : !answerOk ? (ANSWER_LIMIT + (L.first ?? end)) / 2 : 0;
  requestAnimationFrame(() => { el.classList.add('open'); show(opening); });
}

// freeze the real button in its pose at time t, the fault painted on it, the head and the note following
function show(t) {
  if (!scrub) return;
  const { r, L, el, paint, end } = scrub;
  t = Math.max(0, Math.min(end, t)); scrub.t = t;
  const f = r.frames.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a));
  for (const [node, values] of f.parts) {
    if (!node.isConnected) continue;
    PROPS.forEach((p, i) => node.style.setProperty(p, values[i], 'important'));
    scrub.touched.add(node);
  }
  // paint the words fault on the frozen button, if the words are lost at this moment
  const v = [...r.verdicts].reverse().find((x) => x.t <= t + 1) ?? r.verdicts[0];
  // only inside a stretch the words lane shows: a flicker it left out is not painted or named either
  const inLost = L.lost.some((x) => t >= x.from - 1 && t <= x.to);
  const words = inLost ? (v?.findings ?? []).filter((x) => WORDS.test(x.rule)).sort((a, b) => (b.share ?? 0) - (a.share ?? 0))[0] : null;
  paint.innerHTML = !words ? '' : words.spans.length
    ? words.spans.map(([x, y, w, h]) => `<i class="scrub-fail" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"></i>`).join('')
    : `<i class="scrub-box" style="left:${words.box[0]}px;top:${words.box[1]}px;width:${words.box[2]}px;height:${words.box[3]}px"></i>`;
  el.querySelectorAll('.scrub-head').forEach((h) => { h.style.left = `${(t / end) * 100}%`; });
  el.querySelector('.scrub-track').setAttribute('aria-valuenow', String(Math.round(t)));
  const phase = r.up == null || t < r.up ? (t < 120 ? 'pressing' : 'held') : t - r.up > 600 ? 'done' : 'just let go';
  const wrong = [words && 'words lost', r.up != null && t > r.up + SETTLE_LIMIT && t <= r.up + L.settle && 'still moving', L.first != null && L.first > ANSWER_LIMIT && t > ANSWER_LIMIT && t < L.first && 'no answer yet'].filter(Boolean);
  el.querySelector('.scrub-note p').innerHTML = `<b>${s1(t)}, ${phase}</b> · ${wrong.length ? `<span class="bad">${wrong.join(', ')}</span>` : 'fine here'}`;
}

// hand the button back
function release() {
  if (!scrub) return;
  for (const node of scrub.touched) for (const p of PROPS) node.style.removeProperty(p);
  scrub.paint.remove(); scrub.el.remove(); scrub = null;
}

// plumber's verdict on the button as the pointer arrives, so the press itself is never held up by judging; and one
// judgement at load, so the engine's first, slower run happens before anyone presses anything
const rest = new WeakMap();
addEventListener('pointerover', (e) => { const stage = e.target.closest?.('[data-atom]'); if (stage && !rec && !rest.has(stage)) rest.set(stage, judge(stage)); }, { capture: true });
addEventListener('pointerout', (e) => { const stage = e.target.closest?.('[data-atom]'); if (stage && !stage.contains(e.relatedTarget)) rest.delete(stage); }, { capture: true });
setTimeout(() => { const s = document.querySelector('[data-atom]'); if (s) judge(s); }, 1500);

addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || e.target.closest('.scrub')) return;
  const stage = e.target.closest('[data-atom]');
  if (stage) start(stage); else release();
}, { capture: true });
addEventListener('pointerup', letGo, { capture: true });
addEventListener('pointercancel', letGo, { capture: true });
addEventListener('keydown', (e) => { if (e.key === 'Escape') release(); });
