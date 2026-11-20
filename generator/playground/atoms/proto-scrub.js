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
const WEIGHT = (rule) => (/words-on-layers/.test(rule) ? 3 : /contrast|text-collision|hit-target/.test(rule) ? 2 : 1);
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
    if (w.length) { const share = Math.max(0, ...w.map((f) => f.share ?? 0));
      if (cur) { cur.to = next; cur.share = Math.max(cur.share, share); } else lost.push(cur = { from: v.t, to: next, share }); }
    else cur = null;
  });
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
  const held = up, answerOk = L.first != null && L.first <= ANSWER_LIMIT, settleOk = L.settle <= SETTLE_LIMIT, lostMs = L.lost.reduce((a, x) => a + x.to - x.from, 0);
  // the press and the let-go, and the scrub head, run through every lane's row (not over the words above it)
  const marks = r.events.map((e) => `<i class="scrub-event" style="left:${pct(e.t)}"></i>`).join('') + '<b class="scrub-head"></b>';
  const lane = (name, say, ok, body) => `
    <div class="lane"><p class="lane-head"><b>${name}</b> <span class="${ok == null ? '' : ok ? 'ok' : 'bad'}">${say}</span></p><div class="lane-body">${body}${marks}</div></div>`;
  const ms = (x) => (x < 1000 ? `${Math.round(x)} ms` : s1(x));
  const el = document.createElement('div');
  el.className = 'scrub pl-light';
  el.innerHTML = `
    <div class="scrub-track" role="slider" tabindex="0" aria-label="Scrub the recorded gesture" aria-valuemin="0" aria-valuemax="${Math.round(end)}">
      ${lane('Your hand', held > 250 ? `held for ${s1(held)}` : 'one press', null,
        `<i class="seg hand" style="left:0;width:${pct(up)}"></i>`)}
      ${lane('Its answer', L.first == null ? 'nothing changed' : `first answers in ${ms(L.first)} <i>(feels instant under 100 ms)</i>`, answerOk,
        `<i class="seg limit" style="left:0;width:${pct(ANSWER_LIMIT)}"></i>${L.first != null ? `<i class="tick ${answerOk ? 'ok' : 'bad'}" style="left:${pct(L.first)}"></i>` : ''}`)}
      ${lane('Its movement', L.settle ? `${L.stillMoving ? 'still moving' : 'moves for'} ${ms(L.settle)} after you let go <i>(a control: under 500 ms)</i>` : 'still as soon as you let go', settleOk,
        `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path class="motion" d="${motion}"/></svg>
         <i class="seg limit" style="left:${pct(up)};width:calc(${pct(up + SETTLE_LIMIT)} - ${pct(up)})"></i>
         ${!settleOk ? `<i class="seg over" style="left:${pct(up + SETTLE_LIMIT)};width:calc(${pct(up + L.settle)} - ${pct(up + SETTLE_LIMIT)})"></i>` : ''}`)}
      ${lane('Its words', L.lost.length ? `unreadable for ${s1(lostMs)}${L.lost.some((x) => x.share) ? `, up to ${Math.round(Math.max(...L.lost.map((x) => x.share)) * (Math.max(...L.lost.map((x) => x.share)) <= 1 ? 100 : 1))}% of them` : ''}` : 'readable the whole way', !L.lost.length,
        `<i class="seg read" style="left:0;width:100%"></i>${L.lost.map((x) => `<i class="seg lost" style="left:${pct(x.from)};width:calc(${pct(x.to)} - ${pct(x.from)})"></i>`).join('')}
         ${L.says.map((s) => `<i class="say-tick" style="left:${pct(s.t)}"></i>`).join('')}`)}
      <div class="scrub-when">${up / end < 0.14 ? `<span style="left:0">pressed, let go</span>` : `<span style="left:0">pressed</span><span class="end" style="left:${pct(up)}">let go</span>`}</div>
    </div>
    <div class="scrub-note"><p></p><button type="button" class="scrub-live">Live <kbd>Esc</kbd></button></div>`;
  r.stage.insertAdjacentElement('afterend', el); // directly under the button it is about
  const paint = document.createElement('div'); paint.className = 'scrub-paint';
  r.stage.appendChild(paint);
  scrub = { r, L, el, paint, end, touched: new Set() };
  const track = el.querySelector('.scrub-track');
  const at = (clientX) => { const b = track.querySelector('.lane-body').getBoundingClientRect(); return Math.max(0, Math.min(1, (clientX - b.left) / b.width)) * end; };
  track.addEventListener('pointerdown', (e) => { track.setPointerCapture(e.pointerId); show(at(e.clientX)); });
  track.addEventListener('pointermove', (e) => { if (e.buttons & 1) show(at(e.clientX)); });
  track.addEventListener('keydown', (e) => { const step = e.shiftKey ? 200 : 33; if (e.key === 'ArrowRight') { show(scrub.t + step); e.preventDefault(); } if (e.key === 'ArrowLeft') { show(scrub.t - step); e.preventDefault(); } if (e.key === 'Home') show(0); if (e.key === 'End') show(end); });
  el.querySelector('.scrub-live').addEventListener('click', release);
  // the worst moment: the most serious finding first (words losing their ground outrank a shadow's tint), then
  // within a rule, how much of the words it takes (a trail over 57% beats a thumb over 4%)
  const rank = (v) => [Math.max(0, ...v.findings.map((f) => WEIGHT(f.rule) * 100 + (f.share ?? 0))), v.findings.length];
  const worstV = r.verdicts.reduce((a, v) => { const [w, n] = rank(v), [aw, an] = rank(a); return w > aw || (w === aw && n > an) ? v : a; }, r.verdicts[0]);
  requestAnimationFrame(() => { el.classList.add('open'); show(L.lost[0] ? (L.lost[0].from + L.lost[0].to) / 2 : worstV?.findings.length ? worstV.t : end); });
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
  const v = [...r.verdicts].reverse().find((x) => x.t <= t + 1) ?? r.verdicts[0];
  const top = (v?.findings ?? []).slice().sort((a, b) => WEIGHT(b.rule) * 100 + (b.share ?? 0) - (WEIGHT(a.rule) * 100 + (a.share ?? 0)));
  // one loud thing: only the main finding is painted on the button
  paint.innerHTML = top.slice(0, 1).map((fd) => fd.spans.length
    ? fd.spans.map(([x, y, w, h]) => `<i class="scrub-fail" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"></i>`).join('')
    : `<i class="scrub-box" style="left:${fd.box[0]}px;top:${fd.box[1]}px;width:${fd.box[2]}px;height:${fd.box[3]}px"></i>`).join('');
  el.querySelectorAll('.scrub-head').forEach((h) => { h.style.left = `${(t / end) * 100}%`; });
  el.querySelector('.scrub-track').setAttribute('aria-valuenow', String(Math.round(t)));
  const phase = r.up == null || t < r.up ? (t < 120 ? 'as you press' : 'while you hold') : t - r.up > 600 ? 'done' : 'just after you let go';
  const said = [...L.says].reverse().find((s) => s.t <= t + 1)?.text;
  el.querySelector('.scrub-note p').innerHTML = `<b>${s1(t)}, ${phase}.</b>${said ? ` It says “${said}”.` : ' Its words can’t be read.'} `
    + (top.length ? `${top[0].says}${top.length > 1 ? ` <span>+${top.length - 1} more</span>` : ''}` : '<span class="ok">Plumber finds nothing wrong here.</span>');
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
