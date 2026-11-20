// algorecall's review stack as a template with named slots: DueStack.tsx, copied as it was on 2026-11-20 with each
// slot wrapped (status: how late each slab is; navigation: the rest of the queue, folded into a count). A slot shows
// the product's own part unless a variant places a library part in it.
import { createContext, useContext } from 'react'
import { ADAPTERS } from './adapters.jsx'
const Parts = createContext<Record<string, string>>({})
function Slot({ name, ctx, children, as: As = 'span' }: { name: string; ctx: any; children: React.ReactNode; as?: any }) {
  const parts = useContext(Parts); const p = parts[name] && (ADAPTERS as any)[parts[name]]
  return <As data-slot={name} data-part={parts[name] ?? 'house'} style={{ display: 'contents' }}>{p ? p.render(ctx) : children}</As>
}
import type { CSSProperties } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { PatternGlyph } from '@/platform/ui/pattern-glyphs'
import { patternFill, patternInk } from '@/platform/lib/pattern-hues'
import { edgeOf, usePress, type PressState } from '@/platform/motion/press'
import { cn } from '@/platform/lib/utils'
import type { DueSlab } from '@/pages/today/useTodayModel'
import { edgeDepth } from '@/pages/today/stackMath'
import '@/pages/today/today.css'

/* ─────────────────────────────────────────────────────────
 * DUE STACK — the hero figure of /today (TOD-06)
 *
 * One Laminate slab per due pattern, in session order, lying directly on one
 * another as strata. The top slab is the review's first card: it alone is lit
 * in its hue, and it IS a button — press it and it sinks onto its edge and the
 * review starts. The rest are paper carrying their coin; hovering, focusing or
 * pressing one makes it the subject of the recall curve beside the stack.
 *
 * Weight = fading: a slab's front edge grows with how far its estimated
 * recall has dropped below the ~90% review target (stackMath.edgeDepth, 3 →
 * 11px), so the thickest slab is the one whose curve dips lowest — the stack
 * and the recall curve never disagree. "N days over" stays as the text.
 *
 * Selected (the curve's subject): held in the hover state — lifted 1px on a
 * thicker edge — with its coin ringed in its hue.
 * First view of the day: the slabs drop in one by one (springs, 60ms stagger);
 * after that the stack is static. Reduced motion: the final stack.
 * `flyIds`: slabs that will fly to Coming up on a session return (layoutId).
 *
 * The whole stack casts ONE soft shadow onto a lattice that fades at its
 * edges (I-02 A). Every value comes from the SR state.
 * ───────────────────────────────────────────────────────── */

const MAX_SHOWN = 6
const DROP = { type: 'spring' as const, stiffness: 420, damping: 30 }
const DROP_STAGGER = 0.06
/** Press travel on top of the resting depth — the usePress grammar. */
const DEPTH_DELTA: Record<PressState, number> = { rest: 0, hover: 1, down: -2, disabled: 0 }
const TRAVEL: Record<PressState, number> = { rest: 0, hover: -1, down: 2, disabled: 0 }

function meta(s: DueSlab, premiere: boolean): { long: string; short: string } | null {
  if (s.recall === null) return premiere ? null : { long: 'new', short: 'new' }
  if (s.overdueDays === 0) return { long: 'due today', short: 'today' }
  const d = s.overdueDays
  return { long: `${d} day${d === 1 ? '' : 's'} over`, short: `${d}d over` }
}

interface SlabProps {
  slab: DueSlab
  top: boolean
  premiere: boolean
  selected: boolean
  onSelect: (id: string) => void
  onStart: () => void
  z: number
  index: number
  dropIn: boolean
  fly: boolean
}

function Slab({ slab, top, premiere, selected, onSelect, onStart, z, index, dropIn, fly }: SlabProps) {
  const hue = patternFill(slab.patternId)
  const face = top ? 'var(--lit-face)' : 'var(--card)'
  const { state: pressState, props } = usePress({ face })
  const state: PressState = !top && selected && pressState === 'rest' ? 'hover' : pressState
  const depth = edgeDepth(slab.recall)
  const m = meta(slab, premiere)
  const style: CSSProperties = {
    ...props.style,
    ['--h' as string]: hue,
    ['--h-ink' as string]: patternInk(slab.patternId),
    background: face,
    color: top ? 'var(--lit-ink)' : 'var(--foreground)',
    translate: props.style.translate === undefined ? undefined : `0 ${TRAVEL[state]}px`,
    // Front edge at its waiting weight (+ press delta) and a lit top lip. The stack's one cast shadow is on the parent.
    boxShadow: `0 ${Math.max(1, depth + DEPTH_DELTA[state])}px 0 ${edgeOf(face)}, inset 0 1px 0 oklch(from ${face} calc(l + 0.06) c h)`,
    marginBottom: depth,
    zIndex: z,
  }
  const label = top
    ? `Start review with ${slab.name}${m ? `, ${m.long}` : ''}`
    : `${slab.name}${m ? `, ${m.long}` : ''}. Show its recall curve`
  return (
    <motion.li
      className="relative"
      style={{ zIndex: z }}
      layoutId={fly ? `today-slab-${slab.patternId}` : undefined}
      initial={dropIn ? { y: -28, opacity: 0 } : false}
      animate={{ y: 0, opacity: 1 }}
      transition={dropIn ? { ...DROP, delay: index * DROP_STAGGER } : undefined}
    >
      <button
        type="button"
        {...props}
        style={style}
        onClick={top ? onStart : () => onSelect(slab.patternId)}
        onPointerEnter={(e) => {
          props.onPointerEnter(e)
          onSelect(slab.patternId)
        }}
        onFocus={() => onSelect(slab.patternId)}
        aria-label={label}
        aria-pressed={top ? undefined : selected}
        data-selected={selected || undefined}
        className={cn(
          'today-lit relative flex h-14 w-full min-w-0 cursor-pointer items-center gap-3 rounded-lg pr-3 pl-2 text-left outline-none sm:pr-4',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          !top && 'border border-border',
        )}
      >
        <span
          className="shrink-0 rounded-full transition-shadow duration-200"
          style={{ boxShadow: !top && selected ? `0 0 0 2px ${hue}` : '0 0 0 0 transparent' }}
        >
          <PatternGlyph pattern={slab.patternId} size={36} label={null} />
        </span>
        <span className={cn('min-w-0 flex-1 truncate', top ? 'font-heading text-base font-semibold tracking-[-0.01em]' : 'text-base font-medium')}>
          {slab.name}
        </span>
        {m && <Slot name="status" ctx={{ m, top, days: slab.overdueDays }}>
          <span className={cn('shrink-0 font-mono text-xs tabular-nums', !top && 'text-muted-foreground')} aria-hidden>
            <span className="hidden sm:inline">{m.long}</span>
            <span className="sm:hidden">{m.short}</span>
          </span>
        </Slot>}
      </button>
    </motion.li>
  )
}

function DueStack({
  slabs,
  premiere,
  selectedId,
  onSelect,
  onStart,
  dropIn = false,
  flyIds,
  className,
}: {
  slabs: DueSlab[]
  premiere: boolean
  selectedId: string | null
  onSelect: (id: string) => void
  onStart: () => void
  /** Drop the slabs in (first view of the day). */
  dropIn?: boolean
  /** Slabs that carry a layoutId for the session-return flight. */
  flyIds?: ReadonlySet<string>
  className?: string
}) {
  const reduced = useReducedMotion()
  const shown = slabs.slice(0, MAX_SHOWN)
  const rest = slabs.length - shown.length
  return (
    <figure className={cn('relative m-0', className)}>
      {/* The ground: a lattice that fades out at its edges. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-6 -inset-y-8 sm:-inset-x-10"
        style={{
          backgroundImage: 'radial-gradient(circle, color-mix(in oklab, var(--foreground) 13%, transparent) 1.1px, transparent 1.4px)',
          backgroundSize: '20px 20px',
          backgroundPosition: '10px 10px',
          maskImage: 'radial-gradient(ellipse 70% 65% at 50% 50%, black 45%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 65% at 50% 50%, black 45%, transparent 100%)',
        }}
      />
      <ol
        className="relative flex flex-col"
        style={{ filter: 'drop-shadow(8px 9px 6px oklch(0 0 0 / 0.09))' }}
        aria-label={`${slabs.length} pattern${slabs.length === 1 ? '' : 's'} due, in review order. The first one starts the review.`}
      >
        {shown.map((s, i) => (
          <Slab
            key={s.patternId}
            slab={s}
            top={i === 0}
            premiere={premiere}
            selected={s.patternId === selectedId}
            onSelect={onSelect}
            onStart={onStart}
            z={10 - i}
            index={i}
            dropIn={dropIn && !reduced}
            fly={!!flyIds?.has(s.patternId)}
          />
        ))}
        {rest > 0 && <Slot name="navigation" ctx={{ rest, total: slabs.length }}>
          <li className="mt-1 flex h-10 items-center rounded-lg border border-dashed border-border px-4 font-mono text-xs text-muted-foreground tabular-nums">
            +{rest} more
          </li>
        </Slot>}
      </ol>
    </figure>
  )
}

export function Organism({ parts = {}, ...props }: { parts?: Record<string, string> } & Parameters<typeof DueStack>[0]) {
  return <Parts.Provider value={parts}><DueStack {...props} /></Parts.Provider>
}
