/* ─────────────────────────────────────────────────────────
 * WRENCH — the React Plumber's buddy (site/HOMEPAGE.md §3.3)
 *
 * CONCEPT
 *   object     an adjustable wrench standing on the end of its handle: a fixed jaw, a movable jaw that clicks along
 *              a knurled worm, an I-beam handle with a hang hole. Two dot eyes on the head. No mouth, no limbs.
 *   the nut    is the drift. It arrives red (off the scale) and leaves green (seated). Everything he does is about it.
 *   verbs      the wrench's own, and nothing else:
 *                measure   his jaw clicks open to size something up
 *                fit       the jaw clicks shut, step by step, until it bites: an off-size value snapping to the scale
 *                turn      he turns round the nut, not round himself: the handle sweeps, the nut goes with it
 *                release   the jaw lets go and he swings back for the next one
 *   invariant  a turn only ever happens with a nut in his jaw; the nut only turns while gripped; he only moves for
 *              a reason. Between reasons he stands still, and only his eyes live.
 *   rejected   flips, spins, hops for joy, sparkles, idle sway, a ratchet with nothing in it.
 *
 * STORYBOARD — one fix (each `cheer`, or a click on him)
 *      0ms   the jaw clicks wide open (5 detents, fast); a red nut drops into it from above
 *    260ms   the jaw clicks shut, one detent at a time, until it bites the nut; the head flexes on the bite
 *    520ms   eyes squint; he turns 60° round the nut on `turn`, the nut turning with him and going green
 *    900ms   (the last fix only) torque: he leans his weight in, 6° more, and holds 140ms
 *   1000ms   release: the jaw clicks open two detents; he swings back upright (the nut, a hex, sits square again)
 *   1260ms   the nut lifts out, done; the jaw clicks shut. Eyes open, or close happy if that was the last.
 *
 * STATES
 *   idle      still. Eyes follow your pointer; blinks every 4–7s.
 *   hover     his jaw clicks open three detents: ready to grip. Leave, and it clicks shut.
 *   worried   there's drift: eyes go to it (the target, or down-right). Every 2.6–4.2s he measures: the jaw
 *             clicks open, holds 300ms, clicks shut.
 *   content   no drift left: eyes closed in two happy arcs; still.
 *   reduced motion: no turning or clicking; the nut appears seated and green; eyes still act.
 * ───────────────────────────────────────────────────────── */
import { useEffect, useId, useRef, useState } from 'react';
import { animate, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { useTune } from '../site/tune.js';
import { SPRING } from '../site/motion.js';

export const WRENCH = {
  detent: 0.5, // units the jaw moves per click of the worm: small, so it never slides far past the head
  click: 55, // ms per detent when fitting
  quick: 30, // ms per detent when opening wide for a nut
  turn: 60, // degrees per turn: one hex flat, so the nut sits square again after
  torque: 6, // extra degrees on the last fix
  turnSpring: SPRING.turn,
  measure: { open: 4, hold: 300, every: [2600, 4200] }, // detents
  ready: 3, // detents on hover
  blink: [4000, 7000],
  blinkFor: 90,
  gaze: 1.2,
};

// Drawn round the head's centre at (0, 0); the handle runs down to its foot at (0, foot).
// Compact (the title strip, ~40px tall) keeps the head and face the same and shortens the handle, with bigger eyes,
// so the face still reads when he's small.
const BUILD = { full: { foot: 50, eye: 1 }, compact: { foot: 30, eye: 1.4 } };
const JAW = { fixed: -4.2, movable: 4.6 }; // the inner faces of the two jaws at rest (x)
const NUT = { y: -9.2, flats: 9.2 }; // the nut sits in the jaw; across its flats it's one detent wider than shut
const BITE = Math.round((NUT.flats - (JAW.movable - JAW.fixed)) / WRENCH.detent); // detents open when it bites
const nutX = (jaw) => (JAW.fixed + JAW.movable + jaw) / 2; // the nut centres between the jaws

const INK = { dark: '#16309c', base: '#2f5be0', light: '#a6b9ff', steelDark: '#8e9ab3' };
const NUT_INK = { loose: '#e5484d', tight: '#22a35a' };

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const hex = (r) =>
  [90, 30, -30, -90, -150, 150].map((a) => `${(r * Math.cos((a * Math.PI) / 180)).toFixed(2)},${(-r * Math.sin((a * Math.PI) / 180)).toFixed(2)}`).join(' ');

/**
 * @param mood    'idle' | 'worried' | 'content'
 * @param cheer   bump once per fix: he fits and turns a nut
 * @param target  an element to watch (the drift), optional
 * @param compact a shorter handle and bigger eyes, for small sizes
 */
export function Wrench({ mood = 'idle', cheer = 0, target = null, scale = 1, compact = false, className = '' }) {
  const { foot: FOOT, eye } = compact ? BUILD.compact : BUILD.full;
  const reduce = useReducedMotion();
  const id = useId().replace(/:/g, '');
  const t = useTune('Wrench', { turn: [WRENCH.turn, 30, 90], click: [WRENCH.click, 20, 160], torque: [WRENCH.torque, 0, 15], turnSpring: WRENCH.turnSpring });
  const svg = useRef(null);
  const content = mood === 'content';

  /* ── motion values, written straight to SVG attributes ── */
  const twist = useMotionValue(0); // degrees round the nut
  const jaw = useMotionValue(0); // units the movable jaw is open
  const flex = useMotionValue(1); // the head flexing on a bite or under torque
  const nutY = useMotionValue(NUT.y);
  const nutR = useMotionValue(0);
  const nutO = useMotionValue(0);
  const body = useRef(null);
  const jawRef = useRef(null);
  const wormRef = useRef(null);
  const nutRef = useRef(null);
  const slotRef = useRef(null);
  useEffect(() => {
    const draw = () => {
      const j = jaw.get();
      const cx = nutX(j);
      body.current?.setAttribute('transform', `rotate(${twist.get()} ${cx} ${NUT.y}) translate(0 ${NUT.y}) scale(${flex.get()} ${2 - flex.get()}) translate(0 ${-NUT.y})`);
      jawRef.current?.setAttribute('transform', `translate(${j} 0)`);
      slotRef.current?.setAttribute('width', String(JAW.movable - JAW.fixed + j));
      wormRef.current?.setAttribute('stroke-dashoffset', String(-j * 1.4)); // the knurl rolls as the jaw slides
      nutRef.current?.setAttribute('transform', `translate(${cx} ${nutY.get()}) rotate(${nutR.get()})`);
      nutRef.current?.setAttribute('opacity', String(nutO.get()));
    };
    draw();
    const offs = [twist, jaw, flex, nutY, nutR, nutO].map((m) => m.on('change', draw));
    return () => offs.forEach((o) => o());
  }, []);

  /* ── the jaw clicks along the worm, one detent at a time ── */
  const clickTo = async (detents, ms = t.click) => {
    const target = detents * WRENCH.detent;
    while (Math.abs(jaw.get() - target) > 0.01) {
      const step = Math.sign(target - jaw.get()) * WRENCH.detent;
      await animate(jaw, Math.round((jaw.get() + step) / WRENCH.detent) * WRENCH.detent, { duration: (ms * 0.6) / 1000, ease: 'easeOut' });
      await wait(ms * 0.4); // the pause between clicks is what makes it a detent
    }
  };

  /* ── eyes ──────────────────────────────────────────────── */
  const gx = useSpring(0, { stiffness: 260, damping: 24 });
  const gy = useSpring(0, { stiffness: 260, damping: 24 });
  const eyesRef = useRef(null);
  useEffect(() => {
    const write = () => eyesRef.current?.setAttribute('transform', `translate(${gx.get()} ${gy.get()})`);
    const offs = [gx.on('change', write), gy.on('change', write)];
    return () => offs.forEach((o) => o());
  }, []);
  const [blink, setBlink] = useState(false);
  const [effort, setEffort] = useState(false);
  const [nutTight, setNutTight] = useState(false);
  const busy = useRef(false);
  const hovering = useRef(false);
  const eyes = effort ? 'squint' : content ? 'happy' : mood === 'worried' ? 'wide' : 'open';

  const lookAt = (x, y) => {
    const r = svg.current?.getBoundingClientRect();
    if (!r) return;
    const dx = x - (r.left + r.width / 2);
    const dy = y - (r.top + r.height * 0.3);
    const d = Math.hypot(dx, dy) || 1;
    gx.set((dx / d) * WRENCH.gaze);
    gy.set((dy / d) * WRENCH.gaze * 0.7);
  };

  // what he watches: the nut while he works, the drift while there is some, otherwise you
  useEffect(() => {
    if (effort) return (gx.set(0), gy.set(-WRENCH.gaze * 0.8));
    if (content) return (gx.set(0), gy.set(0));
    if (mood === 'worried') {
      if (target) {
        const r = target.getBoundingClientRect();
        lookAt(r.left + r.width / 2, r.top + r.height / 2);
      } else (gx.set(WRENCH.gaze * 0.7), gy.set(WRENCH.gaze * 0.7));
      return;
    }
    const onMove = (e) => lookAt(e.clientX, e.clientY);
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [mood, target, content, effort]);

  useEffect(() => {
    let tm;
    const next = () => {
      tm = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), WRENCH.blinkFor);
        next();
      }, WRENCH.blink[0] + Math.random() * (WRENCH.blink[1] - WRENCH.blink[0]));
    };
    next();
    return () => clearTimeout(tm);
  }, []);

  /* ── one fix: fit, turn, release ───────────────────────── */
  const queue = useRef(Promise.resolve());
  const fix = (last) => {
    queue.current = queue.current.then(async () => {
      busy.current = true;
      if (reduce) {
        setNutTight(true);
        busy.current = false;
        return;
      }
      setNutTight(false);
      nutR.set(0);
      nutY.set(NUT.y - 16);
      nutO.set(0);
      // a red nut drops into the open jaw
      const opening = clickTo(5, WRENCH.quick);
      animate(nutO, 1, { duration: 0.12 });
      await Promise.all([opening, animate(nutY, NUT.y, { type: 'spring', stiffness: 500, damping: 26 })]);
      // fit: click shut until it bites
      await clickTo(BITE);
      await animate(flex, [1, 0.96, 1], { duration: 0.14 });
      // turn round the nut; it goes with him, and seats
      setEffort(true);
      setNutTight(true);
      await Promise.all([animate(twist, t.turn, t.turnSpring), animate(nutR, t.turn, t.turnSpring)]);
      if (last) {
        // torque: he leans his weight in for the last one
        await Promise.all([animate(twist, t.turn + t.torque, { duration: 0.16, ease: 'easeOut' }), animate(nutR, t.turn + t.torque, { duration: 0.16, ease: 'easeOut' }), animate(flex, 0.94, { duration: 0.16 })]);
        await wait(140);
        animate(flex, 1, { type: 'spring', stiffness: 500, damping: 20 });
        animate(nutR, t.turn, { duration: 0.12 }); // the extra was the wrench flexing, not the nut
      }
      setEffort(false);
      // release, and swing back upright; the nut stays put
      await clickTo(BITE + 2, WRENCH.quick * 1.5);
      await animate(twist, 0, { duration: 0.24, ease: [0.4, 0, 0.2, 1] });
      // done: the nut lifts out; the jaw clicks shut, or stays ready if you're over him
      animate(nutY, NUT.y - 14, { duration: 0.28, ease: 'easeIn' });
      await animate(nutO, 0, { duration: 0.28, ease: 'easeIn' });
      await clickTo(hovering.current ? WRENCH.ready : 0, WRENCH.quick * 1.5);
      busy.current = false;
    });
  };

  // a cheer that arrives with the page already content was the last fix: that one gets the torque
  useEffect(() => {
    if (cheer) fix(content);
  }, [cheer]);

  /* ── worried: he measures ──────────────────────────────── */
  useEffect(() => {
    if (mood !== 'worried' || reduce) return;
    let tm;
    let live = true;
    const measure = async () => {
      if (!busy.current && !hovering.current) {
        busy.current = true;
        await clickTo(WRENCH.measure.open);
        await wait(WRENCH.measure.hold);
        await clickTo(0);
        busy.current = false;
      }
      if (live) tm = setTimeout(measure, WRENCH.measure.every[0] + Math.random() * (WRENCH.measure.every[1] - WRENCH.measure.every[0]));
    };
    tm = setTimeout(measure, 1200);
    return () => {
      live = false;
      clearTimeout(tm);
    };
  }, [mood, reduce]);

  /* ── hover: ready to grip ──────────────────────────────── */
  const onEnter = () => {
    hovering.current = true;
    if (!reduce && !busy.current) clickTo(WRENCH.ready, WRENCH.quick * 1.5);
  };
  const onLeave = () => {
    hovering.current = false;
    if (!reduce && !busy.current) clickTo(0, WRENCH.quick * 1.5);
  };

  const W = 34;
  const top = -18; // room for the nut above his jaw; it drops in from further up, over the edge
  const H = FOOT - top + 4;
  return (
    <svg
      ref={svg}
      aria-hidden="true"
      width={W * scale}
      height={H * scale}
      viewBox={`${-W / 2} ${top} ${W} ${H}`}
      className={`overflow-visible ${className}`}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onClick={(e) => {
        e.preventDefault(); // inside a link (the title strip's wordmark), a click on him is a fix, not navigation
        e.stopPropagation();
        fix(content);
      }}
    >
      <defs>
        {/* forged steel, anodised blue: dark edges, a lit stripe left of centre */}
        <linearGradient id={`${id}-metal`} x1="-13" x2="13" y1="0" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={INK.dark} />
          <stop offset="0.2" stopColor={INK.base} />
          <stop offset="0.32" stopColor={INK.light} />
          <stop offset="0.46" stopColor={INK.base} />
          <stop offset="0.85" stopColor={INK.dark} />
        </linearGradient>
        <linearGradient id={`${id}-steel`} x1="0" x2="0" y1="-2.6" y2="-0.2" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#eef1f7" />
          <stop offset="1" stopColor={INK.steelDark} />
        </linearGradient>
        {/* the head is cut by the jaw opening; the handle by its hang hole */}
        <mask id={`${id}-cut`} maskUnits="userSpaceOnUse" x="-20" y="-20" width="40" height="80">
          <rect x="-20" y="-20" width="40" height="80" fill="#fff" />
          {/* only the opening is cut, and it widens exactly as far as the jaw has moved: the head stays whole */}
          <rect ref={slotRef} x={JAW.fixed} y="-16" width={JAW.movable - JAW.fixed} height="13.6" rx="1.2" fill="#000" />
          <circle cy={FOOT - 4.5} r="1.8" fill="#000" />
        </mask>
      </defs>

      {/* his shadow on the ground */}
      <ellipse cy={FOOT + 1.5} rx="7" ry="1.4" fill="currentColor" opacity="0.14" />

      {/* the nut: the drift. Behind the jaws, so they visibly close on it. */}
      <g ref={nutRef} opacity="0">
        <polygon points={hex(NUT.flats / Math.sqrt(3))} style={{ fill: nutTight ? NUT_INK.tight : NUT_INK.loose, transition: 'fill var(--dur-move)' }} />
        <polygon points={hex(NUT.flats / Math.sqrt(3))} fill="none" stroke="#000" strokeOpacity="0.25" strokeWidth="0.5" />
        <circle r="2.1" fill="#000" opacity="0.32" />
        <path d="M-2.3 -3.6 L0 -4.9 L2.3 -3.6" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="0.6" strokeLinecap="round" />
      </g>

      <g ref={body} style={{ cursor: 'pointer' }}>
        {/* the movable jaw: the head's own curve, cut off by the opening; it clicks along the worm */}
        <g ref={jawRef}>
          <path d="M4.6 -2.4 V-11.07 A12 12 0 0 1 11.75 -2.4 Z" fill={`url(#${id}-metal)`} stroke={INK.dark} strokeOpacity="0.45" strokeWidth="0.45" strokeLinejoin="round" />
          <path d="M4.6 -11.07 A12 12 0 0 1 10.4 -6.6" fill="none" stroke="#fff" strokeOpacity="0.4" strokeWidth="0.8" strokeLinecap="round" />
        </g>
        <g mask={`url(#${id}-cut)`}>
          {/* head and fixed jaw */}
          <circle r="12" fill={`url(#${id}-metal)`} />
          {/* neck into a tapered I-beam handle, rounded at the foot */}
          <path d={`M-5.2 8 C-4.6 14 -4.4 20 -4.4 ${FOOT - 3} Q-4.4 ${FOOT} 0 ${FOOT} Q4.4 ${FOOT} 4.4 ${FOOT - 3} C4.4 20 4.6 14 5.2 8 Z`} fill={`url(#${id}-metal)`} />
          {/* the top of the head catches the light */}
          <path d="M-11.4 -3 A11.6 11.6 0 0 1 -4.6 -10.6" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="0.9" strokeLinecap="round" />
        </g>
        {/* the I-beam's channel */}
        <rect x="-1.5" y="15" width="3" height={Math.max(4, FOOT - 24)} rx="1.5" fill={INK.dark} opacity="0.55" />
        {/* the worm screw, under the movable jaw: knurled, it rolls as the jaw clicks along */}
        <rect x="4.4" y="-2.6" width="7" height="2.4" rx="1.2" fill={`url(#${id}-steel)`} />
        <line ref={wormRef} x1="5" x2="10.8" y1="-1.4" y2="-1.4" stroke={INK.steelDark} strokeWidth="2.4" strokeDasharray="0.5 0.9" />
        {/* the face */}
        <g ref={eyesRef}>
          {[-1, 1].map((s) => (
            <g key={s} transform={`translate(${s * 4.2} 3.2) scale(${eye})`}>
              {eyes === 'happy' ? (
                <path d="M-1.5 0.7 Q0 -1.2 1.5 0.7" fill="none" stroke="#fff" strokeWidth="1" strokeLinecap="round" />
              ) : eyes === 'squint' ? (
                <path d={s < 0 ? 'M-1.3 -1.1 L1.1 0 L-1.3 1.1' : 'M1.3 -1.1 L-1.1 0 L1.3 1.1'} fill="none" stroke="#fff" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <ellipse rx={eyes === 'wide' ? 1.6 : 1.4} ry={blink ? 0.22 : eyes === 'wide' ? 2.1 : 1.8} fill="#fff" />
              )}
            </g>
          ))}
        </g>
      </g>
    </svg>
  );
}
