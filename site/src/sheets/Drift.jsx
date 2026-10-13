/* ─────────────────────────────────────────────────────────
 * SHEET 2 · DRIFT — STORYBOARD (scroll-scrubbed)
 *
 *  0.00   ProfileCard as designed; the parts table is empty
 *  0.20   values morph designed → shipped (0.20 → 0.45)
 *  0.50   balloons ①–⑤ pop onto the drifted parts (staggered 40ms)
 *  0.50   parts table fills, one row per balloon
 *
 *  point at a row or a balloon: the part is outlined and its
 *  token name blooms beside the balloon
 * ───────────────────────────────────────────────────────── */
import { useLayoutEffect, useRef, useState } from 'react';
import { motion, useMotionValueEvent } from 'motion/react';
import { ProfileCard, designed, drifts } from '../parts/card.jsx';
import { Balloon } from '../site/Balloon.jsx';
import { SPRING, STAGGER, span } from '../site/motion.js';
import { Verdict } from '../figures/Verdict.jsx';

const TIMING = {
  morph: [0.2, 0.45], // designed → shipped
  balloons: 0.5, // balloons and table appear
};

// Where each balloon sits relative to its part: outside the part, never over its text.
const PLACE = {
  radius: (r, c) => ({ x: c.right + 6, y: c.top - 14 }),
  shadow: (r, c) => ({ x: c.right - 24, y: c.bottom + 10 }),
  gap: (r, c) => ({ x: c.left - 30, y: r.top + r.height / 2 - 10 }),
  badge: (r) => ({ x: r.left + r.width / 2 - 10, y: r.top - 28 }),
  pad: (r) => ({ x: r.left - 4, y: r.bottom + 8 }),
};
const PART = { radius: 'card', shadow: 'card', gap: 'header', badge: 'badge', pad: 'button' };

const lerp = (a, b, t) => a + (b - a) * t;

function valuesAt(t) {
  return {
    radius: `${lerp(4, 5, t)}px`,
    gap: `${lerp(12, 10, t)}px`,
    pad: `${lerp(12, 14, t)}px`,
    badge: `color-mix(in oklab, #2b4fe6 ${t * 100}%, var(--primary))`,
    shadow: t < 0.5 ? designed.shadow : '0 2px 8px rgb(0 0 0 / 0.12)',
  };
}

export function DriftFigure({ progress }) {
  const box = useRef(null);
  const card = useRef(null);
  const [t, setT] = useState(0);
  const [shown, setShown] = useState(false);
  const [point, setPoint] = useState(null);
  const [rects, setRects] = useState({});

  useMotionValueEvent(progress, 'change', (p) => {
    setT(span(p, ...TIMING.morph));
    setShown(p >= TIMING.balloons);
  });

  useLayoutEffect(() => {
    const measure = () => {
      if (!box.current || !card.current) return;
      const b = box.current.getBoundingClientRect();
      const rel = (el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left - b.left, top: r.top - b.top, right: r.right - b.left, bottom: r.bottom - b.top, width: r.width, height: r.height };
      };
      const out = {};
      card.current.querySelectorAll('[data-part]').forEach((el) => (out[el.dataset.part] = rel(el)));
      out.card = rel(card.current);
      setRects(out);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box.current);
    return () => ro.disconnect();
  }, [t]);

  const pointed = point && drifts.find((d) => d.id === point);
  const outline = pointed && rects[PART[pointed.id]];

  return (
    <div className="flex h-full flex-col items-center justify-center gap-10 xl:flex-row xl:gap-14">
      <div ref={box} className="relative w-full max-w-sm shrink-0">
        <ProfileCard ref={card} v={valuesAt(t)} instant />
        {outline && (
          <motion.span
            layoutId="drift-outline"
            transition={SPRING.settle}
            className="pointer-events-none absolute border border-dashed border-primary"
            style={{ left: outline.left - 4, top: outline.top - 4, width: outline.width + 8, height: outline.height + 8 }}
          />
        )}
        {rects.card &&
          drifts.map((d, i) => {
            const at = PLACE[d.id](rects[PART[d.id]], rects.card);
            return (
              <Balloon
                key={d.id}
                n={i + 1}
                verdict={d.verdict}
                label={d.fix ? `→ ${d.fix}` : undefined}
                open={point === d.id}
                shown={shown}
                onHover={(n) => setPoint(n ? d.id : null)}
                delay={i * STAGGER}
                style={{ left: at.x, top: at.y }}
              />
            );
          })}
      </div>

      <PartsTable shown={shown} point={point} setPoint={setPoint} />
    </div>
  );
}

function PartsTable({ shown, point, setPoint }) {
  return (
    <motion.table
      initial={false}
      animate={{ opacity: shown ? 1 : 0, y: shown ? 0 : 8 }}
      transition={SPRING.settle}
      className="plate w-full max-w-sm overflow-hidden font-mono text-xs max-xl:hidden"
      aria-hidden={!shown}
    >
      <caption className="pb-3 text-left font-sans text-sm font-semibold text-destructive">5 values off the scale</caption>
      <tbody>
        {drifts.map((d, i) => (
          <tr
            key={d.id}
            tabIndex={shown ? 0 : -1}
            onPointerEnter={() => setPoint(d.id)}
            onPointerLeave={() => setPoint(null)}
            onFocus={() => setPoint(d.id)}
            onBlur={() => setPoint(null)}
            className={`border-t border-border outline-none transition-colors first:border-0 ${point === d.id ? 'bg-secondary' : ''}`}
          >
            <td className="w-10 py-3 pl-4 align-top font-semibold text-primary">{String(i + 1).padStart(2, '0')}</td>
            <td className="py-3 align-top">
              <span className="block font-sans font-semibold text-foreground capitalize">{d.family}</span>
              <span className="block text-foreground">{d.wrote.length > 20 ? d.wrote.slice(0, 19) + '…' : d.wrote}</span>
            </td>
            <td className="py-3 pr-4 text-right align-top whitespace-nowrap">
              <Verdict kind={d.verdict} compact />
              <span className="block text-muted-foreground">{d.fix}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </motion.table>
  );
}

export const driftBeats = [
  { at: 0, body: <p>This is <b>ProfileCard</b> as the design system describes it: 12px between the avatar and the name, 4px corners, the lift shadow, the primary blue. Every value is a decision your theme already made.</p> },
  { at: 0.2, body: <p>And this is ProfileCard <b>as it shipped</b>. Keep scrolling and watch it change. It passed review, because nothing on it looks wrong.</p> },
  { at: TIMING.balloons, body: <p><b>Five values left the system.</b> A 10px gap, a 5px corner, a hand-typed shadow, a hex that is almost the primary, a 14px pad. Point at a number to see what it should have been.</p> },
];
