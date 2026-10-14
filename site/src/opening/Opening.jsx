/* ─────────────────────────────────────────────────────────
 * THE OPENING — your site, and a switch that shows it as its blueprint
 *
 * Site mode is the page as built. Blueprint mode is the same page, read for real: every part's box, padding, gap,
 * corner and type size measured from the live DOM and matched against this site's tokens (the resolver's recording,
 * docs/recordings/decisions.json). Where Plumb's plugin stamps the page, a part also knows the file and line it was
 * written at. Nothing in the blueprint is drawn by hand.
 *
 *  switch    Site / Blueprint in the nav, or B. A scan line crosses the page (SWEEP); the blue field is laid
 *            behind it, and each element re-inks as the line reaches it. Switching back runs it again.
 *  reading   outlines for every part; gaps hatched; anything off the scale lettered in the drift colour, always.
 *            Hover a part for its full reading: size, padding, gap, corner, type, each with its token and reason,
 *            and its source when the plugin is present.
 *  rulers    along the top, the container's real width in px, ticked every 10; down both sides, the page's y,
 *            moving as you scroll. All three mark where the pointer is.
 *  the card  built out of true; a numbered dot on each miss and a punch list under it. Set one true and the reading
 *            follows the spring as it moves.
 *  reduced motion: the mode changes at once; nothing sweeps
 * ───────────────────────────────────────────────────────── */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { SPRING } from '../site/motion.js';
import recording from '../docs/recordings/decisions.json';
import './opening.css';

const SWEEP = 700; // ms for the scan line to cross the page

// ── this site's tokens, by resolved px, from Plumb's resolver ──
const byPx = (family, prefix) =>
  new Map(
    recording.families[family]
      .filter((d) => d.name.startsWith(prefix) && !d.name.slice(prefix.length).includes('--') && !/shadow/.test(d.name) && /^-?[\d.]+px$/.test(d.resolved ?? ''))
      .map((d) => [parseFloat(d.resolved), { key: d.name.slice(prefix.length), why: d.reason }]),
  );
const TOKENS = { spacing: byPx('spacing', '--spacing-'), radius: byPx('radius', '--radius-'), text: byPx('type', '--text-') };
const tokenOf = (family, value) => TOKENS[family].get(Math.round(value * 100) / 100) ?? null;
const named = (v) => (v.prop === 'r' ? `rounded-${v.token.key}` : v.prop === 'text' ? `text-${v.token.key}` : `${v.prop}-${v.token.key}`);

// The card's six drifts: what was built, and the step the spec gives.
const DRIFTS = [
  { id: 'radius', label: 'Corner', built: 10, spec: 12, token: 'rounded-lg', why: 'cards and panels you hold' },
  { id: 'pad', label: 'Padding', built: 21, spec: 24, token: 'p-6', why: 'card padding' },
  { id: 'gap', label: 'Gap', built: 13, spec: 12, token: 'gap-3', why: 'related parts and compact controls' },
  { id: 'name', label: 'Name size', built: 15, spec: 14, token: 'text-sm', why: 'captions, controls, code in running text' },
  { id: 'bx', label: 'Button padding', built: 15, spec: 16, token: 'px-4', why: null },
  { id: 'br', label: 'Button corner', built: 3, spec: 5, token: 'rounded-sm', why: 'chips, keys, small controls' },
];
const px = (v) => useTransform(v, (x) => `${x}px`);

export function Opening() {
  const reduce = useReducedMotion();
  const [mode, setMode] = useState('site');
  const root = useRef(null);
  const sweep = useMotionValue(0); // 0 → 100 as the scan line crosses
  const [sweeping, setSweeping] = useState(false);
  const blueprint = mode === 'blueprint';

  const flip = useCallback(() => {
    const next = mode === 'site' ? 'blueprint' : 'site';
    const r = root.current.getBoundingClientRect();
    // each element re-inks as the line reaches its middle: left to right into the blueprint, right to left back out
    root.current.querySelectorAll('*').forEach((el) => {
      const b = el.getBoundingClientRect();
      const at = (b.left + b.width / 2 - r.left) / r.width; // 0 at the left edge, 1 at the right
      el.style.setProperty('--develop', reduce ? '0ms' : `${Math.round((next === 'blueprint' ? at : 1 - at) * SWEEP)}ms`);
    });
    setMode(next);
    if (reduce) return;
    setSweeping(true);
    sweep.set(0);
    animate(sweep, 100, { duration: SWEEP / 1000, ease: [0.45, 0, 0.55, 1], onComplete: () => setSweeping(false) });
  }, [mode, reduce]);

  useEffect(() => {
    const key = (e) => {
      if (e.key.toLowerCase() !== 'b' || e.metaKey || e.ctrlKey || e.altKey || /input|textarea/i.test(e.target.tagName)) return;
      flip();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [flip]);

  // into the blueprint the line runs left to right and lays the field behind it; back out it runs right to left
  // and takes the field with it
  const field = useTransform(sweep, (p) => (blueprint ? `inset(0 ${100 - p}% 0 0)` : `inset(0 ${p}% 0 0)`));
  const line = useTransform(sweep, (p) => `${blueprint ? p : 100 - p}%`);

  return (
    <section ref={root} data-mode={mode} className="relative isolate min-h-svh overflow-hidden bg-card font-display text-foreground">
      {/* the blueprint field, laid behind the scan line */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-blueprint bg-[linear-gradient(var(--trace)_1px,transparent_1px),linear-gradient(90deg,var(--trace)_1px,transparent_1px)] bg-[size:8px_8px]"
        style={{ clipPath: sweeping ? field : blueprint ? 'inset(0 0 0 0)' : 'inset(0 0 0 100%)' }}
      />
      {sweeping && <motion.span aria-hidden="true" className="pointer-events-none absolute inset-y-0 z-30 w-px bg-blueprint-ink shadow-[0_0_24px_4px_rgb(255_255_255/0.6)]" style={{ left: line }} />}

      <SideRulers />

      <div className="relative mx-auto flex min-h-svh max-w-[75rem] flex-col px-12">
        <nav className="flex h-16 items-center justify-between">
          <span className="text-lg font-semibold">Plumb</span>
          <span className="flex items-center gap-6 text-sm">
            <a href="/docs/quick-start">Docs</a>
            <a href="https://github.com/unlocalhosted/plumb">GitHub</a>
            <ModeSwitch mode={mode} onFlip={flip} />
          </span>
        </nav>
        <TopRuler />

        <div className="grid flex-1 grid-cols-12 items-center gap-6 py-16">
          <div className="col-span-12 flex flex-col gap-6 md:col-span-6">
            <h1 className="text-5xl leading-none font-semibold text-balance">
              Plumb sets your UI <span className="text-muted-foreground">true to its design system.</span>
            </h1>
            <p className="max-w-[32rem] text-lg text-muted-foreground">
              It reads your tokens and the reasons behind them, measures every value you ship against them, and fixes what’s off, right on the page.
            </p>
            <code data-solid className="inline-flex w-fit items-center gap-3 rounded-md bg-foreground px-4 py-2 font-mono text-sm text-background">
              <span className="opacity-50 select-none">$</span> npx @unlocalhosted/plumb
            </code>
          </div>
          <div className="col-span-12 flex justify-center md:col-span-5 md:col-start-8">
            <Card />
          </div>
        </div>
      </div>

      <Reading root={root} active={blueprint} clip={sweeping ? field : undefined} />
    </section>
  );
}

// ── the switch ──
function ModeSwitch({ mode, onFlip }) {
  return (
    <button type="button" role="switch" aria-checked={mode === 'blueprint'} aria-label="Blueprint mode" onClick={onFlip} className="relative flex items-center rounded-full bg-tint-1 p-0.5 font-mono text-xs">
      {['site', 'blueprint'].map((m) => (
        <span key={m} className="relative px-3 py-1">
          {mode === m && <motion.span layoutId="mode-pill" transition={SPRING.snap} className="absolute inset-0 rounded-full bg-card shadow-plate" />}
          <span className="relative capitalize">{m}</span>
        </span>
      ))}
      <kbd className="mr-2 ml-1.5 text-muted-foreground">B</kbd>
    </button>
  );
}

// ── rulers ──────────────────────────────────────────────
function usePointer() {
  const [p, setP] = useState(null);
  useEffect(() => {
    const move = (e) => setP({ x: e.clientX, y: e.clientY });
    const leave = () => setP(null);
    window.addEventListener('pointermove', move);
    document.documentElement.addEventListener('pointerleave', leave);
    return () => (window.removeEventListener('pointermove', move), document.documentElement.removeEventListener('pointerleave', leave));
  }, []);
  return p;
}

// Along the top of the content: its real width, ticked every 10px from its left edge.
function TopRuler() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  const [left, setLeft] = useState(0);
  const p = usePointer();
  useLayoutEffect(() => {
    const ro = new ResizeObserver(() => {
      const r = ref.current.getBoundingClientRect();
      setW(Math.round(r.width));
      setLeft(r.left);
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  const at = p ? Math.round(p.x - left) : null;
  return (
    <div ref={ref} aria-hidden="true" className="relative h-6 text-muted-foreground select-none">
      <span className="absolute inset-x-0 top-0 h-px bg-current opacity-40" />
      <span className="absolute inset-x-0 top-0 h-1.5 bg-[repeating-linear-gradient(90deg,currentColor_0_1px,transparent_1px_10px)] opacity-35" />
      <span className="absolute inset-x-0 top-0 h-2.5 bg-[repeating-linear-gradient(90deg,currentColor_0_1px,transparent_1px_50px)] opacity-50" />
      {Array.from({ length: Math.floor(w / 100) + 1 }, (_, k) => (
        <span key={k} className="absolute top-3 font-mono text-2xs leading-none tabular-nums" style={{ left: k * 100 + 3 }}>
          {k * 100}
        </span>
      ))}
      <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-card px-2 font-mono text-2xs text-foreground tabular-nums">{w} px · 1:1</span>
      {at !== null && at >= 0 && at <= w && (
        <span className="absolute top-0 h-4 w-px bg-destructive" style={{ left: at }}>
          <span className="absolute top-4 left-1 font-mono text-2xs text-destructive tabular-nums">{at}</span>
        </span>
      )}
    </div>
  );
}

// Down both edges of the window: the page's y, ticked every 10px, moving as the page scrolls.
function SideRulers() {
  const p = usePointer();
  const [y, setY] = useState(0);
  const [h, setH] = useState(0);
  useEffect(() => {
    const on = () => (setY(window.scrollY), setH(window.innerHeight));
    on();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => (window.removeEventListener('scroll', on), window.removeEventListener('resize', on));
  }, []);
  const first = Math.floor(y / 100);
  const labels = Array.from({ length: Math.ceil(h / 100) + 2 }, (_, k) => (first + k) * 100);
  return ['left', 'right'].map((side) => {
    const inner = side === 'left' ? 'right-0' : 'left-0';
    return (
      <div key={side} aria-hidden="true" className={`pointer-events-none fixed inset-y-0 z-20 w-7 text-muted-foreground select-none ${side === 'left' ? 'left-0' : 'right-0'}`}>
        <span className={`absolute inset-y-0 w-px bg-current opacity-40 ${inner}`} />
        <span className={`absolute inset-y-0 w-1.5 bg-[repeating-linear-gradient(0deg,currentColor_0_1px,transparent_1px_10px)] opacity-35 ${inner}`} style={{ backgroundPositionY: -y }} />
        {labels.map((v) => (
          <span key={v} className={`absolute font-mono text-2xs leading-none tabular-nums [writing-mode:vertical-rl] ${side === 'left' ? 'right-3' : 'left-3'}`} style={{ top: v - y + 3 }}>
            {v}
          </span>
        ))}
        {p && (
          <span className={`absolute h-px w-4 bg-destructive ${inner}`} style={{ top: p.y }}>
            <span className={`absolute top-1 font-mono text-2xs text-destructive tabular-nums [writing-mode:vertical-rl] ${inner}`}>{Math.round(p.y + y)}</span>
          </span>
        )}
      </div>
    );
  });
}

// ── the reading: what's on screen, measured ──
const CAP = 160; // parts read at most, so a big page stays quick

// Every part of the page with its box and the values a design system decides, each matched to a token.
function readPage(root) {
  const rr = root.getBoundingClientRect();
  const stamped = root.querySelectorAll('[data-plumb-source]');
  const els = [...(stamped.length ? stamped : root.querySelectorAll('*'))].filter((el) => !el.closest('[data-reading], [data-reading-skip], [aria-hidden="true"]')).slice(0, CAP);
  const parts = [];
  for (const el of els) {
    const b = el.getBoundingClientRect();
    if (b.width < 2 || b.height < 2) continue;
    const cs = getComputedStyle(el);
    const box = { x: b.left - rr.left, y: b.top - rr.top, w: b.width, h: b.height };
    const drawn = el.hasAttribute('data-solid') || cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(cs.borderTopWidth) > 0 || cs.boxShadow !== 'none';
    const part = { el, box, source: el.dataset.plumbSource?.split('#')[0], tag: el.tagName.toLowerCase(), values: [] };
    // padding, on anything drawn
    const pads = ['Top', 'Right', 'Bottom', 'Left'].map((s) => parseFloat(cs[`padding${s}`]));
    if (drawn && pads.some((v) => v > 0)) {
      const same = pads.every((v) => v === pads[0]);
      const sets = same ? [['p', pads[0]]] : [['px', pads[1]], ['py', pads[0]]];
      const mid = box.y + box.h / 2;
      for (const [prop, v] of sets)
        if (v > 0)
          part.values.push({
            family: 'spacing',
            prop,
            v,
            token: tokenOf('spacing', v),
            mark: prop === 'py' ? { kind: 'v', x: box.x + box.w / 2, y1: box.y, y2: box.y + v } : { kind: 'h', x1: box.x, x2: box.x + (prop === 'px' ? pads[3] : v), y: mid, under: box.h < 48 ? box.y + box.h + 12 : null },
          });
    }
    // the gaps between a row's children
    const g = parseFloat(cs.columnGap);
    if (/flex/.test(cs.display) && cs.flexDirection !== 'column' && g > 0) {
      const kids = [...el.children].map((c) => c.getBoundingClientRect()).filter((k) => k.width > 0);
      if (kids.length > 1) {
        part.gaps = kids.slice(1).map((k, i) => ({ x: kids[i].right - rr.left, w: k.left - kids[i].right, y: Math.min(kids[i].top, k.top) - rr.top, h: Math.max(kids[i].bottom, k.bottom) - Math.min(kids[i].top, k.top) }));
        const first = part.gaps[0];
        part.values.push({ family: 'spacing', prop: 'gap', v: g, token: tokenOf('spacing', g), mark: { kind: 'h', x1: first.x, x2: first.x + first.w, y: first.y - 7 } });
      }
    }
    // the corner, on anything drawn
    const rad = parseFloat(cs.borderTopLeftRadius);
    if (drawn && rad > 0) {
      const full = rad >= Math.min(b.width, b.height) / 2;
      part.values.push({ family: 'radius', prop: 'r', v: rad, token: full ? { key: 'full', why: null } : tokenOf('radius', rad), mark: full ? null : { kind: 'arc', x: box.x, y: box.y, r: rad } });
    }
    // the type size, on anything that holds its own words
    const words = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
    if (words) {
      const fs = parseFloat(cs.fontSize);
      const range = document.createRange();
      range.selectNodeContents(words);
      const t = range.getClientRects()[0];
      part.values.push({ family: 'text', prop: 'text', v: fs, token: tokenOf('text', fs), mark: t && { kind: 'type', x: t.right - rr.left + 4, y1: t.top - rr.top + 2, y2: t.bottom - rr.top - 2 } });
    }
    part.drawn = drawn;
    parts.push(part);
  }
  return parts;
}

// A value's mark, drawn where the value is: a dimension across a gap or a padding, an arc traced on a corner, a
// bracket the height of the words. Off the scale in the drift colour; on the scale, in white, only for the part
// you're pointing at. The number is lettered beside its mark, haloed against the blue; if it's wider than the length
// it measures, a small control's label drops under it on a short leader; a larger part's moves before the mark.
const TICK = 3;
function Measure({ v }) {
  const m = v.mark;
  if (!m) return null;
  const ink = v.token ? 'var(--blueprint-ink)' : 'var(--blueprint-redline)';
  const text = `${v.prop} ${Math.round(v.v * 10) / 10}`;
  const halo = { paintOrder: 'stroke', stroke: 'var(--blueprint)', strokeWidth: 3, strokeLinejoin: 'round' };
  const letter = { fill: ink, fontSize: 'var(--text-2xs)', fontFamily: 'var(--font-mono)', ...halo };
  const wide = text.length * 6 + 4;
  if (m.kind === 'h') {
    const len = m.x2 - m.x1;
    return (
      <g stroke={ink} strokeWidth="1">
        <line x1={m.x1} y1={m.y} x2={m.x2} y2={m.y} />
        <line x1={m.x1} y1={m.y - TICK} x2={m.x1} y2={m.y + TICK} />
        <line x1={m.x2} y1={m.y - TICK} x2={m.x2} y2={m.y + TICK} />
        {len >= wide ? (
          <text x={(m.x1 + m.x2) / 2} y={m.y - 5} textAnchor="middle" style={letter}>
            {text}
          </text>
        ) : m.under ? (
          <>
            <line x1={m.x1} y1={m.y + TICK} x2={m.x1} y2={m.under - 9} strokeOpacity="0.6" />
            <text x={m.x1} y={m.under} style={letter}>
              {text}
            </text>
          </>
        ) : (
          <text x={m.x1 - 5} y={m.y + 3.5} textAnchor="end" style={letter}>
            {text}
          </text>
        )}
      </g>
    );
  }
  if (m.kind === 'v')
    return (
      <g stroke={ink} strokeWidth="1">
        <line x1={m.x} y1={m.y1} x2={m.x} y2={m.y2} />
        <line x1={m.x - TICK} y1={m.y1} x2={m.x + TICK} y2={m.y1} />
        <line x1={m.x - TICK} y1={m.y2} x2={m.x + TICK} y2={m.y2} />
        <text x={m.x + 6} y={(m.y1 + m.y2) / 2 + 3.5} style={letter}>
          {text}
        </text>
      </g>
    );
  if (m.kind === 'arc') {
    const k = 1 - Math.SQRT1_2; // where the arc crosses its diagonal
    const ax = m.x + m.r * k;
    const ay = m.y + m.r * k;
    return (
      <g stroke={ink} strokeWidth="1" fill="none">
        <path d={`M${m.x} ${m.y + m.r} A${m.r} ${m.r} 0 0 1 ${m.x + m.r} ${m.y}`} strokeWidth="1.5" />
        <line x1={ax} y1={ay} x2={m.x - 10} y2={m.y - 10} />
        <text x={m.x - 13} y={m.y - 12} textAnchor="end" style={letter}>
          {text}
        </text>
      </g>
    );
  }
  return (
    <g stroke={ink} strokeWidth="1">
      <line x1={m.x} y1={m.y1} x2={m.x} y2={m.y2} />
      <line x1={m.x - 2} y1={m.y1} x2={m.x} y2={m.y1} />
      <line x1={m.x - 2} y1={m.y2} x2={m.x} y2={m.y2} />
      <text x={m.x + 4} y={(m.y1 + m.y2) / 2 + 3.5} style={letter}>
        {text}
      </text>
    </g>
  );
}

function Reading({ root, active, clip }) {
  const [parts, setParts] = useState([]);
  const [hot, setHot] = useState(null);
  // read the page continuously while it's shown, so the drawing follows anything that moves
  useEffect(() => {
    if (!active) return setParts([]);
    const el = root.current;
    let raf;
    let last = 0;
    let latest = [];
    const tick = (t) => {
      if (t - last > 80) {
        last = t;
        latest = readPage(el);
        setParts(latest);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const move = (e) => {
      const rr = el.getBoundingClientRect();
      const x = e.clientX - rr.left;
      const y = e.clientY - rr.top;
      const hits = latest.filter((p) => p.values.length && x >= p.box.x && x <= p.box.x + p.box.w && y >= p.box.y && y <= p.box.y + p.box.h);
      setHot(hits.sort((a, b) => a.box.w * a.box.h - b.box.w * b.box.h)[0]?.el ?? null);
    };
    el.addEventListener('pointermove', move);
    return () => (cancelAnimationFrame(raf), el.removeEventListener('pointermove', move), setHot(null));
  }, [active]);

  if (!active) return null;
  const hotPart = parts.find((p) => p.el === hot);
  const gapOf = (p) => p.values.find((v) => v.prop === 'gap');
  return (
    <motion.div data-reading aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 font-mono text-2xs leading-none" style={{ clipPath: clip }}>
      <svg className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <pattern id="gap-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="5" stroke="var(--blueprint-line)" strokeWidth="1" />
          </pattern>
        </defs>
        {parts.map((p, i) => (
          <g key={i}>
            {(p.drawn || p.gaps || p.el === hot) && <rect x={p.box.x + 0.5} y={p.box.y + 0.5} width={Math.max(0, p.box.w - 1)} height={Math.max(0, p.box.h - 1)} fill="none" stroke="var(--blueprint-ink)" strokeOpacity={p.el === hot ? 0.9 : 0.2} strokeDasharray={p.el === hot ? undefined : '3 3'} />}
            {p.gaps?.map((g, k) => (
              <rect key={k} x={g.x} y={g.y} width={Math.max(0, g.w)} height={g.h} fill="url(#gap-hatch)" opacity={gapOf(p).token ? 0.6 : 1} stroke={gapOf(p).token ? 'none' : 'var(--blueprint-redline)'} />
            ))}
          </g>
        ))}
      </svg>
      {/* measurements: off the scale always; on the scale for the part you're pointing at */}
      <svg className="absolute inset-0 h-full w-full overflow-visible">
        {parts.flatMap((p, i) => p.values.filter((v) => !v.token || p.el === hot).map((v, k) => <Measure key={`${i}-${k}`} v={v} />))}
      </svg>
      {/* hover: the part's full reading */}
      {hotPart && (
        <div className="absolute w-64 rounded-md bg-[var(--blueprint-ink)] p-3 text-[var(--blueprint)] shadow-lift" style={{ left: Math.max(8, Math.min(hotPart.box.x, hotPart.box.x + hotPart.box.w - 256)), top: hotPart.box.y + hotPart.box.h + 10 }}>
          <div className="flex justify-between">
            <span className="font-semibold">{hotPart.tag}</span>
            <span className="tabular-nums">
              {Math.round(hotPart.box.w)} × {Math.round(hotPart.box.h)}
            </span>
          </div>
          {hotPart.source && <div className="mt-1 truncate opacity-70">{hotPart.source}</div>}
          <div className="mt-2 flex flex-col gap-1">
            {hotPart.values.map((v, k) => (
              <div key={k} className="flex justify-between gap-3">
                <span className="tabular-nums">
                  {v.prop} {Math.round(v.v * 10) / 10}
                </span>
                <span className={v.token ? '' : 'font-semibold text-destructive'}>{v.token ? named(v) : 'off the scale'}</span>
              </div>
            ))}
          </div>
          {hotPart.values.find((v) => v.token?.why) && <div className="mt-2 font-display text-xs opacity-80">{hotPart.values.find((v) => v.token?.why).token.why}</div>}
        </div>
      )}
    </motion.div>
  );
}

// ── the card, built out of true; a numbered dot on every miss, and the punch list under it ──
function Card() {
  const reduce = useReducedMotion();
  const v = Object.fromEntries(DRIFTS.map((d) => [d.id, useMotionValue(d.built)]));
  const [fixed, setFixed] = useState({});
  const [hot, setHot] = useState(null);
  const fix = (d) => {
    if (fixed[d.id]) return;
    animate(v[d.id], d.spec, reduce ? { duration: 0 } : SPRING.detent);
    setFixed((f) => ({ ...f, [d.id]: true }));
  };
  const left = DRIFTS.filter((d) => !fixed[d.id]).length;
  const dot = (id, place) => {
    const n = DRIFTS.findIndex((d) => d.id === id);
    return <Dot n={n} d={DRIFTS[n]} done={fixed[id]} hot={hot === id} onHot={setHot} onFix={fix} className={place} />;
  };

  return (
    <div className="flex w-full max-w-[23rem] flex-col gap-6">
      <motion.article className="relative border border-border bg-card shadow-lift" style={{ borderRadius: px(v.radius), padding: px(v.pad) }}>
        <motion.header className="relative flex items-center" style={{ columnGap: px(v.gap) }}>
          <span data-solid className="grid size-12 shrink-0 place-items-center rounded-full bg-tint-2 font-mono text-sm text-primary">
            AL
          </span>
          <span className="relative flex min-w-0 flex-col">
            <motion.span className="relative w-fit font-medium" style={{ fontSize: px(v.name) }}>
              Ada Lovelace
              {dot('name', '-right-5 top-0')}
            </motion.span>
            <span className="text-sm text-muted-foreground">Analyst, Engine No. 1</span>
          </span>
          {dot('gap', 'left-[3.1rem] -top-5')}
        </motion.header>
        <p className="mt-4 text-sm text-muted-foreground">Writes the notes that turn a machine for numbers into a machine for anything.</p>
        <div className="mt-5 flex items-center gap-2">
          <span className="relative">
            <motion.span data-solid className="block bg-primary py-1.5 text-sm font-semibold text-primary-foreground" style={{ paddingInline: px(v.bx), borderRadius: px(v.br) }}>
              Follow
            </motion.span>
            {dot('bx', '-left-2 -bottom-5')}
            {dot('br', '-right-2 -top-2')}
          </span>
          <motion.span className="block border border-border py-1.5 text-sm font-semibold" style={{ paddingInline: px(v.bx), borderRadius: px(v.br) }}>
            Message
          </motion.span>
        </div>
        {dot('pad', '-left-2 top-[2.4rem]')}
        {dot('radius', '-left-2 -top-2')}
      </motion.article>

      <div data-reading-skip className="flex flex-col gap-3">
        <p className="font-mono text-xs" aria-live="polite">
          {left ? (
            <>
              <span className="text-destructive">{left} out of true.</span> <span className="text-muted-foreground">Set each to its token.</span>
            </>
          ) : (
            <>
              <span className="text-primary">All true.</span> <span className="text-muted-foreground">Every value is one of your tokens.</span>
            </>
          )}
        </p>
        <ol className="flex flex-col border-t border-border">
          {DRIFTS.map((d, n) => {
            const done = fixed[d.id];
            return (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => fix(d)}
                  onPointerEnter={() => setHot(d.id)}
                  onPointerLeave={() => setHot(null)}
                  onFocus={() => setHot(d.id)}
                  onBlur={() => setHot(null)}
                  disabled={done}
                  className={`grid w-full grid-cols-[1.25rem_6.5rem_4.5rem_1fr] items-baseline gap-2 border-b border-border py-1.5 text-left text-xs outline-none focus-visible:bg-tint-1 ${hot === d.id && !done ? 'bg-tint-1' : ''}`}
                >
                  <span className={`font-mono ${done ? 'text-primary' : 'text-destructive'}`}>{done ? '✓' : n + 1}</span>
                  <span className={done ? 'text-muted-foreground' : 'text-foreground'}>{d.label}</span>
                  <span className="font-mono tabular-nums">
                    <span className={done ? 'text-muted-foreground line-through' : 'text-destructive'}>{d.built}</span>
                    <span className="text-muted-foreground"> → </span>
                    <span className={done ? 'text-primary' : 'text-foreground'}>{d.spec}</span>
                  </span>
                  <span className="truncate font-mono text-muted-foreground">
                    <span className={done ? 'text-primary' : 'text-foreground'}>{d.token}</span>
                    {d.why ? ` · ${d.why}` : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function Dot({ n, d, done, hot, onHot, onFix, className }) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      data-reading-skip
      onClick={() => onFix(d)}
      onPointerEnter={() => onHot(d.id)}
      onPointerLeave={() => onHot(null)}
      aria-label={done ? `${d.label}: ${d.token}` : `${d.label} is ${d.built}px, off spec. Set it to ${d.token}, ${d.spec}px.`}
      className={`absolute z-10 grid size-4 place-items-center rounded-full font-mono text-2xs [[data-mode=blueprint]_&]:hidden leading-none font-semibold text-primary-foreground outline-none ${done ? 'bg-primary' : 'bg-destructive'} ${className}`}
      initial={reduce ? false : { scale: 0 }}
      animate={{ scale: hot ? 1.3 : 1, opacity: done ? 0 : 1 }}
      transition={done ? { opacity: { delay: 0.9, duration: 0.5 } } : { ...SPRING.pop, delay: reduce || hot ? 0 : 0.4 + n * 0.12 }}
    >
      {done ? '✓' : n + 1}
    </motion.button>
  );
}
