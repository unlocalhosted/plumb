/* ─────────────────────────────────────────────────────────
 * FAMILY — the mark for each of the seven families Plumber judges, wherever the docs name one
 *
 *  rest      a small tile in the family's own hue (--family-*), the glyph drawing what the family is about
 *  hover     the glyph does its family's verb once, on --dur-move:
 *              spacing    the two parts move apart: a gap is the space between things
 *              colour     the three swatches turn: colours, plural
 *              radius     the corner redraws from its straight end: a corner being rounded
 *              type       the letters settle onto their baseline
 *              motion     a dot runs the easing curve: time with a shape
 *              elevation  the plate lifts off the one below it
 *              z          the layers fan apart: what's in front of what
 *  reduced motion: the glyph stays still
 * ───────────────────────────────────────────────────────── */

const TILE = {
  spacing: 'bg-family-spacing/12 text-family-spacing',
  colour: 'bg-family-colour/12 text-family-colour',
  radius: 'bg-family-radius/12 text-family-radius',
  type: 'bg-family-type/12 text-family-type',
  motion: 'bg-family-motion/12 text-family-motion',
  elevation: 'bg-family-elevation/12 text-family-elevation',
  z: 'bg-family-z/12 text-family-z',
};

// every moving part: the same quick, settled transition, still under reduced motion
const MOVE = 'motion-safe:transition-transform motion-safe:duration-(--dur-move) ease-out [transform-box:fill-box] [transform-origin:center]';

const GLYPH = {
  spacing: (
    <>
      <rect x="2" y="3" width="2.5" height="10" rx="1" fill="currentColor" stroke="none" className={`${MOVE} group-hover/family:-translate-x-0.5`} />
      <rect x="11.5" y="3" width="2.5" height="10" rx="1" fill="currentColor" stroke="none" className={`${MOVE} group-hover/family:translate-x-0.5`} />
      <path d="M6.5 8 H9.5 M6.5 6.5 V9.5 M9.5 6.5 V9.5" strokeWidth="1.2" />
    </>
  ),
  colour: (
    <g className={`${MOVE} motion-safe:group-hover/family:rotate-120`}>
      <circle cx="5.6" cy="6.2" r="3.1" fill="var(--family-colour)" stroke="none" />
      <circle cx="10.4" cy="6.2" r="3.1" fill="var(--family-motion)" stroke="none" opacity="0.9" />
      <circle cx="8" cy="10.4" r="3.1" fill="var(--family-type)" stroke="none" opacity="0.85" />
    </g>
  ),
  radius: (
    <>
      <path d="M3 13 V3 H13" strokeWidth="1" strokeDasharray="1.5 1.5" opacity="0.45" />
      <path
        d="M3 13 V9 A6 6 0 0 1 9 3 H13"
        pathLength="1"
        className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-(--dur-move) [stroke-dasharray:1] [stroke-dashoffset:0] motion-safe:group-hover/family:animate-[family-draw_var(--dur-move)_var(--ease-out)]"
      />
    </>
  ),
  type: (
    <g className={`${MOVE} group-hover/family:translate-y-px`}>
      <text x="8" y="11.5" textAnchor="middle" fontSize="9.5" fontWeight="650" fill="currentColor" stroke="none" fontFamily="inherit">
        Aa
      </text>
      <path d="M2.5 13.2 H13.5" strokeWidth="1" opacity="0.5" />
    </g>
  ),
  motion: (
    <>
      <path d="M2.5 13 C 8 13, 8 3, 13.5 3" strokeWidth="1.3" opacity="0.55" />
      <circle
        r="1.8"
        fill="currentColor"
        stroke="none"
        className="[offset-distance:0%] [offset-path:path('M2.5_13_C_8_13,_8_3,_13.5_3')] motion-safe:transition-[offset-distance] motion-safe:duration-(--dur-explode) ease-out group-hover/family:[offset-distance:100%]"
      />
    </>
  ),
  elevation: (
    <>
      <rect x="2" y="10" width="12" height="3.5" rx="1" fill="currentColor" stroke="none" opacity="0.35" />
      <rect x="3.5" y="4" width="9" height="4" rx="1" fill="currentColor" stroke="none" className={`${MOVE} group-hover/family:-translate-y-1`} />
    </>
  ),
  z: (
    <>
      <path d="M8 9.5 L14 12 L8 14.5 L2 12 Z" fill="currentColor" stroke="none" opacity="0.35" className={`${MOVE} group-hover/family:translate-y-0.5`} />
      <path d="M8 6 L14 8.5 L8 11 L2 8.5 Z" fill="currentColor" stroke="none" opacity="0.6" />
      <path d="M8 2.5 L14 5 L8 7.5 L2 5 Z" fill="currentColor" stroke="none" className={`${MOVE} group-hover/family:-translate-y-0.5`} />
    </>
  ),
};

export function Family({ id, children }) {
  return (
    <span className="group/family inline-flex items-center gap-2 whitespace-nowrap">
      <span className={`grid size-6 shrink-0 place-items-center rounded-sm ${TILE[id]}`} aria-hidden="true">
        <svg viewBox="0 0 16 16" className="size-4 overflow-visible" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {GLYPH[id]}
        </svg>
      </span>
      {children}
    </span>
  );
}
