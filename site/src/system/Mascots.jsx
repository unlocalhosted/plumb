/* ─────────────────────────────────────────────────────────
 * MASCOTS — React Plumber character prototypes, side by side (development page at #mascots)
 *
 * The world: the design system is the pipework. A hard-coded value is a leak. Fixing it tightens the joint.
 * Every prototype plays the same scene, so they can be judged against each other:
 *
 * STORYBOARD (one loop, 6.2s)
 *      0ms   stage 1  LEAK     a joint starts to drip; a puddle grows. The character hasn't seen it.
 *    700ms   stage 2  NOTICE   eyes go wide and turn to the leak; a small reaction toward it
 *   1500ms   stage 3  FIX      the character's own verb: clamp and turn / tighten / walk over and turn / spin shut
 *   2900ms   stage 4  DRY      the drip stops, the puddle dries; the character celebrates in its own way
 *   5200ms   stage 0  REST     back to rest, then the loop restarts
 *
 * CONCEPTS (each prototype's packet is above its component)
 *   A  Wrench      the tool is the character: flips onto the nut, ratchets it shut
 *   B  Elbow       the pipe fitting is the character: the leak is his own joint; he squeezes it tight and shakes dry
 *   C  Plumber     a small person: walks over, reaches up, turns the nut
 *   D  Valve       a handwheel on the line: turning it shut IS the fix, so the motion is the meaning
 * ───────────────────────────────────────────────────────── */
import { useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue } from 'motion/react';
import { Button } from '@/components/ui/button';

const TIMING = { notice: 700, fix: 1500, dry: 2900, rest: 5200, loop: 6200 };

const C = {
  ink: '#16309c',
  blue: '#2f5be0',
  sky: '#9fb4ff',
  pipe: '#c7cfdf',
  pipeDark: '#8e9ab3',
  pipeLight: '#eef1f7',
  water: '#58a8ff',
  green: '#22a35a',
  shadow: 'rgb(16 24 40 / .18)',
};

const SPRINGY = { type: 'spring', stiffness: 320, damping: 20 };
const LAND = { type: 'spring', stiffness: 420, damping: 24 };

/* ── a pose: translate, rotate, scale, written to an SVG transform attribute ── */
// Rotation and scale happen round the element's own local origin, in SVG units: draw each part round (0, 0).
function usePose(init) {
  const v = {
    x: useMotionValue(init.x ?? 0),
    y: useMotionValue(init.y ?? 0),
    r: useMotionValue(init.r ?? 0),
    sx: useMotionValue(init.sx ?? 1),
    sy: useMotionValue(init.sy ?? 1),
  };
  const ref = useRef(null);
  useEffect(() => {
    const write = () => ref.current?.setAttribute('transform', `translate(${v.x.get()} ${v.y.get()}) rotate(${v.r.get()}) scale(${v.sx.get()} ${v.sy.get()})`);
    write();
    const offs = Object.values(v).map((m) => m.on('change', write));
    return () => offs.forEach((o) => o());
  }, []);
  const to = (pose, t = SPRINGY) => Promise.all(Object.entries(pose).map(([k, val]) => animate(v[k], val, t)));
  const set = (pose) => Object.entries(pose).forEach(([k, val]) => v[k].set(val));
  return { ref, to, set, v };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── eyes: the whole face ───────────────────────────────── */
function Eyes({ x = 0, y = 0, gap = 4, look = 0, mood = 'open', size = 1, color = '#fff' }) {
  return [-1, 1].map((s) => {
    const cx = x + s * gap + look;
    return (
      <g key={s} transform={`translate(${cx} ${y}) scale(${size})`}>
        {mood === 'happy' ? (
          <path d="M-1.4 0.6 Q0 -1.2 1.4 0.6" fill="none" stroke={color} strokeWidth="0.9" strokeLinecap="round" />
        ) : mood === 'squint' ? (
          <path d={s < 0 ? 'M-1.3 -1 L1 0 L-1.3 1' : 'M1.3 -1 L-1 0 L1.3 1'} fill="none" stroke={color} strokeWidth="0.85" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <ellipse rx={mood === 'wide' ? 1.6 : 1.35} ry={mood === 'wide' ? 2.1 : 1.7} fill={color} />
        )}
      </g>
    );
  });
}

/* ── the scene every prototype plays in ───────────────────── */
function Drips({ at: [x, y], leaking, floor }) {
  return (
    <>
      {leaking &&
        [0, 0.36].map((d) => (
          <motion.ellipse
            key={d}
            cx={x}
            rx="1.6"
            ry="2.2"
            fill={C.water}
            initial={{ cy: y, opacity: 0 }}
            animate={{ cy: [y, y + 2, floor - 2], opacity: [0, 1, 1] }}
            transition={{ duration: 0.72, times: [0, 0.25, 1], ease: 'easeIn', repeat: Infinity, delay: d }}
          />
        ))}
      {/* the puddle: grows while it leaks, dries when fixed */}
      <motion.ellipse cx={x} cy={floor} ry="1.6" fill={C.water} initial={{ rx: 0, opacity: 0.7 }} animate={{ rx: leaking ? 12 : 0, opacity: leaking ? 0.7 : 0 }} transition={{ duration: leaking ? 2.2 : 0.9, ease: 'easeOut' }} />
    </>
  );
}

function Pipe({ y = 103, from = 0, to = 200 }) {
  return (
    <g>
      <rect x={from} y={y - 7} width={to - from} height="14" fill={C.pipe} />
      <rect x={from} y={y - 5} width={to - from} height="2.5" fill={C.pipeLight} />
      <rect x={from} y={y + 4.5} width={to - from} height="2.5" fill={C.pipeDark} opacity="0.6" />
    </g>
  );
}

// A hex nut on the pipe, seen side-on: three faces. Turning it slides the faces along.
function Nut({ pose, leaking }) {
  return (
    <g ref={pose.ref}>
      <rect x="-6" y="-11" width="12" height="22" rx="1.5" fill={leaking ? '#a7b2c9' : C.pipeDark} style={{ transition: 'fill 400ms' }} />
      <rect x="-6" y="-11" width="4" height="22" fill="#000" opacity="0.12" />
      <rect x="2" y="-11" width="4" height="22" fill="#fff" opacity="0.22" />
    </g>
  );
}

const FLOOR = 150;

/* ── A · Wrench buddy ───────────────────────────────────────
 *  outcome   the fix is a physical act: a wrench turning a nut
 *  verb      clamp and turn. Before: stands on the pipe, idle. During: flips onto the nut and ratchets it twice.
 *            After: hops off and lands upright on the pipe, eyes happy.
 *  invariant the wrench's jaw is the only thing that touches the nut; the nut only turns while gripped
 *  rejected  a wrench that waves or dances; any sparkle on the fix
 */
function Wrench({ stage }) {
  const body = usePose({ x: 72, y: 54 });
  const nut = usePose({ x: 128, y: 103 });
  const [look, setLook] = useState(0);
  useEffect(() => {
    let live = true;
    const run = async () => {
      if (stage <= 1) {
        setLook(0);
        body.to({ x: 72, y: 54, r: 0 }, { duration: 0.01 });
        nut.set({ r: 0 });
      }
      if (stage === 2) {
        setLook(1.4);
        await body.to({ r: -6 }, { duration: 0.12 });
        live && body.to({ r: 8 }, SPRINGY);
      }
      if (stage === 3) {
        await body.to({ y: 36, r: 90, x: 96 }, { duration: 0.22, ease: 'easeOut' });
        if (!live) return;
        await body.to({ x: 128, y: 84, r: 180 }, LAND); // lands on the nut, jaw down
        for (let i = 0; i < 2 && live; i++) {
          await Promise.all([body.to({ r: 206 }, { duration: 0.22, ease: 'easeInOut' }), nut.to({ sx: 0.6 }, { duration: 0.11 }).then(() => nut.to({ sx: 1 }, { duration: 0.11 }))]);
          if (!live) return;
          await body.to({ r: 180 }, { duration: 0.16 });
        }
      }
      if (stage === 4) {
        setLook(0);
        await body.to({ x: 100, y: 30, r: 270 }, { duration: 0.24, ease: 'easeOut' });
        if (!live) return;
        await body.to({ x: 72, y: 54, r: 360 }, LAND);
        body.set({ r: 0 });
      }
    };
    run();
    return () => (live = false);
  }, [stage]);
  const mood = stage === 2 ? 'wide' : stage === 3 ? 'squint' : stage === 4 ? 'happy' : 'open';
  return (
    <Stage title="A · Wrench buddy" note="The tool is the character. He flips onto the nut and ratchets it shut, then hops back and lands upright.">
      <Pipe />
      <Nut pose={nut} leaking={stage > 0 && stage < 4} />
      <Drips at={[128, 114]} leaking={stage > 0 && stage < 4} floor={FLOOR} />
      {/* local origin: centre of the head; the handle runs down (+y), the jaw opens up (−y) */}
      <g ref={body.ref}>
        <mask id="wrench-jaw">
          <rect x="-20" y="-20" width="40" height="80" fill="#fff" />
          <rect x="-5" y="-16" width="10" height="13" rx="1.5" fill="#000" />
        </mask>
        <g mask="url(#wrench-jaw)">
          <circle r="13" fill={C.blue} />
          <rect x="-5" y="8" width="10" height="42" rx="5" fill={C.blue} />
          <rect x="-13" y="-2" width="26" height="4" fill="#fff" opacity="0.12" />
        </g>
        <rect x="-5" y="8" width="3" height="40" rx="1.5" fill="#fff" opacity="0.18" />
        {[20, 24, 28].map((yy) => (
          <line key={yy} x1="-3.5" x2="3.5" y1={yy} y2={yy} stroke={C.ink} strokeWidth="1" opacity="0.5" />
        ))}
        <Eyes y={4} gap={4.2} look={look} mood={mood} />
      </g>
    </Stage>
  );
}

/* ── B · Pipe elbow ──────────────────────────────────────────
 *  outcome   the leak is his: drift is a weak joint in the system itself
 *  verb      tighten. Before: drips from his own collar, he looks down at it, embarrassed. During: squeezes his
 *            collar tight in three clenches. After: shakes himself dry like a dog, one drop flung off.
 *  invariant he never leaves the pipework; he is part of it
 *  rejected  limbs; a face anywhere but on the fitting
 */
function Elbow({ stage }) {
  const body = usePose({ x: 124, y: 103 });
  const collar = usePose({ x: 124, y: 103 });
  const fling = usePose({ x: 150, y: 96, sx: 0, sy: 0 });
  const [look, setLook] = useState([0, 0]);
  useEffect(() => {
    let live = true;
    const run = async () => {
      if (stage <= 1) {
        setLook([0, 0]);
        body.set({ sx: 1, sy: 1, r: 0, x: 124 });
        collar.set({ sx: 1 });
      }
      if (stage === 2) {
        setLook([-1.2, 1.2]); // looks down at his own collar
        await body.to({ r: -3 }, { duration: 0.1 });
        live && body.to({ r: 0 }, SPRINGY);
      }
      if (stage === 3) {
        for (let i = 0; i < 3 && live; i++) {
          await Promise.all([body.to({ sx: 0.94, sy: 1.04 }, { duration: 0.12 }), collar.to({ sx: 0.78 }, { duration: 0.12 })]);
          if (!live) return;
          await Promise.all([body.to({ sx: 1, sy: 1 }, LAND), collar.to({ sx: 1 }, LAND)]);
        }
      }
      if (stage === 4) {
        setLook([0, 0]);
        // shake dry, and one drop flies off
        fling.set({ x: 150, y: 96, sx: 1, sy: 1 });
        fling.to({ x: 178, y: 70 }, { duration: 0.5, ease: 'easeOut' }).then(() => fling.to({ sx: 0, sy: 0 }, { duration: 0.15 }));
        for (const dx of [2.5, -2.5, 2, -2, 1, 0]) {
          if (!live) return;
          await body.to({ x: 124 + dx }, { duration: 0.05 });
        }
      }
    };
    run();
    return () => (live = false);
  }, [stage]);
  const mood = stage === 2 ? 'wide' : stage === 3 ? 'squint' : stage === 4 ? 'happy' : 'open';
  return (
    <Stage title="B · Pipe elbow" note="The leak is his own joint. He clenches his collar tight three times, then shakes himself dry like a dog.">
      <Pipe to={124} />
      {/* local origin: the inlet, where the straight pipe meets him */}
      <g ref={body.ref}>
        <path d="M0 0 H6 Q30 0 30 24 V60" fill="none" stroke={C.blue} strokeWidth="16" />
        <path d="M0 -5 H6 Q25 -5 25 20" fill="none" stroke="#fff" strokeOpacity="0.2" strokeWidth="3" />
        <rect x="22" y="40" width="16" height="6" rx="1.5" fill={C.ink} />
        <Eyes x={16} y={7} gap={4} look={look[0]} mood={mood} />
      </g>
      <g ref={collar.ref}>
        <rect x="-3" y="-10" width="6" height="20" rx="1.5" fill={C.ink} />
      </g>
      <Drips at={[124, 112]} leaking={stage > 0 && stage < 4} floor={FLOOR} />
      <g ref={fling.ref}>
        <ellipse rx="1.6" ry="2.2" fill={C.water} />
      </g>
    </Stage>
  );
}

/* ── C · Little plumber ──────────────────────────────────────
 *  outcome   a person who fixes things for you: the friendliest, most mascot-like
 *  verb      walk over and turn. Before: stands to the left. During: notices, trots under the leak, reaches up with
 *            the wrench and turns twice. After: a jump with both arms up, lands, eyes happy.
 *  invariant the wrench is always in his hand; the nut turns only when the wrench is on it
 *  rejected  a moustache and red cap (that's Mario); a walk cycle with legs flailing
 */
function Plumber({ stage }) {
  const body = usePose({ x: 52, y: FLOOR });
  const arm = usePose({ r: 40 });
  const nut = usePose({ x: 128, y: 103 });
  const [look, setLook] = useState(0);
  useEffect(() => {
    let live = true;
    const run = async () => {
      if (stage <= 1) {
        setLook(0);
        body.set({ x: 52, y: FLOOR, r: 0 });
        arm.set({ r: 40 });
      }
      if (stage === 2) {
        setLook(1.5);
        await body.to({ y: FLOOR - 5 }, { duration: 0.14, ease: 'easeOut' });
        live && body.to({ y: FLOOR }, LAND);
      }
      if (stage === 3) {
        // trot: four little bounces on the way
        const trot = body.to({ x: 116 }, { duration: 0.6, ease: 'easeInOut' });
        for (let i = 0; i < 4 && live; i++) {
          await body.to({ y: FLOOR - 3 }, { duration: 0.075 });
          await body.to({ y: FLOOR }, { duration: 0.075 });
        }
        await trot;
        if (!live) return;
        await arm.to({ r: -150 }, SPRINGY); // reaches up
        for (let i = 0; i < 2 && live; i++) {
          await Promise.all([arm.to({ r: -120 }, { duration: 0.18 }), nut.to({ sx: 0.6 }, { duration: 0.09 }).then(() => nut.to({ sx: 1 }, { duration: 0.09 }))]);
          if (!live) return;
          await arm.to({ r: -150 }, { duration: 0.14 });
        }
      }
      if (stage === 4) {
        setLook(0);
        arm.to({ r: -170 }, SPRINGY);
        await body.to({ y: FLOOR - 14 }, { duration: 0.2, ease: 'easeOut' });
        if (!live) return;
        await body.to({ y: FLOOR }, LAND);
        arm.to({ r: 40 }, SPRINGY);
        await wait(500);
        live && body.to({ x: 52 }, { duration: 0.7, ease: 'easeInOut' });
      }
    };
    run();
    return () => (live = false);
  }, [stage]);
  const mood = stage === 2 ? 'wide' : stage === 3 ? 'squint' : stage === 4 ? 'happy' : 'open';
  return (
    <Stage title="C · Little plumber" note="A small person with a work cap and tool belt. He trots under the leak, reaches up and turns the nut, then jumps.">
      <Pipe />
      <Nut pose={nut} leaking={stage > 0 && stage < 4} />
      <Drips at={[128, 114]} leaking={stage > 0 && stage < 4} floor={FLOOR} />
      {/* local origin: between his feet, on the floor */}
      <g ref={body.ref}>
        <rect x="-8" y="-6" width="6" height="6" rx="2" fill={C.ink} />
        <rect x="2" y="-6" width="6" height="6" rx="2" fill={C.ink} />
        <rect x="-12" y="-36" width="24" height="32" rx="12" fill={C.blue} />
        <rect x="-12" y="-15" width="24" height="3.5" fill={C.ink} />
        <rect x="-3" y="-15.5" width="6" height="4.5" rx="1" fill="#ffd36b" />
        {/* the cap: dome and a short brim, with a tiny atom */}
        <path d="M-12 -30 Q-12 -44 0 -44 Q12 -44 12 -30 Z" fill={C.ink} />
        <path d="M6 -30 H18 Q18 -27 14 -27 H6 Z" fill={C.ink} />
        <g transform="translate(0 -37)" fill="none" stroke={C.sky} strokeWidth="0.7">
          <ellipse rx="4" ry="1.5" />
          <ellipse rx="4" ry="1.5" transform="rotate(60)" />
          <ellipse rx="4" ry="1.5" transform="rotate(-60)" />
        </g>
        <Eyes y={-23} gap={4} look={look} mood={mood} />
        {/* the arm, from the shoulder, holding a little wrench */}
        <g transform="translate(9 -22)">
          <g ref={arm.ref}>
            <line x1="0" y1="0" x2="0" y2="14" stroke={C.blue} strokeWidth="4" strokeLinecap="round" />
            <rect x="-1.5" y="12" width="3" height="11" rx="1.5" fill={C.pipeDark} />
            <circle cy="25" r="3.5" fill={C.pipeDark} />
          </g>
        </g>
      </g>
    </Stage>
  );
}

/* ── D · Valve wheel ─────────────────────────────────────────
 *  outcome   the system has a shut-off: turning the valve is the fix, nothing else is needed to explain it
 *  verb      turn shut. Before: the wheel sits still, water sprays downstream. During: anticipation back, then a hard
 *            turn clockwise, one and a fifth turns, the face squeezed with effort. After: a proud wobble, eyes happy.
 *  invariant the leak stops because the wheel turned; the wheel never spins for show
 *  rejected  a faucet with a dripping nose; a wheel that spins on idle
 */
function Valve({ stage }) {
  const wheel = usePose({ x: 72, y: 62 });
  const [look, setLook] = useState(0);
  useEffect(() => {
    let live = true;
    const run = async () => {
      if (stage <= 1) {
        setLook(0);
        wheel.set({ r: 0 });
      }
      if (stage === 2) {
        setLook(1.5);
        for (const r of [-4, 3, 0]) {
          if (!live) return;
          await wheel.to({ r }, { duration: 0.07 });
        }
      }
      if (stage === 3) {
        await wheel.to({ r: -22 }, { duration: 0.2, ease: 'easeOut' }); // wind-up
        if (!live) return;
        await wheel.to({ r: 432 }, { type: 'spring', stiffness: 70, damping: 13 });
      }
      if (stage === 4) {
        setLook(0);
        for (const r of [440, 426, 434, 432]) {
          if (!live) return;
          await wheel.to({ r }, { duration: 0.1 });
        }
        wheel.set({ r: 0 }); // 432° is six spokes round: the same pose
      }
    };
    run();
    return () => (live = false);
  }, [stage]);
  const mood = stage === 2 ? 'wide' : stage === 3 ? 'squint' : stage === 4 ? 'happy' : 'open';
  return (
    <Stage title="D · Valve wheel" note="A handwheel on the line. He winds back, turns hard and shuts the leak off, then wobbles proudly. Turning shut is the fix.">
      <Pipe />
      {/* the valve body and stem */}
      <rect x="62" y="92" width="20" height="22" rx="4" fill={C.pipeDark} />
      <rect x="69" y="62" width="6" height="32" fill={C.pipeDark} />
      <Drips at={[146, 110]} leaking={stage > 0 && stage < 4} floor={FLOOR} />
      <rect x="140" y="94" width="12" height="18" rx="1.5" fill={stage > 0 && stage < 4 ? '#a7b2c9' : C.pipeDark} style={{ transition: 'fill 400ms' }} />
      {/* local origin: the hub */}
      <g ref={wheel.ref}>
        <circle r="25" fill="none" stroke={C.blue} strokeWidth="6" />
        <circle r="25" fill="none" stroke="#fff" strokeOpacity="0.2" strokeWidth="1.5" strokeDasharray="20 12" />
        {[0, 72, 144, 216, 288].map((a) => (
          <rect key={a} x="-2" y="-24" width="4" height="15" rx="2" fill={C.blue} transform={`rotate(${a})`} />
        ))}
        <circle r="11" fill={C.blue} />
      </g>
      {/* the face doesn't turn with the wheel: it's on the hub cap, which stays put */}
      <g transform="translate(72 62)">
        <circle r="10" fill={C.ink} />
        <Eyes y={0} gap={3.6} look={look} mood={mood} />
      </g>
    </Stage>
  );
}

/* ── the page ─────────────────────────────────────────────── */
function Stage({ title, note, children }) {
  return (
    <figure className="plate flex flex-col gap-3 p-5">
      <svg viewBox="0 0 200 160" className="aspect-[5/4] w-full overflow-hidden rounded-md bg-muted">
        <line x1="0" x2="200" y1={FLOOR + 1.5} y2={FLOOR + 1.5} stroke="currentColor" strokeOpacity="0.12" strokeWidth="1" />
        {children}
      </svg>
      <figcaption className="flex flex-col gap-1">
        <span className="text-lg font-semibold">{title}</span>
        <span className="text-sm text-muted-foreground">{note}</span>
      </figcaption>
    </figure>
  );
}

const STAGES = ['rest', 'leak', 'notice', 'fix', 'dry'];

export function Mascots() {
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    if (!playing) return;
    const timers = [];
    const loop = () => {
      setStage(1);
      timers.push(setTimeout(() => setStage(2), TIMING.notice));
      timers.push(setTimeout(() => setStage(3), TIMING.fix));
      timers.push(setTimeout(() => setStage(4), TIMING.dry));
      timers.push(setTimeout(() => setStage(0), TIMING.rest));
      timers.push(setTimeout(loop, TIMING.loop));
    };
    loop();
    return () => timers.forEach(clearTimeout);
  }, [playing]);
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 md:px-12">
      <header className="flex flex-col gap-3">
        <span className="inline-flex w-fit rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-secondary-foreground">Prototypes · React Plumber</span>
        <h1 className="text-5xl font-semibold">Who fixes the leak?</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          The design system is the pipework; a hard-coded value is a leak. Four characters play the same scene: a joint starts to drip, they notice, they fix it, it dries.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant={playing ? 'default' : 'outline'} onClick={() => setPlaying((p) => !p)}>
            {playing ? 'Pause loop' : 'Play loop'}
          </Button>
          {STAGES.map((s, i) => (
            <Button key={s} variant={!playing && stage === i ? 'secondary' : 'ghost'} onClick={() => (setPlaying(false), setStage(i))}>
              {i} · {s}
            </Button>
          ))}
        </div>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        <Wrench stage={stage} />
        <Elbow stage={stage} />
        <Plumber stage={stage} />
        <Valve stage={stage} />
      </div>
    </main>
  );
}
