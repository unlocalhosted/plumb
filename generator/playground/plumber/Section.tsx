// React Plumber's section on craftingui.com as a template with named slots: crafting-ui's Plumber.tsx, copied as it
// was on 2026-11-20 with each slot wrapped (proof: the three steps; action: the install line; value: each family's
// share). A slot shows the product's own part unless a variant places a library part in it.
import { createContext, useContext } from 'react'
import { ADAPTERS } from './adapters.jsx'
const Parts = createContext<Record<string, string>>({})
function Slot({ name, ctx, children }: { name: string; ctx: any; children: React.ReactNode }) {
  const parts = useContext(Parts); const p = parts[name] && (ADAPTERS as any)[parts[name]]
  return <span data-slot={name} data-part={parts[name] ?? 'house'} style={{ display: 'contents' }}>{p ? p.render(ctx) : children}</span>
}
import { useEffect, useRef, useState } from 'react'
import { animate } from 'motion/react'
import { INK } from '@/components/SeenIn-shared'
import { drawOf } from '@/stickers'

/* ─────────────────────────────────────────────────────────
 * PLUMBER — the companion tool, under the contents
 *
 * React Plumber (../plumb) finds where a React + Tailwind UI drifts from
 * its design system and fixes it on the running page. Shown as this site's
 * own report (owner, 2026-11-05: "b with more animation and illustration";
 * then the first build "looks plain", its bob "badly drawn", the install
 * line should stand out).
 *
 *   words     the name, one line on what it is, then how it is used in
 *             three steps (check, see, fix; Alt and B drawn as keys), and
 *             the install command on a blue strip with its own Copy button.
 *             A plumb bob hung beside the words was dropped ("the hanging
 *             shit looks ass"); its sticker stays in the store
 *   report    "On your tokens" for this repo, each family a spirit level
 *             (chosen over ring gauges, with "semantic icons and scale"):
 *             the family's mark from the sticker store, a vial graduated
 *             with the family's own steps (owner: a scale of tenths "is
 *             still not semantic"), the bubble between the middle marks
 *             only when all of the family is on its steps. The numbers are the tool's real
 *             output on this repo (2026-11-05)
 *   on view   once: the report's bubbles travel to their places while the
 *             numbers count up
 * ───────────────────────────────────────────────────────── */

const lettering = 'measure text-[11px] tracking-[0.1em] uppercase'
const INSTALL = 'npm install -D @unlocalhosted/react-plumber'

/**
 * Each family with its own steps, from `npx plumber check --json` on this
 * repo (2026-11-05): `pct` is its share of declarations on the tokens,
 * `off` how many are not, `tokens` the theme's steps in the family's own
 * unit (colour: its tokens, dark to light).
 */
type Scale = { name: string; pct: number; off: string; unit: string; tokens: number[]; colours?: string[] }
const REPORT: Scale[] = [
  { name: 'z-index', pct: 3, off: '68', unit: 'layers', tokens: [] },
  { name: 'elevation', pct: 26, off: '92', unit: 'px lift', tokens: [0, 0, 6, 18] },
  { name: 'type', pct: 45, off: '1,416', unit: 'px', tokens: [11, 12, 14, 16, 18, 22, 28, 33, 40, 56] },
  { name: 'radius', pct: 48, off: '135', unit: 'px', tokens: [1, 2, 3, 4, 6] },
  { name: 'colour', pct: 71, off: '808', unit: '', tokens: [], colours: ['oklch(13% 0 0)', 'oklch(44% 0.27 264.8)', 'oklch(50.6% 0.289 264.8)', 'oklch(57% 0.2 28)', 'oklch(90% 0.05 268)', 'oklch(98.7% 0 0)'] },
  { name: 'motion', pct: 75, off: '246', unit: 'ms', tokens: [40, 80, 140, 150, 250, 350, 400, 500] },
  { name: 'spacing', pct: 75, off: '797', unit: 'px', tokens: [0, 2, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40] },
]

const TRAVEL = 0.9 // s: a mark travelling to its place
const STEP = 0.08 // s between families
const OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]

/** true once the element has come into view; at once under reduced motion, which shows the end state */
function useOnce<T extends Element>() {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } }, { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [seen])
  return [ref, seen] as const
}

/** a number that counts up to `to` once `run` is true */
function Count({ to, run, delay }: { to: number; run: boolean; delay: number }) {
  const el = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!run) return
    const a = animate(0, to, { duration: TRAVEL, delay, ease: OUT, onUpdate: (v) => { if (el.current) el.current.textContent = `${Math.round(v)}` } })
    return () => a.stop()
  }, [run, to, delay])
  return <span ref={el} className="tabular-nums">{run ? 0 : to}</span>
}

/** the install command, on a blue strip, with its own Copy button that says when it has copied */
function Install() {
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard?.writeText(INSTALL); setCopied(true); window.setTimeout(() => setCopied(false), 1600) }
  return (
    <div className="flex w-full max-w-[34rem] items-center gap-3 rounded-[10px] bg-draw-tint py-2 pr-2 pl-4">
      <span aria-hidden className="font-mono text-[13px] text-draw">$</span>
      <code className="min-w-0 flex-1 overflow-x-auto font-mono type-body-small whitespace-nowrap text-fg [scrollbar-width:none]">{INSTALL}</code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'Copied' : 'Copy the install command'}
        className={`press measure h-8 shrink-0 rounded-[7px] px-3 text-[11px] tracking-[0.1em] uppercase transition-colors duration-fast ${copied ? 'bg-surface text-draw' : 'bg-draw text-white hover:bg-draw/90'}`}
        style={copied ? undefined : { color: '#fff' }}
      >
        {copied ? 'Copied ✓' : 'Copy'}
      </button>
    </div>
  )
}

/**
 * A spirit level graduated with the family's own steps, evenly spaced (one
 * mark a step; colour's marks are its colours), its range and unit at the
 * ends. One reading only (owner, 2026-11-05: steps, drift values and the
 * bubble together "looks like noise"): the bubble rests between the dashed
 * middle marks only when all of the family is on its steps, and sits as far
 * out as it drifts.
 */
const PAD = 16 // px: the marks start and end this far inside the vial, clear of its rounded ends
const at = (t: number) => `calc(${PAD}px + ${t} * (100% - ${2 * PAD}px))`
/** where a share of drift puts the bubble: 0 the middle, 1 the right end */
const bubbleAt = (d: number) => `calc(50% + ${d} * (50% - 16px))`

function Level({ s, i, seen }: { s: Scale; i: number; seen: boolean }) {
  const drift = (100 - s.pct) / 100
  const mark = drawOf(`family-${s.name}`, 'paper')
  const steps = s.colours ?? s.tokens
  const even = (k: number) => (steps.length > 1 ? k / (steps.length - 1) : 0.5)
  const [low, high] = s.colours ? ['dark', 'light'] : s.tokens.length ? [`${s.tokens[0]}`, `${s.tokens[s.tokens.length - 1]} ${s.unit}`] : ['no tokens yet', '']
  return (
    <div className="grid grid-cols-[1.5rem_5rem_minmax(0,1fr)_3.5rem] items-center gap-x-3">
      {mark ? <svg viewBox="36 12 24 24" className="size-6" aria-hidden>{mark(INK, `fam-${s.name}`)}</svg> : <span />}
      <span className="font-mono type-body-small text-fg">{s.name}</span>
      <span className="relative pb-4">
        <span className="relative block h-[18px] rounded-full border border-draw bg-surface">
          {steps.map((c, k) => s.colours ? (
            <span key={k} className="absolute top-1/2 size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-draw" style={{ left: at(even(k)), background: c as string }} />
          ) : (
            <span key={k} className="absolute bottom-0 h-[5px] w-px -translate-x-1/2 bg-draw/60" style={{ left: at(even(k)) }} />
          ))}
          <span className="absolute inset-y-[2px] left-1/2 w-[30px] -translate-x-1/2 border-x border-dashed border-draw/60" />
          <span
            className="absolute top-1/2 h-[10px] w-[24px] rounded-full border border-draw bg-draw-tint/80"
            style={{ left: `calc(${bubbleAt(seen ? drift : 1)} - 12px)`, transform: 'translateY(-50%)', transition: `left ${TRAVEL}s cubic-bezier(.34,1.3,.64,1) ${i * STEP}s` }}
          />
        </span>
        <span className="absolute inset-x-[16px] bottom-0 flex justify-between font-mono text-[9px] leading-3 whitespace-nowrap text-muted">
          <span>{low}</span><span>{high}</span>
        </span>
      </span>
      <span className="text-right font-read text-md text-fg"><Slot name="value" ctx={{ pct: s.pct, run: seen, delay: i * STEP, travel: TRAVEL }}><Count to={s.pct} run={seen} delay={i * STEP} />%</Slot><span className="sr-only">, {s.off} off</span></span>
    </div>
  )
}

function Levels({ seen }: { seen: boolean }) {
  return (
    <div className="grid min-w-0 content-start gap-[20px]">
      <span className={`${lettering} text-muted`}>This site, checked by its own tool</span>
      <div className="grid gap-[20px]">{REPORT.map((s, i) => <Level key={s.name} s={s} i={i} seen={seen} />)}</div>
      <span className="font-read type-body-large text-muted">Each level is marked with that family's own steps. The bubble sits between the middle marks only when every value is one of them.</span>
    </div>
  )
}

/** a key on the keyboard, set in a sentence: paper, an ink edge, a deeper edge underneath */
function Key({ children }: { children: string }) {
  return <kbd className="mx-0.5 inline-grid h-[22px] min-w-[22px] place-items-center rounded-[5px] border border-b-2 border-draw bg-surface px-1.5 align-[1px] font-mono type-body-small text-draw">{children}</kbd>
}

/** how it works, three steps, each a verb and one line */
const STEPS: [string, React.ReactNode][] = [
  ['Check', <><code className="font-mono type-body-small text-fg">npx plumber check</code> in your terminal or CI. Only new drift fails.</>],
  ['See', <>Hold <Key>Alt</Key><Key>B</Key> on your running page. Every drift is marked where it is.</>],
  ['Fix', <>Each one comes with the file, the line and the exact edit.</>],
]

export function Organism({ parts = {} }: { parts?: Record<string, string> }) {
  const [ref, seen] = useOnce<HTMLElement>()
  return (
    <Parts.Provider value={parts}><section ref={ref} aria-label="React Plumber" className="mt-24 grid grid-cols-[minmax(0,1fr)] gap-x-10 gap-y-10 border-t border-line pt-10 lg:grid-cols-[11rem_minmax(0,1fr)_minmax(0,1fr)]">
      <span className={`${lettering} text-muted`}>The companion tool</span>
      <div className="flex min-w-0 flex-col gap-[28px]">
        <div className="flex flex-col gap-[12px]">
          <h2 className="font-read type-headline-small">React Plumber</h2>
          <p className="max-w-[28rem] font-read type-title-large text-muted">
            Finds where your React and Tailwind interface drifts from its own design system.
          </p>
        </div>
        <Slot name="proof" ctx={{ steps: STEPS }}><ol className="flex max-w-[30rem] flex-col gap-[12px]">
          {STEPS.map(([verb, line]) => (
            <li key={verb} className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-baseline gap-x-3">
              <span className={`${lettering} text-draw`}>{verb}</span>
              <span className="font-read type-title-large text-fg">{line}</span>
            </li>
          ))}
        </ol></Slot>
        <Slot name="action" ctx={{ install: INSTALL }}><Install /></Slot>
      </div>
      <Levels seen={seen} />
    </section></Parts.Provider>
  )
}
