// A reference numeral, as a manual puts on a part. The ring carries the verdict (colour and shape together), the
// number ties the part to its row in the parts list, and the name blooms out beside it when pointed at.
import { motion } from 'motion/react';
import { SPRING } from './motion.js';

const ring = { off: 'border-destructive text-destructive', near: 'border-warning text-warning', on: 'border-success bg-success text-background', idle: 'border-primary text-primary' };

export function Balloon({ n, verdict = 'idle', label, open = false, shown = true, side = 'right', delay = 0, onHover, onClick, style, className = '' }) {
  // with onClick the balloon is a control: it opens Plumb's reading for its part
  const Tag = onClick ? motion.button : motion.span;
  return (
    <Tag
      {...(onClick ? { type: 'button', onClick } : { role: 'img' })}
      aria-label={label ? `${n}: ${label}` : String(n)}
      onPointerEnter={() => onHover?.(n)}
      onPointerLeave={() => onHover?.(null)}
      initial={false}
      animate={{ scale: shown ? 1 : 0, opacity: shown ? 1 : 0 }}
      transition={{ ...SPRING.pop, delay: shown ? delay : 0 }}
      style={style}
      className={`pointer-events-auto absolute z-10 flex items-center gap-1.5 ${onClick ? 'cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring' : ''} ${side === 'left' ? 'flex-row-reverse' : ''} ${className}`}
    >
      <motion.span
        key={verdict}
        initial={{ scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={SPRING.pop}
        className={`grid size-5 shrink-0 place-items-center rounded-full border-2 bg-background font-mono text-xs leading-none ${ring[verdict]}`}
      >
        {verdict === 'on' ? '✓' : n}
      </motion.span>
      {label && (
        <motion.span
          initial={false}
          animate={{ opacity: open ? 1 : 0, x: open ? 0 : side === 'left' ? 6 : -6 }}
          transition={SPRING.settle}
          className="rounded-sm bg-background px-1.5 font-mono text-xs whitespace-nowrap text-foreground shadow-plate"
        >
          {label}
        </motion.span>
      )}
    </Tag>
  );
}
