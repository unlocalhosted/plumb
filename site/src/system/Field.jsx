/* ─────────────────────────────────────────────────────────
 * FIELD — the gradient that lives inside a blue stage (site/HOMEPAGE.md §3.1)
 *
 *  layers   1  a static gradient in the same colours paints first: the fallback for no WebGPU, reduced motion,
 *              and the frames before the GPU is ready, so the stage never flashes empty
 *           2  a mesh gradient fades in over it: brand blues, deep at the edges, with one warm point of light
 *           3  a pool of deep blue behind the centre, so white type stays legible wherever the light drifts
 *           4  grain over all of it: printed paper, not a screen glow. Same grain whether the shader runs or not
 *
 *  drift    turbulence 1 (restless) → 0 (still), eased within 300ms of each fix:
 *             restless  points wander far and fast, the field twists
 *             still     points barely breathe, the swirl unwinds, the colours sit where they belong
 *
 *  the shader code (three.js underneath) loads in its own chunk after first paint; the gradient covers the wait
 *  never full-bleed; clipped by the stage's corners. Telemetry off: a design tool's page doesn't report its visitors.
 * ───────────────────────────────────────────────────────── */
import { lazy, Suspense, useEffect, useId, useState } from 'react';
import { animate, useReducedMotion } from 'motion/react';
import { useTune } from '../site/tune.js';

export const FIELD = {
  // deep edge → brand → light core → pale light → one warm point. Blue and orange meet through near-white, never
  // through grey: the warm point reads as sunlight on the field, not a bruise. Most of the range is blue.
  stops: [
    { color: '#16309c', position: 0 },
    { color: '#2f5be0', position: 0.45 },
    { color: '#6b8cf2', position: 0.72 },
    { color: '#dfe6ff', position: 0.86 },
    { color: '#ffb36b', position: 1 },
  ],
  count: 5, // colour points in the mesh
  smoothness: 2.6, // how softly the points blend
  seed: 3, // the layout that puts the warm point upper right, away from the headline
  restless: { speed: 3, drift: 0.75, swirl: 0.35 }, // six drifts on the card
  still: { speed: 0.6, drift: 0.25, swirl: 0 }, // nothing off the scale
  grain: { opacity: 0.4, frequency: 0.9 }, // printed-paper texture
  pool: 0.45, // how deep the blue pool behind the centre's type is
  ease: 0.3, // seconds a fix takes to calm the field
};

const [edge, brand, core, , warm] = FIELD.stops.map((s) => s.color);

// The same field, painted once: the fallback and the first frame.
const still = `radial-gradient(70% 60% at 82% 18%, color-mix(in oklab, ${warm} 70%, transparent) 0%, transparent 70%),
  radial-gradient(110% 90% at 30% 10%, ${core} 0%, transparent 62%),
  radial-gradient(140% 120% at 50% 115%, ${edge} 0%, transparent 70%), ${brand}`;

// The shader and three.js, split out of the main bundle and fetched only when a field is on the page.
const Live = lazy(() => import('./FieldLive.jsx'));

export function Field({ turbulence = 1, className = '' }) {
  const reduce = useReducedMotion();
  const grainId = useId().replace(/:/g, '');
  const t = useTune('Field', {
    smoothness: [FIELD.smoothness, 0, 5],
    seed: [FIELD.seed, 0, 100, 1],
    restlessSpeed: [FIELD.restless.speed, 0, 10],
    stillSpeed: [FIELD.still.speed, 0, 10],
    restlessDrift: [FIELD.restless.drift, 0, 1],
    stillDrift: [FIELD.still.drift, 0, 1],
    restlessSwirl: [FIELD.restless.swirl, -1, 1],
    pool: [FIELD.pool, 0, 1],
    grain: [FIELD.grain.opacity, 0, 0.8],
    grainSize: [FIELD.grain.frequency, 0.3, 1.6],
    ease: [FIELD.ease, 0, 2],
  });
  const [live, setLive] = useState(false); // the GPU drew a frame
  const [gone, setGone] = useState(false); // this browser can't run it
  const [k, setK] = useState(turbulence); // eased turbulence

  useEffect(() => {
    const a = animate(k, turbulence, { duration: t.ease, ease: [0.16, 1, 0.3, 1], onUpdate: setK });
    return () => a.stop();
  }, [turbulence, t.ease]);

  const mix = (still, restless) => still + (restless - still) * k;

  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} style={{ background: still, borderRadius: 'inherit' }}>
      {!reduce && !gone && (
        <Suspense fallback={null}>
          <Live
            live={live}
            setLive={setLive}
            setGone={setGone}
            stops={FIELD.stops}
            count={FIELD.count}
            smoothness={t.smoothness}
            seed={Math.round(t.seed)}
            speed={mix(t.stillSpeed, t.restlessSpeed)}
            drift={mix(t.stillDrift, t.restlessDrift)}
            swirl={mix(FIELD.still.swirl, t.restlessSwirl)}
          />
        </Suspense>
      )}
      <div className="absolute inset-0" style={{ background: `radial-gradient(55% 60% at 50% 50%, color-mix(in oklab, ${edge} ${Math.round(t.pool * 100)}%, transparent) 0%, transparent 100%)` }} />
      {/* grain: fractal noise, desaturated, laid over with overlay so it lifts the lights and sinks the darks */}
      <svg className="absolute inset-0 h-full w-full" style={{ opacity: t.grain, mixBlendMode: 'overlay' }}>
        <filter id={grainId}>
          <feTurbulence type="fractalNoise" baseFrequency={t.grainSize} numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncR type="linear" slope="1.6" intercept="-0.3" />
            <feFuncG type="linear" slope="1.6" intercept="-0.3" />
            <feFuncB type="linear" slope="1.6" intercept="-0.3" />
          </feComponentTransfer>
        </filter>
        <rect width="100%" height="100%" filter={`url(#${grainId})`} />
      </svg>
    </div>
  );
}
