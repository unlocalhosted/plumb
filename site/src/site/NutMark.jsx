/* ─────────────────────────────────────────────────────────
 * NUT MARK — a drift, marked on the part as a hex nut (the React Plumber's world: drift is a loose nut)
 *
 *  loose   a red hex nut with the drift's number. Pointed at, the drift's name blooms out beside it.
 *  fixed   the nut tightens: it turns 60° on `turn` (one flat: it sits square again) while it goes green,
 *          and the number becomes ✓. The turn is the fix, not decoration: the same verb the wrench performs.
 *  appear  pops on with `pop`, staggered by the caller
 *  reduced motion: no turn or pop; colour and ✓ only.
 * ───────────────────────────────────────────────────────── */
import { motion, useReducedMotion } from 'motion/react';
import { SPRING } from './motion.js';

const HEX = 'M12 1.5 L21.1 6.75 L21.1 17.25 L12 22.5 L2.9 17.25 L2.9 6.75 Z'; // flats left and right, 24 × 24

export function NutMark({ n, fixed = false, label, open = false, shown = true, delay = 0, onClick, style }) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={`${n}: ${fixed ? 'tightened, on the scale' : label}`}
      initial={false}
      animate={{ scale: shown ? 1 : 0, opacity: shown ? 1 : 0 }}
      transition={{ ...SPRING.pop, delay: shown ? delay : 0 }}
      style={style}
      className="group pointer-events-auto absolute z-10 flex cursor-pointer items-center gap-1.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="relative grid size-6 shrink-0 place-items-center">
        <motion.svg
          viewBox="0 0 24 24"
          className="absolute inset-0 size-6 drop-shadow-[0_1px_1px_rgb(16_24_40/.3)]"
          initial={false}
          animate={{ rotate: fixed && !reduce ? 60 : 0 }}
          transition={SPRING.turn}
        >
          <path d={HEX} className={`transition-colors duration-300 ${fixed ? 'fill-success' : 'fill-destructive'}`} />
          <path d={HEX} fill="none" stroke="#000" strokeOpacity=".2" strokeWidth="1" />
          {/* the lit top flats */}
          <path d="M4.2 7.4 L12 2.9 L19.8 7.4" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
        <span className="relative font-mono text-xs leading-none font-semibold text-white">{fixed ? '✓' : n}</span>
      </span>
      {label && !fixed && (
        <span className={`rounded-sm bg-background px-1.5 font-mono text-xs whitespace-nowrap text-foreground shadow-plate transition-[opacity,translate] duration-200 ${open ? 'opacity-100' : 'pointer-events-none -translate-x-1.5 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100'}`}>
          {label}
        </span>
      )}
    </motion.button>
  );
}
