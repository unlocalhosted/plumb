// #60 tooltip warm-up and cool-down. Folio, a magazine's editor: a feature on the tide at Saltburn, mid-edit. Every
// control on the toolbar has a tooltip with its name and shortcut, and all of them are wired the same way.
//   broken  each tooltip shows the moment the pointer arrives, so sweeping along the toolbar sets off every one you
//           cross, each gone again before you could read it
//   fixed   the first waits 500ms, the pause that means you stopped to look; then, while you keep moving along the
//           toolbar, the next ones come at once, until the pointer has been away 300ms (Radix: delayDuration 500,
//           skipDelayDuration 300)
// The viewer's hand is the probe. The marks are what plumber's tooltip probe measures: how long each one waited, and
// the ones that flashed (dashed ghosts where they were).
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChartIcon, FileIcon, MessageIcon, PathIcon, SparklesIcon } from '@unlocalhosted/dither-icons';
import tide from '../../media/s60-tide.jpg';
import nia from '../../media/people/person-03.jpg';
import owen from '../../media/people/person-08.jpg';

export const n = 60;
export const handsOn = true;

// plumber's marks layer (as the stage's PlumbLayer): a shadow root with plumber's tokens, so plumber reading the example never reads them
const TOKENS = '/__plumb/src/tokens.css';
function MarksLayer({ children }) {
  const host = useRef(null);
  const [root, setRoot] = useState(null);
  useEffect(() => {
    const r = host.current.shadowRoot ?? host.current.attachShadow({ mode: 'open' });
    r.innerHTML = `<link rel="stylesheet" href="${TOKENS}"><style>:host { position: absolute; inset: 0; pointer-events: none; overflow: visible; }</style>`;
    setRoot(r);
  }, []);
  return <div ref={host} data-scheme="light" aria-hidden="true" className="pointer-events-none absolute inset-0">{root ? createPortal(children, root) : null}</div>;
}
const hue = (off) => (off ? 'var(--pl-off)' : 'var(--pl-on)');
const Tag = ({ x, y, off, children }) => (
  <span style={{ position: 'absolute', left: x, top: y, transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', height: 20, padding: '0 var(--pl-space-3)',
    borderRadius: 'var(--pl-radius-tag)', font: '500 11px/1 var(--pl-mono)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
    color: 'var(--pl-on-accent)', background: hue(off), boxShadow: '0 0 0 1px var(--pl-halo)' }}>{children}</span>
);
const Ghost = ({ x, y, w, h }) => <span style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 6, border: `1px dashed ${hue(true)}`, opacity: 0.6 }} />;
// a box in the component's own pixels, whatever the stage's camera does to it
function local(root) {
  const o = root.getBoundingClientRect(), k = o.width / root.offsetWidth || 1;
  return (el) => { const r = el.getBoundingClientRect(); return { x: (r.left - o.left) / k, y: (r.top - o.top) / k, w: r.width / k, h: r.height / k }; };
}
function useTicking(on) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!on) return;
    let id = requestAnimationFrame(function f() { tick((x) => x + 1); id = requestAnimationFrame(f); });
    return () => cancelAnimationFrame(id);
  }, [on]);
}

/* ─────────────────────────────────────────────────────────
 * THE TOOLTIPS (Radix's numbers)
 *   first    500ms before the first one shows
 *   warm     300ms after one closes, the next skips the wait
 *   flash    a tooltip gone in under 250ms was never read
 * ───────────────────────────────────────────────────────── */
const FIRST = 500, WARM = 300, FLASH = 250;

// the toolbar, in order: a glyph or an icon, its name, its shortcut. null is a divider
const B = (cls, ch) => <span className={cls}>{ch}</span>;
const TOOLS = [
  ['style', 'Text style', '⌥⌘0'], null,
  [B('font-semibold', 'B'), 'Bold', '⌘B'], [B('italic font-[ui-serif,Georgia,serif]', 'I'), 'Italic', '⌘I'],
  [B('underline underline-offset-2', 'U'), 'Underline', '⌘U'], [B('line-through', 'S'), 'Strikethrough', '⇧⌘X'], null,
  [<PathIcon key="i" size={16} texture="dither" />, 'Link', '⌘K'], [<List key="i" />, 'Bulleted list', '⇧⌘8'], [<List key="i" numbered />, 'Numbered list', '⇧⌘7'], null,
  [<MessageIcon key="i" size={16} texture="dither" />, 'Comment', '⌥⌘M'], [<FileIcon key="i" size={16} texture="dither" />, 'Insert an image', ''], [<ChartIcon key="i" size={16} texture="dither" />, 'Insert a chart', ''], null,
  ['ai', 'Ask AI', '⌘J'],
];
// a list, drawn as the toolbar's letters are: three marks and three lines
function List({ numbered }) {
  return (
    <span aria-hidden="true" className="flex w-4 flex-col gap-[3px]">
      {[1, 2, 3].map((i) => (
        <span key={i} className="flex items-center gap-[3px]">
          {numbered ? <span className="w-1 text-[6px] leading-[3px] font-semibold">{i}</span> : <span className="size-[3px] rounded-full bg-current" />}
          <span className="h-[1.5px] flex-1 rounded-full bg-current" />
        </span>
      ))}
    </span>
  );
}
const SERIF = 'font-["New_York",ui-serif,Georgia,serif]';
// the article's own links, each with a hover card, wired as the toolbar's tooltips are: the reader crosses them on the
// way to something else (the comment in the margin), so a card that opens on arrival covers the line being read
const CARDS = [
  { label: 'Saltburn Scar', line: 'A reef bared at low tide, a mile out from the pier.', meta: 'Place · North Yorkshire' },
  { label: 'Tide times', line: 'Low water 07:42, 0.6 m. High water 13:58, 5.4 m.', meta: 'Saltburn · 14 March' },
];

// timing: the clip of two timings (ClipPage, /clip/60-timing) gives each place its own first wait, { tool, card } in ms
export default function FolioEditor({ side = 'broken', onStatus, clip = false, timing = null }) {
  const firstOf = (i) => (timing ? (i >= TOOLS.filter(Boolean).length ? timing.card : timing.tool) : FIRST);
  const root = useRef(null), tip = useRef(null);
  const tt = useRef({ timer: 0, lastClose: -Infinity });
  const [open, setOpen] = useState(null);      // { i, at } of the tooltip on screen
  const [visits, setVisits] = useState([]);   // { i, t, shown, gone, next, box }
  const fixed = side === 'fixed';
  const btns = () => [...(root.current?.querySelectorAll('[data-tool]') ?? [])];
  const now = () => performance.now();
  const waiting = visits.length > 0 && visits.at(-1).shown === null && visits.at(-1).gone === null;
  useTicking(waiting);
  useEffect(() => () => clearTimeout(tt.current.timer), []);

  // every tooltip on the toolbar is wired here, the same way
  // a held button means someone is selecting or dragging, not stopping to look: the fixed side opens nothing then
  const enter = (i, e) => {
    const t = now(), warm = t - tt.current.lastClose < WARM, held = (e?.buttons ?? 0) !== 0;
    clearTimeout(tt.current.timer);
    if (fixed && held) return;
    setVisits((v) => [...v.slice(-24), { i, t, shown: null, gone: null, next: warm, box: null, held }]);
    const wait = fixed ? (warm ? 0 : firstOf(i)) : 0;
    const show = () => {
      tt.current.showing = true;
      setOpen({ i, at: local(root.current)(btns()[i]) });
      setVisits((v) => v.map((x, j) => (j === v.length - 1 && x.i === i && x.shown === null ? { ...x, shown: now() } : x)));
    };
    if (wait) tt.current.timer = setTimeout(show, wait); else show();
  };
  const leave = () => {
    clearTimeout(tt.current.timer);
    // when it closed is kept at once: the next button's pointerenter comes in the same breath
    if (tt.current.showing) tt.current.lastClose = now();
    tt.current.showing = false;
    setOpen(null);
    setVisits((v) => v.map((x, j) => (j === v.length - 1 && x.gone === null ? { ...x, gone: now(), box: x.box ?? (tip.current && root.current ? local(root.current)(tip.current) : null) } : x)));
  };
  useLayoutEffect(() => {
    if (!open || !tip.current) return;
    const box = local(root.current)(tip.current);
    setVisits((v) => v.map((x, j) => (j === v.length - 1 ? { ...x, box } : x)));
  }, [open]);

  const shown = visits.filter((v) => v.shown !== null);
  const last = shown.at(-1), flashed = visits.filter((v) => v.shown !== null && v.gone !== null && v.gone - v.shown < FLASH && v.box);
  useEffect(() => {
    if (!last) return onStatus?.('Sweep your pointer along the toolbar, then come back to one button.');
    const wait = Math.round(last.shown - last.t);
    onStatus?.(!fixed
      ? `${shown.length} tooltip${shown.length === 1 ? '' : 's'} came up at once${flashed.length ? `, ${flashed.length} of them gone again in under ${FLASH}ms` : ''}: crossing the toolbar sets off every one.`
      : last.next ? `This one skipped the wait (${wait}ms): you were already reading tooltips.` : `The first waited ${wait}ms, long enough to mean you stopped. Keep moving and the next ones come at once.`);
  }, [last?.shown, flashed.length, fixed, onStatus]);

  const cur = visits.at(-1), t = now();
  const kind = (v) => (!fixed ? 'off' : v.next ? 'on' : 'sky');
  const tagText = (v) => { const w = Math.round(v.shown - v.t); return !fixed ? (v.held ? `${w}ms · mid-selection` : `${w}ms · no warm-up`) : v.next ? `${w}ms · warm ✓` : `${w}ms · warm-up`; };
  const tools = TOOLS.filter(Boolean), card = (j) => {
    const at = tools.length + j;
    return { 'data-tool': true, 'aria-label': CARDS[j].label, onPointerEnter: (e) => enter(at, e), onPointerLeave: leave };
  };
  return (
    <article ref={root} onPointerLeave={leave} className="relative w-[37.5rem] max-w-full rounded-sheet bg-surface shadow-window">
      <div role="toolbar" aria-label="Formatting" className="flex h-12 items-center gap-1.5 border-b-hairline border-line px-2.5">
        {TOOLS.map((tool, i) => {
          if (!tool) return <span key={'sep' + i} aria-hidden="true" className="h-4 w-hairline shrink-0 bg-line" />;
          const [glyph, label] = tool, at = TOOLS.slice(0, i).filter(Boolean).length;
          const own = { 'data-tool': true, 'aria-label': label, onPointerEnter: (e) => enter(at, e), onPointerLeave: leave };
          if (glyph === 'style') return (
            <button key={label} type="button" {...own} aria-label="Text style: Body text" className="flex h-8 shrink-0 items-center gap-1 rounded-control pr-2 pl-2.5 text-[13px] font-medium whitespace-nowrap ring-1 ring-line ring-inset hover:bg-sunken active:bg-line">
              Body text<span aria-hidden="true" className="text-[10px] text-ink-subtle">▼</span>
            </button>
          );
          if (glyph === 'ai') return (
            <button key={label} type="button" {...own} className="flex h-8 shrink-0 items-center gap-1 rounded-control pr-2.5 pl-2 text-[13px] font-medium whitespace-nowrap text-accent-deep hover:bg-accent-soft active:bg-accent/15">
              <SparklesIcon size={16} texture="dither" />Ask AI
            </button>
          );
          return (
            <button key={label} type="button" {...own} className="grid size-8 shrink-0 place-items-center rounded-control text-[15px] text-ink-muted hover:bg-sunken hover:text-ink active:bg-line">{glyph}</button>
          );
        })}
      </div>
      {open && open.i >= tools.length ? (() => {
        const c = CARDS[open.i - tools.length];
        return (
          <span ref={tip} role="tooltip" style={{ left: open.at.x - 8, top: open.at.y + open.at.h + 8 }}
            className="pointer-events-none absolute z-10 flex w-[248px] flex-col gap-1 rounded-control bg-surface p-3 text-left shadow-overlay ring-1 ring-line">
            <span className="text-[11px] font-semibold tracking-caps text-ink-muted uppercase">{c.meta}</span>
            <span className="text-[14px] font-semibold text-ink">{c.label}</span>
            <span className="text-[13px] leading-[18px] text-ink-muted">{c.line}</span>
          </span>
        );
      })() : open ? (() => {
        const [, label, key] = tools[open.i];
        return (
          <span ref={tip} role="tooltip" style={{ left: open.at.x + open.at.w / 2, top: open.at.y + open.at.h + 6 }}
            className="pointer-events-none absolute z-10 flex h-[26px] -translate-x-1/2 items-center gap-2 rounded-control bg-ink px-2 text-xs whitespace-nowrap text-surface shadow-overlay">
            {label}{key ? <kbd className="font-sans tracking-[0.04em] text-surface/60">{key}</kbd> : null}
          </span>
        );
      })() : null}

      <div className="relative px-14 pt-[30px] pb-2">
        <span className="block text-[11px] leading-4 font-semibold tracking-caps text-accent-deep uppercase case-forms">Coast · Spring issue</span>
        <h1 className={`mt-1.5 text-[30px] leading-9 font-medium tracking-[-0.01em] ${SERIF}`}>Low tide at Saltburn</h1>
        <span className="mt-3 flex items-center gap-2 text-[13px] text-ink-muted">
          <span className="flex">{[nia, owen].map((f, i) => <img key={i} src={f} alt="" className={'size-6 rounded-full object-cover ring-2 ring-surface ' + (i ? '-ml-1.5' : '')} />)}</span>
          <span>Words by <span className="font-medium text-ink">Nia Adebayo</span> · Photographs by <span className="font-medium text-ink">Owen Hale</span></span>
        </span>
        <p className={`mt-[18px] max-w-[28.5rem] text-[17px] leading-7 text-pretty ${SERIF}`}>
          The sea goes out so far here that the pier seems to stand on nothing. By seven the sand is ribbed and silver, and
          the <span className="bg-accent/15">dog walkers come down the cliff lift in pairs</span><span aria-hidden="true" className="-mx-px inline-block h-5 w-0.5 rounded-full bg-accent align-[-4px]" />, coats zipped to the chin.
        </p>
        <p className={`mt-[18px] max-w-[28.5rem] text-[17px] leading-7 text-pretty ${SERIF}`}>
          We walked the mile to <span {...card(0)} className="underline decoration-ink-subtle decoration-1 underline-offset-[3px]">the scar</span> before <span {...card(1)} className="underline decoration-ink-subtle decoration-1 underline-offset-[3px]">the tide turned</span>, and back again with wet boots and <span className="rounded-[2px] bg-caution-soft shadow-[inset_0_-2px_0_#e9b949]">a bag of sea glass</span>.
        </p>
        <span className="absolute top-[256px] right-4 flex h-[26px] items-center gap-1 rounded-full bg-surface pr-2 pl-[3px] text-xs font-medium text-ink-muted shadow-raised ring-1 ring-line">
          <img src={owen} alt="" className="size-5 rounded-full object-cover" /><span className="tabular-nums">2</span>
        </span>
        <figure className="mt-[22px]">
          <img src={tide} alt="The tide coming in over the sand, from above" className="block h-[184px] w-full rounded-control object-cover outline-1 -outline-offset-1 outline-black/10" />
          <figcaption className="mt-2 text-[12.5px] leading-[18px] text-ink-muted">The tide on its way back in, from the cliff path. Photograph: Owen Hale</figcaption>
        </figure>
      </div>
      <footer className="mt-[22px] flex h-11 items-center gap-2.5 rounded-b-sheet border-t-hairline border-line bg-sunken px-5 text-xs text-ink-muted">
        <span className="size-1.5 rounded-full bg-positive" />Saved 2 min ago<span>·</span><span className="tabular-nums">1,840 words, 8 min read</span>
        <span className="ml-auto flex items-center gap-2">
          <img src={nia} alt="" className="size-[22px] rounded-full object-cover shadow-[0_0_0_2px_var(--color-sunken),0_0_0_3.5px_#e0802a]" />Nia is editing
        </span>
      </footer>

      {clip ? (
        // the social clip's marks (ClipPage): no measurements, only the verdict on the card that is open, in words
        <MarksLayer>
          {cur && waiting && fixed && root.current ? (() => {
            const b = local(root.current)(btns()[cur.i]), k = Math.min(1, (t - cur.t) / firstOf(cur.i));
            return <span style={{ position: 'absolute', left: b.x, top: b.y + b.h + 1, width: b.w * k, height: 3, borderRadius: 2, background: 'var(--pl-on)' }} />;
          })() : null}
          {open && cur?.box && cur.gone === null ? (
            <>
              <span style={{ position: 'absolute', left: cur.box.x - 4, top: cur.box.y - 4, width: cur.box.w + 8, height: cur.box.h + 8, borderRadius: 10, boxSizing: 'border-box',
                border: `2px solid ${hue(!fixed)}`, animation: 'pl-clip-ring 260ms cubic-bezier(.3, 1.4, .5, 1) both' }} />
              <Tag x={cur.box.x} y={cur.box.y + cur.box.h + 20} off={!fixed}>{timing ? (cur.next ? 'Instant' : `After ${firstOf(cur.i)}ms`) : fixed ? 'Opened after a pause' : cur.held ? 'Opened mid-selection' : 'Opened instantly'}</Tag>
              <style>{'@keyframes pl-clip-ring { from { opacity: 0; transform: scale(.96) } to { opacity: 1; transform: none } }'}</style>
            </>
          ) : null}
        </MarksLayer>
      ) : <MarksLayer>
        {!fixed ? flashed.slice(-8).map((v, j) => <Ghost key={j} {...v.box} />) : null}
        {cur && waiting && fixed && root.current ? (() => {
          const b = local(root.current)(btns()[cur.i]), k = Math.min(1, (t - cur.t) / FIRST);
          return <span style={{ position: 'absolute', left: b.x + 4, top: b.y + b.h + 1, width: (b.w - 8) * k, height: 2, borderRadius: 1, background: 'var(--pl-sky)' }} />;
        })() : null}
        {last && last.box ? (last.i >= tools.length // a card is wide: its tag sits under it
          ? <Tag x={last.box.x} y={last.box.y + last.box.h + 18} off={kind(last) === 'off'}>{tagText(last)}</Tag>
          : <Tag x={last.box.x + last.box.w + 8} y={last.box.y + last.box.h / 2} off={kind(last) === 'off'}>{tagText(last)}</Tag>) : null}
      </MarksLayer>}
    </article>
  );
}
FolioEditor.names = ['At once', 'Warm-up'];
FolioEditor.lesson = {
  why: 'A tooltip that shows the moment the pointer arrives fires for everything you cross on the way somewhere else. Every control on this toolbar has one, so sweeping from Body text to Ask AI sets off all eleven, each flashing up and gone before you could read it.',
  habit: 'Wait about half a second for the first, the pause that means someone stopped to look; then, while they keep moving, show the next ones at once (Radix: delayDuration 500, skipDelayDuration 300). Never open one while a button is held: that is someone selecting text, not looking.',
};
