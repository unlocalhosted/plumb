// What went wrong in a gesture, and how to fix it: part of the atoms page, under any form you use.
//
//   record     pressing a button starts a recording of it: every frame, what each of its parts looks like and where it
//              sits, and every tenth of a second plumber judges what is drawn and keeps a still of the button
//   filmstrip  letting go, a strip of those stills opens under the button. A still where something is wrong has a coral
//              edge, and the words fault is hatched on it. Under the strip, each kind of fault is one line: what, then
//              the fix. Each is read against its standard: words lost for 150 ms or more, a first answer over Nielsen's
//              0.1 s, movement past Material's 500 ms after you let go. Nothing wrong is one mint line
//   freeze     choosing a still freezes the real button in that pose; Esc or Live hands it back
import { GESTURE_CSS } from './gesture-css.js';

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
// plumber's craft engine, handed in by the page (the atoms page imports it; the plumber site loads it built, since its
// bundler can't take the engine's own source)
let craft = null;

// ── recording ──────────────────────────────────────────────────────────────────────────────────────────────────
function judge(stage) {
  if (!craft) return [];
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
// a still of the button: the stage copied (its skin's variables come with it) and every part with how it looks this
// instant written onto it, so it holds the pose with no motion of its own
const LOOK = [...PROPS, 'border-radius', 'box-shadow', 'background-image', 'font-family', 'font-size', 'font-weight', 'letter-spacing', 'line-height'];
function still(stage) {
  const frame = stage.cloneNode(false); frame.removeAttribute('data-atom'); frame.className = 'still-stage';
  for (const c of stage.children) {
    if (c.classList.contains('scrub-paint')) continue;
    const copy = c.cloneNode(true), from = [c, ...c.querySelectorAll('*')], to = [copy, ...copy.querySelectorAll('*')];
    from.forEach((el, i) => { const cs = getComputedStyle(el); for (const p of LOOK) to[i].style.setProperty(p, cs.getPropertyValue(p), 'important'); to[i].style.setProperty('transition', 'none', 'important'); to[i].style.setProperty('animation', 'none', 'important'); });
    to.forEach((el) => { el.removeAttribute('id'); el.setAttribute('tabindex', '-1'); el.setAttribute('aria-hidden', 'true'); });
    frame.append(copy);
  }
  return frame;
}
// how many of the button's parts look different from the frame before
const changed = (a, b) => a.parts.reduce((n, [, v, box], i) => n + (b.parts[i] && (box !== b.parts[i][2] || v.some((x, j) => x !== b.parts[i][1][j])) ? 1 : 0), 0);

function start(stage, e) {
  release();
  // the pose before the page answers (this listener runs before the button's own), and plumber's verdict on it, so the
  // first frame that differs is the answer and judging never delays it
  const S0 = stage.getBoundingClientRect();
  rec = { stage, t0: performance.now(), frames: [], verdicts: [], events: [{ t: 0, name: 'pressed' }], up: null, lastJudge: 0, path: [{ t: 0, x: e.clientX - S0.left, y: e.clientY - S0.top }] };
  rec.frames.push({ t: 0, parts: sample(stage), says: saying(stage) }); rec.verdicts.push({ t: 0, findings: rest.get(stage) ?? [], still: still(stage) });
  const tick = () => {
    if (!rec || rec.stage !== stage) return;
    const t = performance.now() - rec.t0;
    rec.frames.push({ t, parts: sample(stage), says: saying(stage) });
    if (t - rec.lastJudge >= JUDGE_EVERY) { rec.lastJudge = t; rec.verdicts.push({ t, findings: judge(stage), still: still(stage) }); }
    if (rec.up != null && t - rec.up > TAIL) return finish();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
function letGo(e) {
  if (!rec || rec.up != null) return;
  rec.up = performance.now() - rec.t0; rec.events.push({ t: rec.up, name: 'let go' });
  const S = rec.stage.getBoundingClientRect(); rec.path.push({ t: rec.up, x: e.clientX - S.left, y: e.clientY - S.top, up: true });
  if (rec.stage.dataset.fix === 'on') quicken(rec.stage);
}
// the hand's path while it is down, so the same gesture can be made again with a fix on
addEventListener('pointermove', (e) => { if (!rec || rec.up != null) return; const S = rec.stage.getBoundingClientRect(); rec.path.push({ t: performance.now() - rec.t0, x: e.clientX - S.left, y: e.clientY - S.top }); }, { capture: true });

// ── the fix, previewed on the real button ─────────────────────────────────────────────────────────────────────
// Moving too long after you let go: every motion the button starts from the let-go on is played faster, so it ends
// within FIX_SETTLE. It runs on the page's own animations (CSS transitions, keyframes, the Web Animations API), so it is
// the same motion, only quicker; a motion a script drives frame by frame can't be reached this way.
const FIX_SETTLE = 300;
function quicken(stage) {
  const until = performance.now() + 900;
  const step = () => {
    for (const a of stage.getAnimations({ subtree: true })) {
      const t = a.effect?.getComputedTiming?.(); if (!t || !Number.isFinite(t.endTime) || a.playState !== 'running') continue;
      const left = (t.endTime - (t.localTime ?? 0)) / (a.playbackRate || 1);
      if (left > FIX_SETTLE && !a.quickened) { a.updatePlaybackRate((a.playbackRate || 1) * left / FIX_SETTLE); a.quickened = true; }
    }
    if (performance.now() < until) requestAnimationFrame(step);
  };
  setTimeout(step, 0); // after the button's own let-go has started its motion
}
// the same gesture again, made on the real button: the press, the path, the let-go, at the times they happened
const last = new WeakMap();
function replay(stage) {
  const g = last.get(stage); if (!g) return;
  const root = stage.getRootNode(), S = stage.getBoundingClientRect();
  const at = (p) => ({ clientX: S.left + p.x, clientY: S.top + p.y });
  const target = (p) => { const { clientX, clientY } = at(p); const el = root.elementFromPoint(clientX, clientY); return el && stage.contains(el) ? el : stage.firstElementChild; };
  const send = (type, p, el) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, composed: true, cancelable: true, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, ...at(p) }));
  const first = g[0], el = target(first);
  send('pointerdown', first, el);
  for (const p of g.slice(1)) setTimeout(() => send(p.up ? 'pointerup' : 'pointermove', p, p.up ? target(p) : el), p.t);
}

// ── reading the recording ──────────────────────────────────────────────────────────────────────────────────────
function read(r) {
  const end = r.frames.at(-1).t, up = r.up ?? end;
  const moves = r.frames.map((f, i) => ({ t: f.t, n: i ? changed(f, r.frames[i - 1]) : 0 }));
  const first = moves.find((m) => m.n > 0)?.t ?? null;
  const lastMove = [...moves].reverse().find((m) => m.n > 0)?.t ?? null;
  const settle = lastMove != null && lastMove > up ? lastMove - up : 0;
  // the words: the stretches where plumber finds them unreadable; a flicker under 150 ms is gone before anyone could
  // read them anyway
  const lost = []; let cur = null;
  r.verdicts.forEach((v, i) => {
    const w = v.findings.filter((f) => WORDS.test(f.rule)), next = r.verdicts[i + 1]?.t ?? end;
    if (w.length) { const share = Math.max(0, ...w.map((f) => f.share ?? 0)), layer = w.some((f) => /words-on-layers/.test(f.rule));
      if (cur) { cur.to = next; cur.share = Math.max(cur.share, share); cur.layer ||= layer; } else lost.push(cur = { from: v.t, to: next, share, layer }); }
    else cur = null;
  });
  for (let i = lost.length - 1; i >= 0; i--) if (lost[i].to - lost[i].from < 150) lost.splice(i, 1);
  return { end, up, first, settle, lost };
}
// what is wrong at moment t
function wrongAt(r, L, t) {
  return { words: L.lost.some((x) => t >= x.from - 1 && t <= x.to), // stills come every tenth of a second, so a short overrun is shown on the still nearest it
    moving: r.up != null && L.settle > SETTLE_LIMIT && t > r.up + SETTLE_LIMIT - JUDGE_EVERY / 2 && t <= r.up + L.settle + JUDGE_EVERY / 2,
    waiting: L.first != null && L.first > ANSWER_LIMIT && t > ANSWER_LIMIT && t < L.first };
}

// ── the filmstrip ──────────────────────────────────────────────────────────────────────────────────────────────
const COLS = 3, SHOWN = 9;
function finish() {
  const r = rec; rec = null;
  if (!r || r.frames.length < 4) return;
  const section = r.stage.closest('.atom') ?? r.stage.parentElement;
  section.querySelector('.scrub')?.remove();
  last.set(r.stage, r.path);
  const L = read(r), { end, up } = L, ms = (x) => (x < 1000 ? `${Math.round(x)} ms` : s1(x));
  const faults = [];
  const most = Math.max(0, ...L.lost.map((x) => x.share)), mostPct = Math.round(most <= 1 ? most * 100 : most);
  if (L.lost.length) faults.push([`Words lost for ${s1(L.lost.reduce((a, x) => a + x.to - x.from, 0))}${mostPct ? `, ${mostPct}% at worst` : ''}`,
    L.lost.some((x) => x.layer) ? 'redraw them in the fill’s colour, clipped to it with <code>clip-path</code>' : 'keep them at full <code>opacity</code>; swap them at once']);
  if (L.settle > SETTLE_LIMIT) faults.push([`Moves ${ms(L.settle)} after you let go`, 'settle in about 300 ms, and not at all under <code>prefers-reduced-motion</code>', 'quicken']);
  if (L.first == null || L.first > ANSWER_LIMIT) faults.push([L.first == null ? 'No answer to the press' : `Answers the press after ${ms(L.first)}`, 'answer on <code>:active</code>: sink it, or start the fill']);
  const el = document.createElement('div');
  el.className = 'scrub pl-light';
  // the fix, on the button: a switch between the button as it is and with the fix, which makes your gesture again
  const fixOn = r.stage.dataset.fix === 'on', canFix = fixOn || faults.some((f) => f[2]);
  const toggle = canFix ? `<div class="fix-switch" role="radiogroup" aria-label="The fix"><button type="button" role="radio" data-fix="off" aria-checked="${!fixOn}">As it is</button><button type="button" role="radio" data-fix="on" aria-checked="${fixOn}">With the fix</button></div>` : '';
  const wire = () => el.querySelectorAll('.fix-switch button').forEach((btn) => btn.addEventListener('click', () => {
    if ((r.stage.dataset.fix === 'on') === (btn.dataset.fix === 'on')) return;
    r.stage.dataset.fix = btn.dataset.fix; replay(r.stage); }));
  // with nothing wrong, one mint line; with the fix on, its filmstrip too, to set beside the one before
  if (!faults.length && !fixOn) {
    el.innerHTML = '<p class="scrub-clean">Nothing wrong in this gesture.</p>';
    r.stage.insertAdjacentElement('afterend', el); wire(); requestAnimationFrame(() => el.classList.add('open')); return;
  }
  // the stills: evenly through the gesture, with the middle of every fault among them
  const want = Array.from({ length: SHOWN }, (_, i) => (i * end) / (SHOWN - 1));
  const must = [...L.lost.map((x) => (x.from + x.to) / 2), L.settle > SETTLE_LIMIT ? up + (SETTLE_LIMIT + L.settle) / 2 : null].filter((x) => x != null);
  for (const m of must) { let k = 0; want.forEach((w, i) => { if (Math.abs(w - m) < Math.abs(want[k] - m)) k = i; }); if (!must.includes(want[k]) || want[k] === m) want[k] = m; }
  const near = (t) => r.verdicts.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a));
  const picks = [...new Set(want.sort((a, b) => a - b).map(near))];
  // each still shows the button only: the box its parts take, with a little room
  const S = r.stage.getBoundingClientRect();
  const box = [...r.stage.children].filter((c) => !c.classList.contains('scrub-paint')).reduce((b, c) => { const q = c.getBoundingClientRect(); return [Math.min(b[0], q.left - S.left), Math.min(b[1], q.top - S.top), Math.max(b[2], q.right - S.left), Math.max(b[3], q.bottom - S.top)]; }, [Infinity, Infinity, -Infinity, -Infinity]);
  const pad = 6, cx = box[0] - pad, cy = box[1] - pad, cw = box[2] - box[0] + 2 * pad, ch = box[3] - box[1] + 2 * pad;
  el.innerHTML = `<div class="strip" role="listbox" aria-label="The gesture, frame by frame"></div>
    ${faults.length ? `<ul class="faults">${faults.map(([what, fix]) => `<li><b>${what}</b> → ${fix}</li>`).join('')}</ul>` : '<p class="scrub-clean">Nothing wrong with the fix: it settles in time.</p>'}
    <div class="scrub-foot">${toggle}<button type="button" class="scrub-live">Live <kbd>Esc</kbd></button></div>`;
  const strip = el.querySelector('.strip');
  strip.style.setProperty('--cols', COLS);
  r.stage.insertAdjacentElement('afterend', el);
  const fw = (strip.getBoundingClientRect().width - (COLS - 1) * 6) / COLS, k = fw / cw;
  for (const v of picks) {
    const w = wrongAt(r, L, v.t), bad = w.words || w.moving || w.waiting;
    const f = document.createElement('button'); f.type = 'button'; f.className = `still${bad ? ' bad' : ''}`; f.setAttribute('role', 'option');
    f.innerHTML = `<span class="still-view" style="height:${ch * k}px"></span><span class="still-t">${s1(v.t)}${bad ? ` · ${w.words ? 'words' : w.moving ? 'moving' : 'no answer'}` : ''}</span>`;
    const view = f.querySelector('.still-view'), frame = v.still.cloneNode(true);
    Object.assign(frame.style, { width: `${S.width}px`, height: `${S.height}px`, transform: `scale(${k}) translate(${-cx}px, ${-cy}px)` });
    view.append(frame);
    if (w.words) { const fd = v.findings.filter((x) => WORDS.test(x.rule)).sort((a, b) => (b.share ?? 0) - (a.share ?? 0))[0];
      const hatch = document.createElement('span'); hatch.className = 'still-paint'; hatch.style.transform = `scale(${k}) translate(${-cx}px, ${-cy}px)`;
      hatch.innerHTML = (fd?.spans.length ? fd.spans : fd ? [fd.box] : []).map(([x, y, ww, hh]) => `<i style="left:${x}px;top:${y}px;width:${ww}px;height:${hh}px"></i>`).join('');
      view.append(hatch); }
    f.addEventListener('click', () => show(v.t));
    strip.append(f);
  }
  const paint = document.createElement('div'); paint.className = 'scrub-paint';
  r.stage.appendChild(paint);
  scrub = { r, L, el, paint, end, touched: new Set(), picks };
  el.querySelector('.scrub-live').addEventListener('click', unfreeze); wire();
  el.addEventListener('keydown', (e) => { const i = picks.findIndex((v) => v.t === scrub?.t); if (e.key === 'ArrowRight' && picks[i + 1]) { show(picks[i + 1].t); e.preventDefault(); } if (e.key === 'ArrowLeft' && i > 0) { show(picks[i - 1].t); e.preventDefault(); } });
  const firstBad = picks.find((v) => { const w = wrongAt(r, L, v.t); return w.words || w.moving || w.waiting; });
  requestAnimationFrame(() => { el.classList.add('open'); if (firstBad) show(firstBad.t); }); // nothing wrong: the button stays live
}

// freeze the real button in its pose at time t, the words fault painted on it, its still marked as chosen
function show(t) {
  if (!scrub) return;
  const { r, L, el, paint, picks } = scrub;
  scrub.t = t;
  const f = r.frames.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a));
  for (const [node, values] of f.parts) {
    if (!node.isConnected) continue;
    PROPS.forEach((p, i) => node.style.setProperty(p, values[i], 'important'));
    scrub.touched.add(node);
  }
  const v = picks.find((x) => x.t === t) ?? r.verdicts.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a));
  const words = wrongAt(r, L, t).words ? v.findings.filter((x) => WORDS.test(x.rule)).sort((a, b) => (b.share ?? 0) - (a.share ?? 0))[0] : null;
  paint.innerHTML = !words ? '' : (words.spans.length ? words.spans : [words.box]).map(([x, y, w, h]) => `<i class="scrub-fail" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"></i>`).join('');
  el.querySelectorAll('.still').forEach((s, i) => { const on = picks[i].t === t; s.classList.toggle('on', on); s.setAttribute('aria-selected', String(on)); });
}

// hand the button back: Live or Esc unfreezes it and keeps the strip; a new press clears the strip too
function unfreeze() {
  if (!scrub) return;
  for (const node of scrub.touched) for (const p of PROPS) node.style.removeProperty(p);
  scrub.touched.clear(); scrub.paint.innerHTML = ''; scrub.t = null;
  scrub.el.querySelectorAll('.still').forEach((s) => { s.classList.remove('on'); s.setAttribute('aria-selected', 'false'); });
}
function release() {
  if (!scrub) return;
  unfreeze(); scrub.paint.remove(); scrub.el.remove(); scrub = null;
}

// plumber's verdict on the button as the pointer arrives, so the press itself is never held up by judging; and one
// judgement at load, so the engine's first, slower run happens before anyone presses anything
const rest = new WeakMap();
// the stage an event is on, inside a shadow root too (the plumber site draws its design pages in one)
const stageOf = (e) => e.composedPath().find((n) => n instanceof Element && n.matches('[data-atom]')) ?? null;
const inStrip = (e) => e.composedPath().some((n) => n instanceof Element && n.classList.contains('scrub'));
addEventListener('pointerover', (e) => { const stage = stageOf(e); if (stage && !rec && !rest.has(stage)) rest.set(stage, judge(stage)); }, { capture: true });
addEventListener('pointerout', (e) => { const stage = stageOf(e); if (stage && !stage.contains(e.relatedTarget)) rest.delete(stage); }, { capture: true });

// watch the stages in a page or a shadow root: its look goes in once, and plumber's first, slower judgement is made
// before anyone presses anything
const watched = new WeakSet();
export function watchGestures(root, { Craft, Theme }) {
  craft ??= new Craft({ now: true, theme: new Theme({ decisions: () => [] }) });
  if (watched.has(root)) return; watched.add(root);
  const style = document.createElement('style'); style.textContent = GESTURE_CSS;
  (root instanceof Document ? root.head : root).append(style);
  setTimeout(() => { const s = root.querySelector('[data-atom]'); if (s) judge(s); }, 1500);
}

addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || inStrip(e)) return;
  const stage = stageOf(e);
  if (stage) start(stage, e);
}, { capture: true });
addEventListener('pointerup', letGo, { capture: true });
addEventListener('pointercancel', letGo, { capture: true });
addEventListener('keydown', (e) => { if (e.key === 'Escape') unfreeze(); });
