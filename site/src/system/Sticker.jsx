/* ─────────────────────────────────────────────────────────
 * STICKERS — die-cut vinyl, drawn in SVG (site/HOMEPAGE.md §3.2)
 *
 * Each sticker's shape carries its message, so it reads with the label covered:
 *   OffBy     a callout tag whose tail points at the drifted part   → flips to its green back, "✓ gap-3"
 *   Seal      an inspection seal ringed with ruler ticks, one tick out of line, the count inside
 *   Shipping  a parcel tag with a punch hole: what ships
 *   Badge     the CI status badge from a README: plumb | 0 new drift. Only new drift fails
 *
 * STORYBOARD (every sticker)
 *    enter   slaps on: scale 1.35 → 1, squashes on impact (x 1.08 / y 0.9), recovers; 420ms
 *    hover   the vinyl sheen follows the pointer; the corner nearest the pointer peels: the lifted part of the
 *            sticker folds back across a crease on `settle`, showing its back with curl shading, casting a shadow
 *    drag    lifts (shadow deepens, scale 1.06) and tilts with the hand's velocity; on release snaps home on `pop`
 *    flip    `flipped` turns it over (rotateY 180°, 320ms); the back is the same die-cut, a new face
 *
 *  border: the shape's own outline, stroked white beneath it, so the die-cut follows every notch
 *  reduced motion: no slap, peel or tilt; the sticker is simply there, still draggable
 * ───────────────────────────────────────────────────────── */
import { useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useSpring, useTransform, useVelocity } from 'motion/react';
import { SPRING } from '../site/motion.js';
import { useTune } from '../site/tune.js';

export const STICKER = {
  cut: 4, // px of white die-cut border around the shape
  peel: 18, // px the hovered corner folds back
  slap: { from: 1.35, squashX: 1.08, squashY: 0.9, duration: 0.42 }, // landing
  lift: 1.06, // scale while held
  tiltPerVelocity: 0.012, // degrees of tilt per px/s while dragged
  flip: 0.32, // seconds to turn over
  shadow: 'drop-shadow(0 1px 0 rgb(0 0 0 / .1)) drop-shadow(0 6px 10px rgb(16 24 40 / .28))',
  shadowHeld: 'drop-shadow(0 1px 0 rgb(0 0 0 / .1)) drop-shadow(0 18px 22px rgb(16 24 40 / .32))',
};

let uid = 0;

/* ── the die-cut: shape, border, sheen, and a real peel ─── */
// A peel is a fold. The part of the sticker beyond the fold line is cut away, and that same part, mirrored across the
// fold line, is drawn as the sticker's back: the flap is exactly the shape that lifted, border and all. Shading across
// the flap makes it a curl rather than a crease, and the flap casts a soft shadow onto the sticker underneath.
function foldGeometry({ w, h, pad, d, corner }) {
  const { sx, sy } = corner; // +1/-1: which corner (right/left, bottom/top)
  const cx = sx > 0 ? w + pad : -pad;
  const cy = sy > 0 ? h + pad : -pad;
  const A = [cx - sx * d, cy];
  const B = [cx, cy - sy * d];
  const P = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
  const n = [sx / Math.SQRT2, sy / Math.SQRT2]; // unit normal, pointing at the corner
  const t = [-n[1], n[0]]; // along the fold line
  const L = 4000;
  // everything on the inside of the fold line
  const inside = [
    [P[0] + t[0] * L, P[1] + t[1] * L],
    [P[0] - t[0] * L, P[1] - t[1] * L],
    [P[0] - t[0] * L - n[0] * L, P[1] - t[1] * L - n[1] * L],
    [P[0] + t[0] * L - n[0] * L, P[1] + t[1] * L - n[1] * L],
  ]
    .map((q) => q.join(','))
    .join(' ');
  // and everything beyond it: the part that lifts
  const outside = [
    [P[0] + t[0] * L, P[1] + t[1] * L],
    [P[0] - t[0] * L, P[1] - t[1] * L],
    [P[0] - t[0] * L + n[0] * L, P[1] - t[1] * L + n[1] * L],
    [P[0] + t[0] * L + n[0] * L, P[1] + t[1] * L + n[1] * L],
  ]
    .map((q) => q.join(','))
    .join(' ');
  // reflection across the fold line, as an SVG matrix
  const k = 2 * (P[0] * n[0] + P[1] * n[1]);
  const matrix = `matrix(${1 - 2 * n[0] * n[0]} ${-2 * n[0] * n[1]} ${-2 * n[0] * n[1]} ${1 - 2 * n[1] * n[1]} ${k * n[0]} ${k * n[1]})`;
  // the curl's shading runs across the flap: crease at the fold line, tip one fold-depth inward
  const crease = P;
  // (drawn before the mirror, so the tip sits on the corner's side of the fold)
  const tipPre = [P[0] + n[0] * d * 0.75, P[1] + n[1] * d * 0.75];
  return { inside, outside, matrix, crease, tipPre, n };
}

function DieCut({ w, h, shape, fill, peel = 0, folded = 0, corner = { sx: 1, sy: -1 }, sheenX, children }) {
  const id = useRef(`st${++uid}`).current;
  const pad = STICKER.cut + 2;
  const W = w + pad * 2;
  const H = h + pad * 2;
  const d = peel ? folded : 0;
  const folding = d > 0.5;
  const g = folding ? foldGeometry({ w, h, pad, d, corner }) : null;
  const border = (
    <>
      <path d={shape} fill="#fff" stroke="#fff" strokeWidth={STICKER.cut * 2} strokeLinejoin="round" />
    </>
  );
  return (
    <svg width={W} height={H} viewBox={`${-pad} ${-pad} ${W} ${H}`} className="block overflow-visible">
      <defs>
        <linearGradient id={`${id}-sheen`} x1="0" x2="1" y1="0" y2="0.35">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.32" />
          <stop offset="0.56" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-shape`}>
          <path d={shape} />
        </clipPath>
        {folding && (
          <>
            <clipPath id={`${id}-inside`}>
              <polygon points={g.inside} />
            </clipPath>
            <clipPath id={`${id}-outside`}>
              <polygon points={g.outside} />
            </clipPath>
            {/* the sticker's whole die-cut silhouette, border included: nothing of the fold draws off the vinyl */}
            <mask id={`${id}-vinyl`} maskUnits="userSpaceOnUse" x={-pad} y={-pad} width={W} height={H}>
              <path d={shape} fill="#fff" stroke="#fff" strokeWidth={STICKER.cut * 2} strokeLinejoin="round" />
            </mask>
            {/* curl shading across the flap: shadowed in the crease, catching light toward the tip */}
            <linearGradient id={`${id}-curl-pre`} gradientUnits="userSpaceOnUse" x1={g.crease[0]} y1={g.crease[1]} x2={g.tipPre[0]} y2={g.tipPre[1]}>
              <stop offset="0" stopColor="#c9d0dc" />
              <stop offset="0.18" stopColor="#eef1f6" />
              <stop offset="0.55" stopColor="#ffffff" />
              <stop offset="1" stopColor="#e3e8f0" />
            </linearGradient>
            <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.4" />
            </filter>
          </>
        )}
      </defs>

      {/* the sticker, minus whatever has lifted */}
      <g clipPath={folding ? `url(#${id}-inside)` : undefined}>
        {border}
        <path d={shape} fill={fill} />
        {children}
        <g clipPath={`url(#${id}-shape)`}>
          <motion.rect x={-w} y={-h} width={w * 3} height={h * 3} fill={`url(#${id}-sheen)`} style={{ x: sheenX }} />
        </g>
      </g>

      {folding && (
        <g clipPath={`url(#${id}-inside)`}>
          {/* the flap's shadow on the sticker beneath it, pushed a little away from the crease */}
          <g mask={`url(#${id}-vinyl)`}>
            <g transform={`translate(${-g.n[0] * 2.5} ${-g.n[1] * 2.5})`} opacity="0.35" filter={`url(#${id}-soft)`}>
              <g transform={g.matrix}>
                <g clipPath={`url(#${id}-outside)`}>
                  <path d={shape} fill="#101828" stroke="#101828" strokeWidth={STICKER.cut * 2} strokeLinejoin="round" />
                </g>
              </g>
            </g>
          </g>
          {/* the flap: only the part beyond the fold, mirrored across it, showing its back */}
          <g transform={g.matrix}>
            <g clipPath={`url(#${id}-outside)`}>
              <path d={shape} fill={`url(#${id}-curl-pre)`} stroke={`url(#${id}-curl-pre)`} strokeWidth={STICKER.cut * 2} strokeLinejoin="round" />
            </g>
          </g>
        </g>
      )}
    </svg>
  );
}

/* ── behaviour shared by every sticker ──────────────────── */
function useStickerMotion({ peel }) {
  // `peel` is this sticker's fold depth in px (0 for none): enough to reach past its own rounded corners
  const reduce = useReducedMotion();
  const t = useTune('Sticker', { peel: [STICKER.peel, 0, 40], lift: [STICKER.lift, 1, 1.2], tilt: [STICKER.tiltPerVelocity, 0, 0.05], home: SPRING.pop });
  const x = useMotionValue(0);
  const vx = useVelocity(x);
  const dragTilt = useSpring(useTransform(vx, (v) => (reduce ? 0 : Math.max(-14, Math.min(14, v * t.tilt)))), SPRING.settle);
  const sheen = useMotionValue(-60);
  const sheenX = useSpring(sheen, { stiffness: 200, damping: 30 });
  const [folded, setFolded] = useState(0);
  const [corner, setCorner] = useState({ sx: 1, sy: -1 });
  const [held, setHeld] = useState(false);
  const foldRef = useRef(0);
  const anim = useRef(null);
  const fold = (to) => {
    if (!peel || reduce) return;
    anim.current?.stop(); // one fold at a time: a new target takes over from wherever the corner is
    anim.current = animate(foldRef.current, to, { ...SPRING.settle, onUpdate: (v) => ((foldRef.current = v), setFolded(v)) });
  };
  const bind = {
    onPointerMove: (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      sheen.set(((e.clientX - r.left) / r.width) * r.width * 1.2 - r.width * 0.6);
      // peel from whichever corner the pointer is nearest; switching corners lets the old one fall back first
      const next = { sx: e.clientX > r.left + r.width / 2 ? 1 : -1, sy: e.clientY > r.top + r.height / 2 ? 1 : -1 };
      if (next.sx !== corner.sx || next.sy !== corner.sy) {
        setCorner(next);
        anim.current?.stop();
        foldRef.current = 0;
        setFolded(0);
        fold(peel * (t.peel / STICKER.peel));
      }
    },
    onHoverStart: () => fold(peel * (t.peel / STICKER.peel)),
    onHoverEnd: () => fold(0),
    drag: true,
    dragSnapToOrigin: true,
    dragTransition: { bounceStiffness: t.home.stiffness, bounceDamping: t.home.damping },
    onDragStart: () => (setHeld(true), fold(0)),
    onDragEnd: () => setHeld(false),
    whileDrag: { scale: t.lift, cursor: 'grabbing' },
  };
  return { reduce, x, dragTilt, sheenX, folded, corner, peel, held, bind };
}

// The outer shell: slap-on, drag, tilt, shadow. `rest` is the resting tilt.
function Shell({ rest = -4, delay = 0, label, children, motionState, className = '', style }) {
  const { reduce, x, dragTilt, held, bind } = motionState;
  const s = STICKER.slap;
  const rotate = useTransform(dragTilt, (v) => rest + v);
  return (
    <motion.span
      role="img"
      aria-label={label}
      {...bind}
      initial={reduce ? false : { scaleX: s.from, scaleY: s.from, opacity: 0 }}
      animate={{ scaleX: [s.from, s.squashX, 0.98, 1], scaleY: [s.from, s.squashY, 1.02, 1], opacity: 1 }}
      transition={{ duration: reduce ? 0 : s.duration, times: [0, 0.55, 0.8, 1], delay, ease: 'easeOut' }}
      className={`inline-block cursor-grab touch-none select-none ${className}`}
      style={{ x, rotate, filter: held ? STICKER.shadowHeld : STICKER.shadow, transition: 'filter 200ms', ...style }}
    >
      {children}
    </motion.span>
  );
}

const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';

/* ── 1 · off by 3px: a callout tag pointing at the part ─── */
const TAG = { w: 150, h: 64 };
const tagShape = (w, h) => `M12 0 H${w - 12} Q${w} 0 ${w} 12 V${h - 22} Q${w} ${h - 10} ${w - 12} ${h - 10} H34 L18 ${h} L20 ${h - 10} H12 Q0 ${h - 10} 0 ${h - 22} V12 Q0 0 12 0 Z`;

export function OffBy({ px = 3, fix = 'gap-3', flipped = false, rest = -5, delay = 0, className, style }) {
  const m = useStickerMotion({ peel: 24 });
  const reduce = useReducedMotion();
  // a dimension mark: two end ticks and the span between them
  const dim = (
    <g stroke="#fff" strokeWidth="2" strokeLinecap="round">
      <path d="M14 22 V36 M30 22 V36 M14 29 H30" />
    </g>
  );
  const check = <path d="M13 29 L19 35 L31 22" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />;
  return (
    <Shell rest={rest} delay={delay} label={flipped ? `Fixed: ${fix}` : `Off by ${px}px`} motionState={m} className={className} style={style}>
      <motion.span className="relative block [perspective:700px]" initial={false}>
        <motion.span
          className="relative block [transform-style:preserve-3d]"
          initial={false}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: reduce ? 0 : STICKER.flip, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="block [backface-visibility:hidden]">
            <DieCut w={TAG.w} h={TAG.h} shape={tagShape(TAG.w, TAG.h)} fill="var(--destructive)" peel={m.peel} folded={m.folded} corner={m.corner} sheenX={m.sheenX}>
              {dim}
              <text x="40" y="34" fill="#fff" fontFamily={SANS} fontWeight="700" fontSize="17">
                off by {px}px
              </text>
            </DieCut>
          </span>
          <span className="absolute inset-0 block [backface-visibility:hidden]" style={{ transform: 'rotateY(180deg)' }}>
            <DieCut w={TAG.w} h={TAG.h} shape={tagShape(TAG.w, TAG.h)} fill="var(--success)" sheenX={m.sheenX}>
              {check}
              <text x="40" y="34" fill="#fff" fontFamily={MONO} fontWeight="700" fontSize="16">
                {fix}
              </text>
            </DieCut>
          </span>
        </motion.span>
      </motion.span>
    </Shell>
  );
}

/* ── 2 · 6 off the scale: an inspection seal ringed with the scale ── */
export function Seal({ count = 6, rest = 6, delay = 0, className, style }) {
  const m = useStickerMotion({ peel: 44 });
  const R = 52;
  const c = R;
  const ticks = Array.from({ length: 48 }, (_, i) => i);
  const off = 7; // the one tick out of line
  return (
    <Shell rest={rest} delay={delay} label={`${count} off the scale`} motionState={m} className={className} style={style}>
      <DieCut w={R * 2} h={R * 2} shape={`M${c} 0 A${R} ${R} 0 1 1 ${c - 0.01} 0 Z`} fill="#fff" peel={m.peel} folded={m.folded} corner={m.corner} sheenX={m.sheenX}>
        <circle cx={c} cy={c} r={R - 7} fill="none" stroke="var(--destructive)" strokeWidth="2" />
        {ticks.map((i) => {
          const a = (i / ticks.length) * Math.PI * 2;
          const long = i % 4 === 0;
          const r1 = R - 3;
          const r0 = r1 - (long ? 7 : 4);
          const shift = i === off ? 5 : 0;
          return <line key={i} x1={c + Math.cos(a) * (r0 + shift)} y1={c + Math.sin(a) * (r0 + shift)} x2={c + Math.cos(a) * (r1 + shift)} y2={c + Math.sin(a) * (r1 + shift)} stroke={i === off ? 'var(--destructive)' : '#9aa5b8'} strokeWidth={i === off ? 2.5 : 1.25} strokeLinecap="round" />;
        })}
        <text x={c} y={c + 4} textAnchor="middle" fill="var(--destructive)" fontFamily={SANS} fontWeight="800" fontSize="40" dominantBaseline="middle">
          {count}
        </text>
        {/* the legend curves along the inside of the ring, as on a real seal */}
        <path id={`seal-arc-${count}`} d={`M${c - (R - 19)} ${c} A${R - 19} ${R - 19} 0 0 0 ${c + (R - 19)} ${c}`} fill="none" />
        <text fill="#161d2b" fontFamily={SANS} fontWeight="700" fontSize="8.5" letterSpacing="0.12em">
          <textPath href={`#seal-arc-${count}`} startOffset="50%" textAnchor="middle">
            OFF THE SCALE
          </textPath>
        </text>
      </DieCut>
    </Shell>
  );
}

/* ── 3 · Ships 0 bytes to prod: a parcel tag ────────────── */
export function Shipping({ rest = -3, delay = 0, className, style }) {
  const m = useStickerMotion({ peel: 24 });
  const w = 176;
  const h = 64;
  const shape = `M20 0 H${w - 10} Q${w} 0 ${w} 10 V${h - 10} Q${w} ${h} ${w - 10} ${h} H20 L0 ${h - 18} V18 Z`;
  return (
    <Shell rest={rest} delay={delay} label="Ships 0 bytes to prod" motionState={m} className={className} style={style}>
      <DieCut w={w} h={h} shape={shape} fill="var(--primary)" peel={m.peel} folded={m.folded} corner={m.corner} sheenX={m.sheenX}>
        <circle cx="16" cy={h / 2} r="5" fill="#fff" />
        <circle cx="16" cy={h / 2} r="5" fill="none" stroke="rgb(0 0 0 / .15)" strokeWidth="1" />
        <text x="32" y="26" fill="#fff" fillOpacity="0.75" fontFamily={SANS} fontWeight="700" fontSize="10" letterSpacing="0.1em">
          SHIPS TO PRODUCTION
        </text>
        <text x="32" y="47" fill="#fff" fontFamily={MONO} fontWeight="700" fontSize="18">
          0 bytes
        </text>
      </DieCut>
    </Shell>
  );
}

/* ── 4 · plumb | 0 new drift: a CI status badge ────────── */
// The shields badge every engineer knows from a README. It carries the CI promise: with the baseline, the build
// stays green on a messy repo, and only drift a branch adds fails.
export function Badge({ label = 'plumb', value = '0 new drift', rest = 3, delay = 0, className, style }) {
  const m = useStickerMotion({ peel: 22 });
  const left = 74;
  const w = 196;
  const h = 44;
  const shape = `M10 0 H${w - 10} Q${w} 0 ${w} 10 V${h - 10} Q${w} ${h} ${w - 10} ${h} H10 Q0 ${h} 0 ${h - 10} V10 Q0 0 10 0 Z`;
  return (
    <Shell rest={rest} delay={delay} label={`${label}: ${value}`} motionState={m} className={className} style={style}>
      <DieCut w={w} h={h} shape={shape} fill="#3a4357" peel={m.peel} folded={m.folded} corner={m.corner} sheenX={m.sheenX}>
        <path d={`M${left} 0 H${w - 10} Q${w} 0 ${w} 10 V${h - 10} Q${w} ${h} ${w - 10} ${h} H${left} Z`} fill="var(--success)" />
        {/* the wrench, as the badge's logo: head with its jaw open at the top, then the handle */}
        <circle cx="16" cy="16" r="4.6" fill="#fff" />
        <rect x="14.3" y="10.6" width="3.4" height="5" rx="0.6" fill="#3a4357" />
        <rect x="14.6" y="19.5" width="2.8" height="12" rx="1.4" fill="#fff" />
        <text x="28" y="27" fill="#fff" fontFamily={SANS} fontWeight="700" fontSize="14">
          {label}
        </text>
        <text x={left + (w - left) / 2} y="27" textAnchor="middle" fill="#fff" fontFamily={MONO} fontWeight="700" fontSize="14">
          {value}
        </text>
      </DieCut>
    </Shell>
  );
}
