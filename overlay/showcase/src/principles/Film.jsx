// The film: a principle told in four acts (craft-rule skill §3⅝; docs/craft/stage-brief.md, storyboard v2), built
// from the owner's reference (maybepratikk's bold-on-hover tabs). A screen opts in with `Example.film`; the stage plays
// the film once on arrival and again on Replay, then the example is the viewer's.
//
// THE FILM (ms; act lengths follow the number of instances)
//      0   ACT 1 · IT HAPPENS   the broken side at rest size, nothing drawn; a drawn pointer plays the gesture over
//                               each instance in turn (move 300, hold 600 each)
//          camera in            to the set the fault moves through (1000)
//          ACT 2 · MEASURE IT   every instance's own outline (coral, dashed); the gesture repeats on the lead instance
//                               three times: the subject's pill (before → after) and a pill + hairline at every place
//                               the effect lands, on with the gesture and gone with it; on the third, the cause in one
//                               sentence under the subject; then the marks fade
//          ACT 3 · HOW THE FIX WORKS   the pointer presses the switch; outlines turn mint; the screen's mechanism is
//                               drawn, held, and folds away, with its own pill
//          ACT 4 · PAYOFF       the same gesture on every instance (move 250, hold 450 each): the same pills, mint,
//                               reading the fixed value
//          out                  marks fade (300), camera out (900), rest; the switch and the example are the viewer's
//
// What a screen supplies (Example.film):
//   instances(root) → elements, in order          set(el, on) → plays the gesture's state on one instance
//   frame(root) → the elements the camera frames      lead → which instance act 2 repeats on
//   read(root, i, rest) → { subject: { box, text }, effects: [{ x, y, h, text }], value }   (example-local px)
//   cause(read) → one sentence                      mechanism → { Draw({ boxes, t, k }), pill }   say → the hint after
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PlumbLayer, Switch } from './Principle.jsx';

const TIMING = {
  lead:      700,   // the stage settles before the pointer moves
  move1:     300,   // act 1: the pointer travels to an instance
  hold1:     600,   // act 1: the gesture held on it
  camera:   1000,   // camera in, and out (900)
  outlines:  400,   // act 2: outlines grow before the first gesture
  on2:      1100,   // act 2: each repetition, gesture held with its marks
  off2:      500,   // act 2: gesture released, marks gone
  cause:    1900,   // act 2: the third repetition holds this long with the cause said
  fade:      300,   // marks fade
  toSwitch:  650,   // act 3: the pointer travels to the switch
  press:     160,   // act 3: the press
  turn:      450,   // act 3: outlines coral → mint
  mech:     2200,   // act 3: the mechanism drawn and held
  fold:      500,   // act 3: the mechanism folds away
  move4:     250,   // act 4: travel to each instance
  hold4:     550,   // act 4: held with the mint pills
  rest4:     500,   // act 4: a beat on the last before the marks go
  out:       900,   // camera out
};
const CAMERA = {
  max:   1.8,                                      // never closer
  fill:  0.92,                                     // the framed set fills this much of the card's width
  at:    0.38,                                     // its centre sits this far down the card's box
  curve: 'cubic-bezier(0.7, 0, 0.3, 1)',           // slow start, slow finish (as measured on the references)
  clipX: 200,                                      // px the zoomed card may run past its rest box sideways (the stage is open)
  clipY: 24,                                       // and up and down (the switch is 40px under it)
};
const MARK = { pill: 20, gap: 12 };                // px on screen, at any zoom

const sleep = (ms, live) => new Promise((ok, no) => { const t = setTimeout(() => (live.on ? ok() : no(new Error('cut'))), ms); live.timers.push(t); });
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// a box in the example's own pixels, whatever the camera does to it
export function local(root) {
  const o = root.getBoundingClientRect(), k = o.width / root.offsetWidth || 1;
  return (el) => { const r = el.getBoundingClientRect(); return { x: (r.left - o.left) / k, y: (r.top - o.top) / k, w: r.width / k, h: r.height / k }; };
}

const hue = (off) => (off ? 'var(--pl-off)' : 'var(--pl-on)');
function Pill({ x, y, k, off, children, below }) {
  return (
    <span style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%, ${below ? '0' : '-100%'}) scale(${1 / k})`, transformOrigin: below ? '50% 0' : '50% 100%',
      display: 'flex', alignItems: 'center', height: MARK.pill, padding: '0 8px', borderRadius: 'var(--pl-radius-tag)', whiteSpace: 'nowrap',
      font: '500 11px/1 var(--pl-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--pl-on-accent)', background: hue(off),
      boxShadow: '0 0 0 1px var(--pl-halo)', transition: 'background-color 400ms ease', animation: 'film-pop 320ms var(--pl-spring-pop) both' }}>{children}</span>
  );
}

export function Film({ Example, names, onSaid }) {
  const spec = Example.film;
  const [side, setSide] = useState('broken');
  const [act, setAct] = useState('rest');          // rest · play
  const [cam, setCam] = useState({ k: 1, x: 0, y: 0 });
  const [marks, setMarks] = useState(null);        // { off, outlines, read, cause, mech, t }
  const [ptr, setPtr] = useState(null);            // { x, y, down } in the film's own box
  const [run, setRun] = useState(0);
  const box = useRef(null), camRef = useRef(null), sw = useRef(null);
  const example = () => camRef.current?.querySelector('[data-film-root]') ?? camRef.current?.firstElementChild;

  // the pointer goes to an element's centre, in the film's own box (the camera already applied)
  const toward = (el, dy = 0) => { const o = box.current.getBoundingClientRect(), r = el.getBoundingClientRect(); return { x: r.left - o.left + r.width / 2, y: r.top - o.top + r.height / 2 + dy }; };

  useEffect(() => {
    if (still()) { onSaid?.(spec.say); return; }
    const live = { on: true, timers: [] };
    const all = () => spec.instances(example());
    const clear = () => all().forEach((el) => spec.set(el, false));
    const outlinesOf = () => { const at = local(example()); return all().map(at); };
    (async () => {
      try {
        setAct('play'); setSide('broken'); setMarks(null); setCam({ k: 1, x: 0, y: 0 }); onSaid?.('');
        await sleep(TIMING.lead, live);
        await document.fonts?.ready;
        // ACT 1 · it happens: the gesture over every instance, nothing drawn
        for (const el of all()) {
          setPtr({ ...toward(el, 4) }); await sleep(TIMING.move1, live);
          spec.set(el, true); await sleep(TIMING.hold1, live); spec.set(el, false);
        }
        // camera in on the set
        const root = example(), at = local(root), W = root.offsetWidth, H = root.offsetHeight;
        // the set the fault moves through: the union of what the screen names (never wider than what it holds)
        const parts = [spec.frame(root)].flat().map(at), l = Math.min(...parts.map((b) => b.x)), t = Math.min(...parts.map((b) => b.y));
        const f = { x: l, y: t, w: Math.max(...parts.map((b) => b.x + b.w)) - l, h: Math.max(...parts.map((b) => b.y + b.h)) - t };
        const k = Math.max(1, Math.min(CAMERA.max, (W * CAMERA.fill) / f.w));
        setPtr((p) => p && { ...p, gone: true });
        setCam({ k, x: W / 2 - k * (f.x + f.w / 2), y: H * CAMERA.at - k * (f.y + f.h / 2) });
        await sleep(TIMING.camera, live);
        // ACT 2 · measure it: outlines, then the gesture three times on the lead, the cause on the third
        const rest = outlinesOf();
        setMarks({ off: true, outlines: rest });
        await sleep(TIMING.outlines, live);
        const lead = all()[spec.lead];
        for (let rep = 0; rep < 3; rep++) {
          setPtr({ ...toward(lead, 6) });
          await sleep(TIMING.move1, live);
          spec.set(lead, true);
          const read = spec.read(example(), spec.lead, rest);
          setMarks({ off: true, outlines: rest, read, cause: rep === 2 ? spec.cause(read) : null });
          await sleep(rep === 2 ? TIMING.cause : TIMING.on2, live);
          spec.set(lead, false);
          setMarks({ off: true, outlines: rest });
          setPtr((p) => ({ ...p, y: p.y + 26 }));
          await sleep(TIMING.off2, live);
        }
        setMarks((m) => m && { ...m, fading: true }); await sleep(TIMING.fade, live);
        // ACT 3 · how the fix works: the switch, the outlines turn, the mechanism drawn and folded away
        const fixBtn = sw.current?.querySelectorAll('button')[1];
        if (fixBtn) { setPtr({ ...toward(fixBtn) }); await sleep(TIMING.toSwitch, live); setPtr((p) => ({ ...p, down: true })); await sleep(TIMING.press, live); }
        setSide('fixed'); setPtr((p) => ({ ...p, down: false }));
        await sleep(60, live);
        const fixedRest = outlinesOf();
        setMarks({ off: false, outlines: fixedRest });
        await sleep(TIMING.turn, live);
        setMarks({ off: false, outlines: fixedRest, mech: { t: 1 } });
        await sleep(TIMING.mech, live);
        setMarks({ off: false, outlines: fixedRest, mech: { t: 0, folding: true } });
        await sleep(TIMING.fold, live);
        setMarks({ off: false, outlines: fixedRest });
        // ACT 4 · payoff: the same gesture, the same ruler, every instance
        for (let i = 0; i < all().length; i++) {
          const el = all()[i];
          setPtr({ ...toward(el, 6) }); await sleep(TIMING.move4, live);
          spec.set(el, true);
          setMarks({ off: false, outlines: fixedRest, read: spec.read(example(), i, fixedRest) });
          await sleep(TIMING.hold4, live);
          spec.set(el, false);
        }
        await sleep(TIMING.rest4, live);
        setMarks((m) => m && { ...m, fading: true }); setPtr((p) => p && { ...p, gone: true });
        await sleep(TIMING.fade, live);
        setMarks(null); setCam({ k: 1, x: 0, y: 0 });
        await sleep(TIMING.out, live);
        setPtr(null); setAct('rest'); onSaid?.(spec.say);
      } catch { /* cut: a replay or leaving the page */ } finally { if (!live.on) { clear(); } }
    })();
    return () => { live.on = false; live.timers.forEach(clearTimeout); try { clear(); } catch {} };
  }, [run]);

  const playing = act === 'play', k = cam.k;
  const m = marks;
  return (
    <div ref={box} className="relative flex flex-col items-center gap-10">
      <style>{'@keyframes film-pop { from { opacity: 0; scale: 0.6 } to { opacity: 1; scale: 1 } }'}</style>
      {/* the frame: the card's own box; while the camera is in, what runs past it is cut */}
      <div className="relative" style={{ clipPath: k > 1.001 ? `inset(-${CAMERA.clipY}px -${CAMERA.clipX}px)` : 'none' }}>
        <div ref={camRef} className="relative" style={{ transform: `translate(${cam.x}px, ${cam.y}px) scale(${k})`, transformOrigin: '0 0', transition: `transform ${k > 1 ? TIMING.camera : TIMING.out}ms ${CAMERA.curve}`, pointerEvents: playing ? 'none' : undefined }}>
          <Example key={side} side={side} onStatus={playing ? undefined : onSaid} />
          <PlumbLayer>
            {m ? (
              <div style={{ position: 'absolute', inset: 0, opacity: m.fading ? 0 : 1, transition: `opacity ${TIMING.fade}ms ease` }}>
                {/* the ruler is the element itself: every instance's own box */}
                {m.outlines.map((b, i) => (
                  <span key={i} style={{ position: 'absolute', left: b.x - 4, top: b.y + 4, width: b.w + 8, height: b.h - 8, borderRadius: 4, border: `${1 / k}px dashed ${hue(m.off)}`, opacity: 0.85, transition: 'border-color 400ms ease', animation: 'film-pop 300ms ease both' }} />
                ))}
                {m.read ? (
                  <>
                    <Pill x={m.read.subject.box.x + m.read.subject.box.w / 2} y={m.read.subject.box.y - 2} k={k} off={m.off}>{m.read.subject.text}</Pill>
                    {m.read.effects.map((e, i) => (
                      <span key={i}>
                        <span style={{ position: 'absolute', left: e.x, top: e.y + 2, height: e.h - 4, width: 0, borderLeft: `${1 / k}px solid ${hue(m.off)}` }} />
                        <Pill x={e.x} y={e.y + e.h + 2} k={k} off={m.off} below>{e.text}</Pill>
                      </span>
                    ))}
                    {m.cause ? <Pill x={m.read.subject.box.x + m.read.subject.box.w / 2} y={m.read.subject.box.y + m.read.subject.box.h + 2 + (MARK.pill + 6) / k} k={k} off={m.off} below>{m.cause}</Pill> : null}
                  </>
                ) : null}
                {m.mech ? <spec.mechanism.Draw boxes={m.outlines} t={m.mech.t} k={k} root={example()} /> : null}
                {m.mech && m.mech.t ? <Pill x={(m.outlines[0].x + m.outlines.at(-1).x + m.outlines.at(-1).w) / 2} y={m.outlines[0].y - 2} k={k} off={false}>{spec.mechanism.pill}</Pill> : null}
              </div>
            ) : null}
          </PlumbLayer>
        </div>
      </div>
      <div ref={sw} className="relative z-10 flex flex-col items-center">
        <Switch names={names} fixed={side === 'fixed'} ready={!playing} onBack={() => setSide('broken')} onFix={() => setSide('fixed')} />
      </div>
      {!playing ? <button type="button" onClick={() => setRun((r) => r + 1)} className="-mt-7 text-[13px] font-medium text-ink-muted hover:text-ink">Replay</button> : <span className="-mt-7 h-5" />}
      {/* the drawn pointer: part of the film, never the viewer's input */}
      {ptr ? (
        <svg aria-hidden="true" width="18" height="22" viewBox="0 0 18 22" style={{ position: 'absolute', left: 0, top: 0, zIndex: 40, pointerEvents: 'none',
          transform: `translate(${ptr.x - 3}px, ${ptr.y - 2}px) scale(${ptr.down ? 0.86 : 1})`, opacity: ptr.gone ? 0 : 1,
          transition: 'transform 420ms cubic-bezier(0.3, 0, 0.2, 1), opacity 250ms ease', filter: 'drop-shadow(0 1px 1.5px rgb(0 0 0 / 0.25))' }}>
          <path d="M2 1.5v16.2l4.1-3.9 2.6 6.2 3-1.3-2.6-6h5.7z" fill="#111" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      ) : null}
    </div>
  );
}
