// The probe stage (docs/craft/probe-stage-brief.md): for a principle plumber finds by doing something, the stage plays
// back what plumber's probe really did. The showcase asks the dev server (/__showcase/probe/:n?side=) to run the real
// probe on this page, which answers with the frames it recorded, the pointer's samples and the rects it measured; the
// stage plays the frames over the example, slowed, and draws plumber's marks from those numbers
// (docs/design/prototypes/probe-marks.html, approved): the trail, the contact point, the moment it closed, the triangle.
//
// THE MOMENT (ms)
//     0   rest: the live example
//   500   camera in on what the probe touched (900ms)
//  1400   shade, ruler and plumber's contact point in
//  1700   the frames: a beat on the submenu open under the item (700ms), then the gesture, slowed: broken holds
//         coral where it failed; fixed runs to the end, mint
//  hold   1800ms on the verdict · marks out (300ms) · camera out (900ms) · rest
// With both sides at hand, broken plays first, then the switch flips and fixed plays.
import { useEffect, useRef, useState } from 'react';
import { PlumbLayer } from './Principle.jsx';

const T = { camIn: 500, camDur: 900, marksIn: 1400, play: 1700, open: 700, hold: 1800, out: 300 };
const PLAY = 1200; // ms of stage a gesture is slowed to fill, whatever its own length
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const clamp = (v) => Math.max(0, Math.min(1, v));
const inside = (p, r) => r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

// what the probe did, in the terms the marks need
function read(data) {
  const p = data?.probe;
  if (!p?.samples?.length) return null;
  const s = p.samples, end = s.at(-1).t || 1;
  const step = p.lost ? Math.max(1, p.step) : null;
  const lostAt = step !== null ? s[Math.min(step, s.length - 1)] : null;
  const rects = p.rects ?? p; // the probe's rects (probe.json: subtrigger, submenu, siblings)
  const crossed = lostAt ? rects.siblings?.find((r) => inside(lostAt, r)) ?? null : null;
  // the slowdown: the gesture fills PLAY ms, said on the ruler as a fraction
  const speed = Math.min(1, end / PLAY), said = speed >= 0.75 ? '' : speed >= 0.4 ? '½ speed' : speed >= 0.2 ? '¼ speed' : `${Math.round(1 / speed)}× slower`;
  return { s, end, lostAt, crossed, sub: rects.submenu, trigger: rects.subtrigger, siblings: rects.siblings, frames: [...(data.frames ?? [])].sort((a, b) => a.t - b.t), speed, said, found: (data.findings ?? []).length };
}

// the camera's subject: what the probe touched, with room for the pill under it
function subject(g, box) {
  const rects = [g.sub, g.trigger, ...(g.siblings ?? []), ...g.s.map((q) => ({ x: q.x, y: q.y, w: 0, h: 0 }))].filter(Boolean);
  const l = Math.min(...rects.map((r) => r.x)) - 36, t = Math.min(...rects.map((r) => r.y)) - 28;
  const r = Math.max(...rects.map((q) => q.x + q.w)) + 36, b = Math.max(...rects.map((q) => q.y + q.h)) + 52;
  const x = Math.max(0, l), y = Math.max(0, t);
  return { x, y, w: Math.min(box.w, r) - x, h: Math.min(box.h, b) - y };
}

export function ProbeStage({ n, side, setSide, children, onState }) {
  const box = useRef(null);
  const [data, setData] = useState({});           // side → the probe's answer
  const [play, setPlay] = useState(null);         // { side, t0, then }
  const [now, setNow] = useState(0);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // ask plumber, broken first; each answer is cached by the server, so a second visit is instant
  useEffect(() => {
    let gone = false;
    (async () => {
      for (const s of ['broken', 'fixed']) {
        const r = await fetch(`/__showcase/probe/${n}?side=${s}`).then((x) => (x.ok ? x.json() : { error: x.status })).catch((e) => ({ error: String(e) }));
        if (gone) return;
        setData((d) => ({ ...d, [s]: r }));
      }
    })();
    return () => { gone = true; };
  }, [n]);
  useEffect(() => { const el = box.current; if (el) setSize({ w: el.offsetWidth, h: el.offsetHeight }); }, [side, data]);

  // the first time both sides are in: broken, then fixed
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !read(data.broken)) return;
    started.current = true;
    setSide('broken');
    setPlay({ side: 'broken', t0: performance.now(), then: 'fixed' });
  }, [data.broken, setSide]);
  // the switch plays that side alone
  const pick = (s) => { if (play) return; setSide(s); if (read(data[s])) setPlay({ side: s, t0: performance.now() }); };
  // the lesson panel reads plumber's findings from the two probes, as it reads a live screen's read
  const norm = (f) => f && { ...f, file: f.file ?? f.sites?.[0]?.file ?? '', line: f.line ?? f.sites?.[0]?.line ?? '' };
  const craft = (side) => (data[side]?.findings ?? []).filter((f) => String(f.rule).startsWith('craft/')).map(norm);
  const lesson = data.broken?.error ? { phase: 'error', error: status() } : !data.broken ? { phase: 'asking' }
    : { phase: side === 'fixed' && data.fixed ? 'fixed' : 'broken', found: craft('broken'), after: data.fixed ? craft('fixed') : [] };
  // told to the page only when what it says changes (the page re-renders this stage)
  const picker = useRef(pick); picker.current = pick;
  const said = JSON.stringify({ busy: !!play, status: status(), lesson });
  useEffect(() => { onState?.({ pick: (x) => picker.current(x), ...JSON.parse(said) }); }, [said, onState]);

  useEffect(() => {
    if (!play) return;
    let raf;
    const tick = (t) => { setNow(t); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [play]);

  const g = play ? read(data[play.side]) : null;
  const t = play ? now - play.t0 : 0;
  // the gesture's own clock. It holds first on the submenu open under the item (what the probe is about to lose), then
  // runs; broken stops where it failed
  const stop = g ? (g.lostAt ? g.lostAt.t : g.end) : 0;
  const pre = g ? (g.frames.filter((f) => f.t < (g.s[1]?.t ?? 0)).at(-1)?.t ?? 0) : 0;
  const clock = g ? (t < T.play + T.open ? Math.max(0, pre) : Math.min(stop, Math.max(0, pre) + (t - T.play - T.open) * g.speed)) : 0;
  const verdictAt = g ? T.play + T.open + (stop - Math.max(0, pre)) / g.speed : 0, outAt = verdictAt + T.hold;
  // done: hand on to the next side, or back to rest
  useEffect(() => {
    if (!play || !g || t < outAt + T.out + T.camDur) return;
    if (play.then && read(data[play.then])) { setSide(play.then); setPlay({ side: play.then, t0: performance.now(), handed: true }); }
    else setPlay(null);
  });

  function status() {
    if (data.broken?.error) return 'plumber couldn’t run its probe here.';
    if (!data.broken) return 'plumber is trying the menu…';
    return null;
  }

  // camera: a handed-on side starts with the camera already in
  const sub = g && size.w ? subject(g, size) : null;
  const camIn = play?.handed ? 1 : ease(clamp((t - T.camIn) / T.camDur));
  const c = sub ? camIn * (1 - ease(clamp((t - outAt - T.out) / T.camDur))) : 0;
  const Z = sub ? Math.min(2.4, size.w / sub.w, size.h / sub.h) : 1;
  const k = 1 + (Z - 1) * c;
  const tx = sub ? (-sub.x * Z + (size.w - sub.w * Z) / 2) * c : 0, ty = sub ? (-sub.y * Z + (size.h - sub.h * Z) / 2) * c : 0;
  const on = !!g && (play?.handed || t >= T.marksIn) && t < outAt;
  const playing = !!g && t >= T.play - 200 && t < outAt + T.out;
  const closedNow = !!g?.lostAt && clock >= g.lostAt.t;
  const frame = g && playing ? (closedNow ? g.frames.find((f) => f.t >= g.lostAt.t) ?? g.frames.at(-1) : g.frames.filter((f) => f.t <= clock).at(-1) ?? g.frames[0]) : null;
  const closed = !!g?.lostAt && clock >= g.lostAt.t, reached = !!g && !g.lostAt && clock >= g.end;
  const pt = g ? (g.s.filter((q) => q.t <= clock).at(-1) ?? g.s[0]) : null;
  const toView = (q) => ({ x: tx + q.x * k, y: ty + q.y * k });

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={box} className="relative overflow-hidden rounded-card" style={{ isolation: 'isolate' }}>
        <div style={{ transform: `translate(${tx}px, ${ty}px) scale(${k})`, transformOrigin: '0 0' }}>
          {children}
          {/* what plumber recorded, over the live example while it plays */}
          {frame ? <img src={frame.url} alt="" draggable="false" className="pointer-events-none absolute top-0 left-0 z-20 select-none" style={{ width: size.w, height: size.h }} /> : null}
          {/* layered explicitly: the example's own menus sit at z-10; the frames go over them, plumber's marks over those */}
          {g ? (
            <div className="pointer-events-none absolute inset-0 z-30"><PlumbLayer>
              <Shade on={on} cut={sub} size={size} />
              <svg width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`} style={{ position: 'absolute', inset: 0, overflow: 'visible', opacity: on ? 1 : 0, transition: 'opacity 250ms var(--pl-ease-out)' }}>
                <Gesture g={g} clock={clock} closed={closed} reached={reached} side={play.side} pt={pt} k={k} />
              </svg>
            </PlumbLayer></div>
          ) : null}
        </div>
        {g ? (
          <div className="pointer-events-none absolute inset-0 z-30"><PlumbLayer>
            {closed || reached ? <Pill at={toView(closed ? { x: g.sub.x + g.sub.w / 2, y: g.sub.y + g.sub.h / 2 } : { x: g.sub.x + g.sub.w / 2, y: g.sub.y + g.sub.h + 18 })} off={closed}
              text={closed ? `closed · crossed ${g.crossed?.label ?? 'another item'}` : 'reached · ✓'} shown={on} /> : null}
          </PlumbLayer></div>
        ) : null}
      </div>
      <Ruler g={g} clock={clock} shown={on} closed={closed} reached={reached} side={play?.side} width={size.w} />
    </div>
  );
}

// the page dims around what the probe touched (plumber's scrim, as on the live stage)
function Shade({ on, cut, size }) {
  if (!cut) return null;
  const r = 12, l = cut.x + 6, t = cut.y + 6, w = cut.w - 12, h = cut.h - 12;
  const hole = `M${l + r} ${t}H${l + w - r}A${r} ${r} 0 0 1 ${l + w} ${t + r}V${t + h - r}A${r} ${r} 0 0 1 ${l + w - r} ${t + h}H${l + r}A${r} ${r} 0 0 1 ${l} ${t + h - r}V${t + r}A${r} ${r} 0 0 1 ${l + r} ${t}Z`;
  return <div style={{ position: 'absolute', inset: 0, background: 'var(--pl-scrim)', clipPath: `path(evenodd, "M0 0H${size.w}V${size.h}H0Z${hole}")`, opacity: on ? 1 : 0, transition: 'opacity 300ms var(--pl-ease-out)' }} />;
}

// the gesture, as plumber draws it: a ring per sample the probe took, dots between them fainter the older they are,
// the contact point where it left the item; coral where it failed (the item it crossed hatched, the submenu a ghost),
// the safe triangle and mint where it held
function Gesture({ g, clock, closed, reached, side, pt, k }) {
  const shown = g.s.filter((q) => q.t <= clock);
  const c = g.s[0], dots = [];
  for (let i = 1; i < shown.length; i++) {
    const a = shown[i - 1], b = shown[i], d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.round(d / 5));
    for (let j = 1; j < n; j++) dots.push({ x: a.x + ((b.x - a.x) * j) / n, y: a.y + ((b.y - a.y) * j) / n, age: (i - 1 + j / n) / Math.max(1, shown.length - 1) });
  }
  const line = { vectorEffect: 'non-scaling-stroke' };
  const S = g.sub;
  return (
    <>
      <defs>
        <pattern id="probe-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="5" height="5" fill="color-mix(in oklab, var(--pl-coral) 8%, transparent)" style={{ fill: 'color-mix(in oklab, var(--pl-coral) 8%, transparent)' }} />
          <line x1="0" y1="0" x2="0" y2="5" style={{ stroke: 'var(--pl-coral)', strokeOpacity: 0.45, strokeWidth: 1 }} />
        </pattern>
      </defs>
      {side === 'fixed' && S ? (
        <>
          <polygon points={`${c.x},${c.y} ${S.x},${S.y - 4} ${S.x},${S.y + S.h + 4}`} style={{ ...line, fill: 'color-mix(in oklab, var(--pl-sky) 13%, transparent)', stroke: 'var(--pl-sky)', strokeWidth: 1.25, strokeDasharray: '4 3', strokeLinejoin: 'round' }} />
          <line x1={S.x} y1={S.y - 4} x2={S.x} y2={S.y + S.h + 4} style={{ ...line, stroke: 'var(--pl-sky)', strokeWidth: 1.25, strokeDasharray: '4 3' }} />
        </>
      ) : null}
      {closed && g.crossed ? <rect x={g.crossed.x} y={g.crossed.y} width={g.crossed.w} height={g.crossed.h} rx="6" style={{ fill: 'url(#probe-hatch)' }} /> : null}
      {closed && S ? <rect x={S.x} y={S.y} width={S.w} height={S.h} rx="10" style={{ ...line, fill: 'none', stroke: 'var(--pl-coral)', strokeWidth: 1, strokeDasharray: '2 4', strokeLinecap: 'round', opacity: 0.55 }} /> : null}
      {dots.map((d, i) => <circle key={'d' + i} cx={d.x} cy={d.y} r={1.1 / Math.max(1, k / 1.6)} style={{ fill: 'var(--pl-sky)', opacity: 0.2 + 0.6 * d.age }} />)}
      {shown.slice(1).map((q, i) => <circle key={'r' + i} cx={q.x} cy={q.y} r={1.9} style={{ ...line, fill: '#fff', stroke: 'var(--pl-sky)', strokeWidth: 1.5 }} />)}
      <circle cx={c.x} cy={c.y} r={3} style={{ ...line, fill: '#fff', stroke: 'var(--pl-sky)', strokeWidth: 1.5 }} />
      {closed ? <><circle cx={pt.x} cy={pt.y} r={7} style={{ ...line, fill: 'none', stroke: 'color-mix(in oklab, var(--pl-coral) 35%, transparent)', strokeWidth: 6 }} /><circle cx={pt.x} cy={pt.y} r={3.2} style={{ ...line, fill: 'var(--pl-coral)', stroke: '#fff', strokeWidth: 1.5 }} /></> : null}
      {reached ? <circle cx={pt.x} cy={pt.y} r={3.2} style={{ ...line, fill: 'var(--pl-mint)', stroke: '#fff', strokeWidth: 1.5 }} /> : null}
      {/* plumber's pointer */}
      <g transform={`translate(${pt.x + 2} ${pt.y + 1}) scale(${1 / k})`}><path d="M0 0 L0 13.5 L3.4 10.4 L5.9 16 L8.1 15.1 L5.7 9.6 L10 9.6 Z" style={{ fill: '#fff', stroke: 'var(--pl-ink)', strokeWidth: 1, strokeLinejoin: 'round' }} /></g>
    </>
  );
}

function Pill({ at, off, text, shown }) {
  return (
    <span style={{ position: 'absolute', left: at.x, top: at.y, transform: 'translate(-50%, -50%)', whiteSpace: 'nowrap', font: '600 11px/14px var(--pl-sans)', padding: '3px 9px',
      borderRadius: 999, color: 'var(--pl-on-accent)', background: off ? 'var(--pl-coral)' : 'var(--pl-mint)', boxShadow: '0 0 0 1px var(--pl-halo), 0 1px 2px rgb(0 0 0 / 0.12)',
      opacity: shown ? 1 : 0, transition: 'opacity 200ms var(--pl-ease-out)' }}>{text}</span>
  );
}

// the time ruler: plumber's measurement for time. The gesture's own milliseconds, what has played, each event a tick
function Ruler({ g, clock, shown, closed, reached, side, width }) {
  const w = Math.max(320, width - 24), end = g ? Math.ceil(g.end / 100) * 100 : 600, x = (ms) => (ms / end) * w;
  const ticks = [];
  for (let ms = 0; ms <= end; ms += 50) ticks.push(ms);
  const tone = closed ? 'var(--pl-coral)' : reached ? 'var(--pl-mint)' : 'var(--pl-sky)';
  return (
    <div className="relative h-10" style={{ width: w, opacity: shown ? 1 : 0, transition: 'opacity 300ms' }}>
      <PlumbLayer>
        <span style={{ position: 'absolute', left: 0, top: -6, font: '600 10.5px/14px var(--pl-sans)', color: 'var(--pl-ink-2)' }}>plumber’s probe · {side === 'fixed' ? 'Radix menu' : 'hand-rolled menu'}</span>
        {g?.said ? <span style={{ position: 'absolute', right: 0, top: -6, font: '600 10.5px/14px var(--pl-sans)', color: 'var(--pl-ink-2)' }}>{g.said}</span> : null}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 16, borderTop: '1px solid var(--pl-ink-3)' }} />
        {ticks.map((ms) => (
          <span key={ms}>
            <span style={{ position: 'absolute', left: x(ms), top: ms % 100 ? 14 : 12, width: 1, height: ms % 100 ? 4 : 8, background: 'var(--pl-ink-3)' }} />
            {ms % 100 ? null : <span style={{ position: 'absolute', left: x(ms), top: 22, transform: 'translateX(-50%)', font: '400 10.5px/14px var(--pl-mono)', color: 'var(--pl-ink-2)' }}>{ms}</span>}
          </span>
        ))}
        <span style={{ position: 'absolute', left: 0, top: 15, height: 3, width: x(clock), background: tone, borderRadius: 2 }} />
        <span style={{ position: 'absolute', left: 0, top: 11, width: 11, height: 11, marginLeft: -5.5, borderRadius: '50%', background: '#fff', boxShadow: '0 0 0 1.5px var(--pl-sky)' }} />
        {closed || reached ? <span style={{ position: 'absolute', left: x(clock), top: 11, width: 11, height: 11, marginLeft: -5.5, borderRadius: '50%', background: tone, boxShadow: '0 0 0 2px #fff' }} /> : null}
        <span style={{ position: 'absolute', left: x(clock), top: 4, width: 2, height: 24, marginLeft: -1, background: 'var(--pl-sky)', borderRadius: 1, boxShadow: '0 0 0 1px #fff' }} />
      </PlumbLayer>
    </div>
  );
}
