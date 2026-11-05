// #65 past a limit, follow less and less. Wayfare's city map on a phone, Café Mona's place sheet over it. The sheet
// stops at three heights (open, half, peek) and travels freely between them; past either end of its travel (pulled up
// above open, or down below peek) it is clamped, so it stops dead under a hand that keeps going, at both ends.
// Fixed: past either end it follows less and less (a rubber band, Vaul's and Motion's dragElastic), then springs back
// to the nearest stop.
// The marks are what the probe records: where you pressed (sky ring), the end you went past (a dashed line), your hand
// now (a dot), and on the broken side the ground your hand crossed with nothing following (hatch), with how far.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import cafe from '../../media/s65-cafe.jpg';
import you from '../../media/people/person-03.jpg';
import graham from '../../media/people/person-04.jpg';

export const n = 65;
export const handsOn = true;

const TOKENS = '/__plumb/src/tokens.css';
function MarksLayer({ children }) {
  const host = useRef(null);
  const [root, setRoot] = useState(null);
  useEffect(() => {
    const r = host.current.shadowRoot ?? host.current.attachShadow({ mode: 'open' });
    r.innerHTML = `<link rel="stylesheet" href="${TOKENS}"><style>:host { position: absolute; inset: 0; pointer-events: none; overflow: visible; }</style>`;
    setRoot(r);
  }, []);
  return <div ref={host} data-scheme="light" aria-hidden="true" className="pointer-events-none absolute inset-0">{root ? createPortal(children, root) : null}</div>;
}
const hue = (off) => (off ? 'var(--pl-off)' : 'var(--pl-on)');
const Hatch = ({ x, y, w, h }) => (
  <span style={{ position: 'absolute', left: x, top: y, width: w, height: h, opacity: 0.55, backgroundImage: 'repeating-linear-gradient(45deg, var(--pl-off) 0 1px, transparent 1px 4px)' }} />
);
const Outline = ({ x, y, w, h, off, r = 4 }) => (
  <span style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: r, boxShadow: `inset 0 0 0 1px ${hue(off)}`, opacity: 0.7 }} />
);
const Ghost = ({ x, y, w, h, r = 8, off = true }) => <span style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: r, border: `1px dashed ${hue(off)}`, opacity: 0.6 }} />;
const Tag = ({ x, y, off, children }) => (
  <span style={{ position: 'absolute', left: x, top: y, transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', height: 20, padding: '0 var(--pl-space-3)',
    borderRadius: 'var(--pl-radius-tag)', font: '500 11px/1 var(--pl-mono)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
    color: 'var(--pl-on-accent)', background: hue(off), boxShadow: '0 0 0 1px var(--pl-halo)' }}>{children}</span>
);
const Contact = ({ x, y }) => <span style={{ position: 'absolute', left: x - 5, top: y - 5, width: 10, height: 10, borderRadius: '50%', boxShadow: '0 0 0 1.5px var(--pl-sky), 0 0 0 3px var(--pl-halo)' }} />;

// the phone is 340 × 640; the sheet's top rests at one of three stops, measured from the phone's top
const W = 340, H = 640, OPEN = 232, STOPS = [0, 168, 316]; // offsets below open: open, half, peek
const END = STOPS.at(-1), SHEET_D = 190, BAND_C = 0.55;
const rubber = (x) => (1 - 1 / ((x * BAND_C) / SHEET_D + 1)) * SHEET_D;
const BARS = [22, 48, 92, 80, 52, 42, 46, 26, 22, 30, 24, 10];
const ACTIONS = [
  ['Directions', <path key="d" d="M8 1.8 13.2 14 8 11.2 2.8 14Z" />],
  ['Call', <path key="c" d="M3.5 2h2.4l1.2 3-1.6 1.1a7.6 7.6 0 0 0 4.4 4.4L11 8.9l3 1.2v2.4a1.5 1.5 0 0 1-1.6 1.5A11 11 0 0 1 2 3.6 1.5 1.5 0 0 1 3.5 2Z" />],
  ['Save', <path key="s" d="M4 2h8v12l-4-3-4 3Z" />],
  ['Share', <path key="h" d="M8 10V2M5 4.8 8 2l3 2.8M3.5 8v5.5h9V8" />],
];

export default function PlaceSheet({ side = 'broken', onStatus }) {
  const phone = useRef(null), sheet = useRef(null);
  const elastic = side === 'fixed';
  const [g, setG] = useState(null); // { contact, hand, start, pull, gave, end, peak, live }
  const off = useRef(0), spring = useRef(null), live = useRef(false);
  const place = () => { if (sheet.current) sheet.current.style.translate = `0 ${off.current}px`; };
  useEffect(() => { setG(null); off.current = 0; spring.current = null; place(); }, [side]);
  const at = (e) => { const r = phone.current.getBoundingClientRect(), k = r.width / phone.current.offsetWidth || 1; return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k }; };
  const settle = (to) => { spring.current = { v: 0, to }; };
  const down = (e) => {
    try { sheet.current.setPointerCapture(e.pointerId); } catch {}
    spring.current = null; live.current = true;
    const p = at(e);
    setG({ contact: p, hand: p, start: off.current, pull: 0, gave: 0, end: null, peak: { pull: 0, gave: 0, hand: p, end: null }, live: true });
  };
  // a gesture ends however the hand ends it
  const up = () => {
    if (!live.current) return;
    live.current = false;
    setG((s) => (s?.live ? { ...s, live: false } : s));
    const near = STOPS.reduce((a, b) => (Math.abs(b - off.current) < Math.abs(a - off.current) ? b : a));
    if (off.current !== near) settle(near);
  };
  useEffect(() => {
    const move = (e) => {
      if (!live.current) return;
      if (e.buttons === 0) return up();
      setG((s) => {
        if (!s?.live) return s;
        const p = at(e), raw = s.start + (p.y - s.contact.y);
        const end = raw < 0 ? 'top' : raw > END ? 'bottom' : null, over = end === 'top' ? -raw : end === 'bottom' ? raw - END : 0;
        off.current = end === 'top' ? (elastic ? -rubber(over) : 0) : end === 'bottom' ? END + (elastic ? rubber(over) : 0) : raw;
        place();
        const gave = end === 'top' ? -off.current : end === 'bottom' ? off.current - END : 0;
        return { ...s, hand: p, pull: over, gave, end, peak: over > s.peak.pull ? { pull: over, gave, hand: p, end } : s.peak };
      });
    };
    const end = () => up();
    addEventListener('pointermove', move); addEventListener('pointerup', end); addEventListener('pointercancel', end); addEventListener('blur', end);
    return () => { removeEventListener('pointermove', move); removeEventListener('pointerup', end); removeEventListener('pointercancel', end); removeEventListener('blur', end); };
  }, [elastic]);
  // the spring back: stiffness 400, damping 32, per frame
  useEffect(() => {
    let id, last = performance.now();
    const step = (now) => {
      const dt = Math.min(0.032, (now - last) / 1000); last = now;
      const sp = spring.current;
      if (sp) { sp.v += (-400 * (off.current - sp.to) - 32 * sp.v) * dt; off.current += sp.v * dt; if (Math.abs(off.current - sp.to) < 0.3 && Math.abs(sp.v) < 4) { off.current = sp.to; spring.current = null; } place(); }
      id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, []);
  const m = g ? (g.live ? g : g.peak) : null;
  useEffect(() => {
    const where = m?.end === 'bottom' ? 'below its lowest stop' : 'above its open edge';
    onStatus?.(!m ? 'Grab the sheet and pull it up, past its open edge. Or drag it to the bottom, and keep going.'
      : m.pull === 0 ? (g.live ? 'Keep going, past the end of its travel: past the dashed line.' : 'You let go before the end. Pull it past the dashed line.')
      : !elastic ? `Your hand went ${Math.round(m.pull)}px ${where} and the sheet didn’t move at all: a wall under your finger.`
      : `It gave ${Math.round(m.gave)}px for your ${Math.round(m.pull)}px, less the further you pulled${g.live ? '' : ', then sprang back'}.`);
  }, [m?.pull, m?.gave, m?.end, g?.live, elastic, onStatus]);

  // the marks, in the phone's own pixels
  const L = 14, R = W - 14;
  const limit = m?.end === 'bottom' ? OPEN + END : OPEN, down_ = m?.end === 'bottom';
  const reach = m ? (down_ ? limit + m.pull : limit - m.pull) : limit;
  const edge = m ? (down_ ? limit + m.gave : limit - m.gave) : limit, hand = g ? (g.live ? g.hand : g.peak.hand) : null;
  const span = (a, b) => ({ y: Math.min(a, b), h: Math.abs(a - b) });
  return (
    <div className="relative w-[40rem] max-w-full">
      <div ref={phone} className="relative mx-auto h-[640px] w-[340px] touch-none overflow-hidden rounded-[36px] corner-squircle bg-[#ecefe7] shadow-window ring-1 ring-ink/12 select-none">
        {/* the city, drawn as a map: blocks, parks, the river, streets, a walk to the café */}
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" aria-hidden="true">
          <rect width={W} height={H} fill="#ecefe7" />
          <path d="M-10 118 L120 96 L150 140 L40 196 L-10 200Z" fill="#cfe3c4" />
          <path d="M224 136 L340 116 L350 176 L236 190Z" fill="#d6e8cc" />
          <path d="M-10 214 C60 196 120 222 180 200 C240 178 300 196 350 172 L350 200 C300 222 246 206 190 228 C130 250 70 226 -10 244Z" fill="#b8d5ee" />
          <path d="M20 330 L140 310 L160 380 L30 400Z" fill="#cfe3c4" />
          <g fill="#f8f9f6"><rect x="0" y="252" width="340" height="9" transform="rotate(-7 170 256)" /><rect x="160" y="0" width="10" height="640" transform="rotate(6 165 300)" /><rect x="0" y="66" width="340" height="7" transform="rotate(-9 170 70)" /><rect x="60" y="0" width="6" height="320" transform="rotate(-14 63 150)" /><rect x="250" y="0" width="7" height="320" transform="rotate(10 253 150)" /><rect x="0" y="430" width="340" height="7" transform="rotate(5 170 433)" /></g>
          <rect x="164" y="0" width="5" height="640" fill="#f1d9a4" transform="rotate(6 165 300)" />
          <g className="fill-[#6b7a66] text-[9.5px] font-medium tracking-[0.02em]"><text x="18" y="134">ASHBY GARDENS</text><text x="262" y="160">MILL PARK</text></g>
          <text x="22" y="226" transform="rotate(-6 22 226)" className="fill-[#5d86ab] text-[9.5px] font-medium tracking-[0.02em]">RIVER WEND</text>
          <path d="M58 170 C100 172 150 150 196 168" fill="none" stroke="#5550d8" strokeWidth="3" strokeLinecap="round" strokeDasharray="0.1 6" />
          <circle cx="58" cy="170" r="14" fill="#5550d8" opacity="0.14" /><circle cx="58" cy="170" r="6" fill="#5550d8" stroke="#fff" strokeWidth="2.5" />
          <g transform="translate(196 168)"><path d="M0 0 C-10 -12 -14 -17 -14 -24 A14 14 0 0 1 14 -24 C14 -17 10 -12 0 0Z" fill="#5550d8" stroke="#fff" strokeWidth="2" /><path d="M-6 -29 h9 v5 a4 4 0 0 1 -4 4 h-1 a4 4 0 0 1 -4 -4z M3 -27 h2 a2 2 0 0 1 0 4 h-2" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" /></g>
          <g fill="#fff" stroke="#8a93a3" strokeWidth="1.5"><circle cx="300" cy="122" r="5" /><circle cx="176" cy="126" r="5" /><circle cx="232" cy="212" r="5" /><circle cx="96" cy="360" r="5" /></g>
        </svg>
        <span className="absolute inset-x-3.5 top-[18px] flex h-11 items-center gap-2.5 rounded-full bg-surface pr-1.5 pl-3.5 text-sm text-ink-muted shadow-overlay">
          <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="7" cy="7" r="4.8" /><path d="m10.6 10.6 3.4 3.4" strokeLinecap="round" /></svg>
          Coffee near you
          <img src={you} alt="" className="ml-auto size-8 rounded-full object-cover outline-1 -outline-offset-1 outline-black/10" />
        </span>
        <span className="absolute top-[72px] left-3.5 flex gap-1.5">
          {['Coffee', 'Open now', 'Bakeries', 'Parks'].map((c, i) => (
            <span key={c} className={'inline-flex h-[30px] items-center rounded-full px-3 text-[13px] font-medium shadow-raised ' + (i ? 'bg-surface' : 'bg-ink text-white')}>{c}</span>
          ))}
        </span>
        {/* the sheet: its top at OPEN, moved by its offset; it travels between its stops */}
        <section ref={sheet} onPointerDown={down} aria-label="Café Mona"
          className="absolute inset-x-0 cursor-grab rounded-t-[20px] corner-squircle bg-surface px-[18px] pt-2 shadow-[0_0_12px_rgb(18_35_61/0.12)] active:cursor-grabbing" style={{ top: OPEN, height: H - OPEN + 120 }}>
          <span className="mx-auto mb-3 block h-1 w-9 rounded-full bg-ink/16" />
          <span className="flex items-start gap-2.5">
            <span className="flex flex-col">
              <span className="text-xl leading-[26px] font-semibold tracking-[-0.015em]">Café Mona</span>
              <span className="text-[13px] text-ink-muted"><span className="text-caution">★</span> <span className="tabular-nums">4.7</span> (312) · Coffee · 6 min walk</span>
              <span className="text-[13px] text-ink-muted"><span className="font-medium text-positive">Open</span> until 18:00 · 14 Mill Road</span>
            </span>
            <button type="button" aria-label="Close" onPointerDown={(e) => e.stopPropagation()} onClick={() => settle(END)} className="ml-auto grid size-[30px] shrink-0 place-items-center rounded-full bg-sunken text-ink-muted hover:bg-line active:brightness-95">
              <svg viewBox="0 0 12 12" className="size-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" /></svg>
            </button>
          </span>
          <span className="mt-3.5 grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-1.5">
            {ACTIONS.map(([label, icon], i) => (
              <button key={label} type="button" className={'flex h-[52px] flex-col items-center justify-center gap-[3px] rounded-card text-xs font-medium ' + (i ? 'bg-sunken text-accent-deep hover:bg-line active:brightness-95' : 'bg-accent text-accent-ink hover:bg-accent-deep active:brightness-95')}>
                <svg viewBox="0 0 16 16" className="size-[17px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>{label}
              </button>
            ))}
          </span>
          <span className="mt-3.5 grid grid-cols-[7rem_1fr] gap-2">
            <img src={cafe} alt="" draggable="false" className="h-[104px] w-28 rounded-card object-cover outline-1 -outline-offset-1 outline-black/10" />
            <span className="flex flex-col rounded-card bg-sunken px-3 pt-2 pb-2.5">
              <span className="flex items-center gap-2 text-[12.5px] font-medium">
                <img src={graham} alt="" draggable="false" className="size-[22px] rounded-full object-cover outline-1 -outline-offset-1 outline-black/10" />Graham<span className="ml-auto text-xs font-normal text-ink-subtle">2 days ago</span>
              </span>
              <span className="mt-1.5 text-[12.5px] leading-[18px] text-pretty text-ink-muted">“Best flat white on the river. Sit by the window before nine.”</span>
            </span>
          </span>
          <span className="mt-4 flex justify-between text-[13px] font-medium">Popular times<span className="text-[12.5px] font-normal text-ink-muted">Usually quiet now</span></span>
          <span className="mt-2.5 flex h-[54px] items-end gap-1" aria-hidden="true">
            {BARS.map((b, i) => <span key={i} className={'flex-1 rounded-t-[3px] rounded-b-[1px] ' + (i === 7 ? 'bg-accent' : 'bg-[#dcdbf7]')} style={{ height: `${b}%` }} />)}
          </span>
          <span className="mt-[5px] flex justify-between text-[11px] text-ink-subtle tabular-nums">{[7, 9, 11, 13, 15, 17].map((h) => <span key={h}>{h}</span>)}</span>
        </section>
      </div>
      <MarksLayer>
        <div style={{ position: 'absolute', left: '50%', top: 0, width: W, height: '100%', transform: 'translateX(-50%)' }}>
          {/* the end of the sheet's travel you went past */}
          {/* drawn at the phone's sides only, so it never crosses the sheet's words */}
          <span style={{ position: 'absolute', left: -28, width: 24, top: limit, borderTop: '1px dashed var(--pl-ink-3)' }} />
          <span style={{ position: 'absolute', left: W + 4, width: 24, top: limit, borderTop: '1px dashed var(--pl-ink-3)' }} />
          {m && m.pull > 0 ? (!elastic ? (
            // over the map going up; beside the phone going down, so no hatch crosses the sheet's words
            <span style={{ position: 'absolute', left: down_ ? W + 6 : L, width: down_ ? 12 : R - L, top: span(reach, limit).y, height: span(reach, limit).h }}><Hatch x={0} y={0} w={down_ ? 12 : R - L} h={span(reach, limit).h} /><Outline x={0} y={0} w={down_ ? 12 : R - L} h={span(reach, limit).h} off r={down_ ? 2 : 8} /></span>
          ) : (
            <>
              <Ghost x={L} y={span(reach, edge).y} w={R - L} h={span(reach, edge).h} off={false} />
              {/* what it gave, measured at the sheet's edge (a bracket, so it doesn't cover the words) */}
              <span style={{ position: 'absolute', left: R + 10, top: span(edge, limit).y, width: 0, height: span(edge, limit).h, borderLeft: '2px solid var(--pl-on)' }} />
              <span style={{ position: 'absolute', left: R + 6, top: edge, width: 10, height: 0, borderTop: '2px solid var(--pl-on)' }} />
              <span style={{ position: 'absolute', left: R + 6, top: limit - 1, width: 10, height: 0, borderTop: '2px solid var(--pl-on)' }} />
            </>
          )) : null}
          {g ? <Contact x={g.contact.x} y={g.contact.y} /> : null}
          {hand && m && m.pull > 0 ? <span style={{ position: 'absolute', left: hand.x - 5, top: hand.y - 5, width: 10, height: 10, borderRadius: '50%', background: hue(!elastic), boxShadow: '0 0 0 1.5px #fff' }} /> : null}
          {m && m.pull > 0 ? <Tag x={W + 28} y={(reach + limit) / 2} off={!elastic}>{!elastic ? `0 of ${Math.round(m.pull)}px · dead` : `gave ${Math.round(m.gave)} of ${Math.round(m.pull)}px`}</Tag> : null}
        </div>
      </MarksLayer>
    </div>
  );
}
PlaceSheet.names = ['Clamped', 'Rubber-band'];
PlaceSheet.lesson = {
  why: 'A sheet clamped at the ends of its travel stops dead under a finger that keeps going, at the top and at the bottom: the hand moves, the thing doesn’t, and it feels broken or stuck rather than finished.',
  habit: 'Past a limit, follow the pointer less and less, then spring back on release.',
};
