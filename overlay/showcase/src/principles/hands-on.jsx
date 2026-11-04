// Hands-on examples (docs/craft/tactile-demos.md, .claude/skills/craft-rule §3¾): for a principle whose mistake only
// exists while someone does something, the viewer's own hand is the probe. Each example is one component with two
// sides (`side`: 'broken' | 'fixed', as the probe stage's are): the real component, which really behaves that way, and
// plumber's marks drawn live from what the viewer just did. Marks are a vocabulary, not a kit: each draws one number
// plumber's rule measures and the lesson turns on, and nothing else (no trail unless the path is the lesson).
//
// The marks live in a shadow root with plumber's tokens (overlay/src/tokens.css), as the stage's PlumbLayer does, so
// plumber reading [data-example] never reads them. Each example says what just happened through `onStatus`.
//
// HANDS_ON[n] = Component, with .names (the switch, naming the technique) and .lesson ({ why, habit }).
// The rule page (Principle.jsx) shows them with their switch, what just happened, and the lesson.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import valley from '../media/valley.jpg';
import { ChartIcon, CheckIcon, CodeIcon, LayersIcon, FileIcon, FolderIcon, HistoryIcon, PlusIcon, RetryIcon, SlidersIcon, SparklesIcon } from '@unlocalhosted/dither-icons';

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

// plumber's marks, as the stage draws them (Principle.jsx Marks): 1px lines at 55%, hatch at 45°, the blueprint tag
const hue = (off) => (off ? 'var(--pl-off)' : 'var(--pl-on)');
const Line = ({ x, y, h, off, dashed }) => (
  <span style={{ position: 'absolute', left: x, top: y, width: 0, height: h, borderLeft: `1px ${dashed ? 'dashed' : 'solid'} ${hue(off)}`, opacity: dashed ? 0.8 : 0.55 }} />
);
const Hatch = ({ x, y, w, h }) => (
  <span style={{ position: 'absolute', left: x, top: y, width: w, height: h, opacity: 0.55, backgroundImage: 'repeating-linear-gradient(45deg, var(--pl-off) 0 1px, transparent 1px 4px)' }} />
);
const Outline = ({ x, y, w, h, off, r = 4 }) => (
  <span style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: r, boxShadow: `inset 0 0 0 1px ${hue(off)}`, opacity: 0.7 }} />
);
const Tag = ({ x, y, off, end, children }) => (
  <span style={{ position: 'absolute', left: x, top: y, transform: end ? 'translate(-100%, -50%)' : 'translateY(-50%)', display: 'flex', alignItems: 'center', height: 20, padding: '0 var(--pl-space-3)',
    borderRadius: 'var(--pl-radius-tag)', font: '500 11px/1 var(--pl-mono)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
    color: 'var(--pl-on-accent)', background: hue(off), boxShadow: '0 0 0 1px var(--pl-halo)', animation: 'none' }}>{children}</span>
);

// a box in the example's own pixels, whatever the stage's camera does to it (a scale on an ancestor)
function local(root) {
  const o = root.getBoundingClientRect(), k = o.width / root.offsetWidth || 1;
  return (el) => { const r = el.getBoundingClientRect(); return { x: (r.left - o.left) / k, y: (r.top - o.top) / k, w: r.width / k, h: r.height / k }; };
}

// ── #42 Bold on hover must not shift layout ─────────────────────────────────
// A project's views as tabs. Broken: hover:font-semibold, the habit plumber flags (ProjectTabs). Semibold letters are
// wider, so the tab under the pointer grows and every tab after it slides. Fixed: plumber's fix, darker on hover.
// The marks: only what moved and by how much. Each later tab's resting edge (a dashed line), the ground it slid across
// (hatch), the tab that grew (an outline), and the shift in px, read from the real tabs against where they rest.
// No trail, no ruler: the route and the time aren't the lesson.
const VIEWS = ['Overview', 'Board', 'Timeline', 'Files', 'Settings'];
const TASKS = [
  ['Brief the press list', 'LR', 'Thu', true],
  ['Final cut of the launch film', 'JB', 'Fri', true],
  ['Pricing page copy', 'AO', '12 Mar', false],
];
function BoldHover({ side = 'broken', onStatus }) {
  const root = useRef(null), nav = useRef(null);
  const [rest, setRest] = useState(null);
  const [read, setRead] = useState(null); // the last hover read: held after the pointer leaves, until the next one
  const hover = side === 'broken' ? 'hover:font-semibold hover:text-ink' : 'hover:text-ink';
  const tabs = () => [...(nav.current?.querySelectorAll('a') ?? [])];
  // where each tab rests, read with nothing hovered: on mount, on each side, once the font is in, on resize
  const measure = () => { if (!root.current || tabs().some((t) => t.matches(':hover'))) return; const at = local(root.current); setRest(tabs().map(at)); };
  useLayoutEffect(() => { measure(); setRead(null); }, [side]);
  useEffect(() => {
    document.fonts?.ready.then(measure);
    const ro = new ResizeObserver(() => measure());
    ro.observe(root.current);
    return () => ro.disconnect();
  }, []);
  // read on the next frame: the pointer's events arrive before the browser has moved :hover (and the weight with it)
  const look = () => requestAnimationFrame(readHover);
  const readHover = () => {
    if (!rest || !root.current) return;
    const list = tabs(), i = list.findIndex((t) => t.matches(':hover'));
    if (i <= 0) return; // nothing, or the current view (it's already semibold)
    const at = local(root.current), now = list.map(at);
    const after = now.map((_, j) => j).filter((j) => j > i);
    const shift = Math.max(0, ...after.map((j) => now[j].x - rest[j].x));
    setRead({ i, now, after, shift });
  };
  useEffect(() => {
    if (!read) return onStatus?.('Run your pointer along the tabs, slowly.');
    const name = VIEWS[read.i], n = read.after.length;
    onStatus?.(read.shift >= 0.5
      ? `${name} turned semibold and grew ${read.shift.toFixed(1)}px, so the ${n} tab${n === 1 ? '' : 's'} after it slid over by that much. Every tab you cross does it again.`
      : `${name} darkened and kept its width: nothing after it moved.`);
  }, [read, onStatus]);

  const off = read && read.shift >= 0.5;
  return (
    <article ref={root} onPointerMove={look} onPointerOver={look} className="relative w-[30rem] max-w-full rounded-card bg-surface shadow-card">
      <header className="flex items-center gap-2 px-5 pt-4 pb-3">
        <FolderIcon size={16} texture="dither" className="text-ink-muted" />
        <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Spring launch</span>
        <span className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-control pr-2.5 pl-2 text-[13px] font-medium text-ink-muted ring-1 ring-line ring-inset"><PlusIcon size={14} texture="solid" />New task</span>
      </header>
      <nav ref={nav} aria-label="Views" className="flex gap-5 border-b-hairline border-line px-5">
        {VIEWS.map((v, i) => (
          <a key={v} href={`#${v.toLowerCase()}`} onClick={(e) => e.preventDefault()} aria-current={i === 0 ? 'page' : undefined}
            className={i === 0 ? '-mb-px border-b-2 border-ink py-2.5 text-sm font-semibold' : `border-b-2 border-transparent py-2.5 text-sm text-ink-muted ${hover}`}>{v}</a>
        ))}
      </nav>
      <ul className="px-3 py-2">
        {TASKS.map(([task, who, due, soon]) => (
          <li key={task} className="flex h-10 items-center gap-3 px-2 text-[13px]">
            <span className="size-3.5 shrink-0 rounded-full ring-[1.25px] ring-ink/25 ring-inset" />
            <span className="min-w-0 flex-1 truncate">{task}</span>
            <span className="grid size-6 place-items-center rounded-full bg-sunken text-[10px] font-medium text-ink-muted ring-1 ring-line ring-inset">{who}</span>
            <span className={'w-14 rounded-chip px-1.5 py-1 text-center text-[11px] font-medium ' + (soon ? 'bg-caution-soft text-caution' : 'text-ink-subtle')}>{due}</span>
          </li>
        ))}
      </ul>
      <MarksLayer>
        {read && rest ? (
          <>
            {off ? <Outline {...read.now[read.i]} y={read.now[read.i].y + 6} h={read.now[read.i].h - 12} off /> : null}
            {read.after.map((j) => (
              <span key={j}>
                <Line x={rest[j].x} y={rest[j].y + 6} h={rest[j].h - 12} off={off} dashed={off} />
                {off ? <Hatch x={rest[j].x} y={rest[j].y + 10} w={read.now[j].x - rest[j].x} h={rest[j].h - 20} /> : null}
              </span>
            ))}
            {(() => { const last = read.now.at(-1); return <Tag x={last.x + last.w + 10} y={last.y + last.h / 2} off={off}>{off ? `+${read.shift.toFixed(1)}px · ${read.after.length} slid` : '0px ✓'}</Tag>; })()}
          </>
        ) : null}
      </MarksLayer>
    </article>
  );
}
BoldHover.names = ['Bold on hover', 'Darker on hover'];
BoldHover.lesson = {
  why: 'Bold letters are wider than regular ones. When a tab turns semibold under the pointer it grows a few pixels, and every tab after it slides over: move along the row and the whole row jitters under your cursor.',
  habit: 'Show hover with colour, not weight. If a hover must be bold, reserve the bold width first (a hidden bold copy of the label).',
};

// The time ruler under an example (probe-marks.html's): 0 to `span` ms from the gesture's start, what has played, the
// events on it. Drawn in the marks layer, under the component.
function Ruler({ top, width, span, played, kind, events, label = 'live' }) {
  const x = (ms) => (Math.min(span, Math.max(0, ms)) / span) * width;
  const step = span <= 1200 ? 100 : 250, major = span <= 1200 ? 200 : 1000;
  const ticks = [];
  for (let ms = 0; ms <= span; ms += step) ticks.push(ms);
  const col = (k) => (k === 'off' ? 'var(--pl-off)' : k === 'on' ? 'var(--pl-on)' : 'var(--pl-sky)');
  return (
    <div style={{ position: 'absolute', left: 0, top, width, height: 40 }}>
      <span style={{ position: 'absolute', right: 0, top: -6, font: '600 10.5px/14px var(--pl-sans)', color: 'var(--pl-ink-2)' }}>{label}</span>
      <span style={{ position: 'absolute', left: 0, right: 0, top: 16, borderTop: '1px solid var(--pl-ink-3)' }} />
      {ticks.map((ms) => (
        <span key={ms}>
          <span style={{ position: 'absolute', left: x(ms), top: ms % major ? 14 : 12, width: 1, height: ms % major ? 4 : 8, background: 'var(--pl-ink-3)' }} />
          {ms % major ? null : <span style={{ position: 'absolute', left: Math.min(width - 14, Math.max(8, x(ms))), top: 22, transform: 'translateX(-50%)', font: '400 10.5px/14px var(--pl-mono)', color: 'var(--pl-ink-2)' }}>{ms >= 1000 ? `${ms / 1000}s` : ms}</span>}
        </span>
      ))}
      {played > 0 ? <span style={{ position: 'absolute', left: 0, top: 15, height: 3, width: x(played), borderRadius: 2, background: col(kind) }} /> : null}
      {events.map(([ms, k], i) => (
        <span key={i} style={{ position: 'absolute', left: x(ms), top: k ? 11 : 13, width: k ? 11 : 7, height: k ? 11 : 7, marginLeft: k ? -5.5 : -3.5, borderRadius: '50%',
          background: k ? col(k) : '#fff', boxShadow: k ? '0 0 0 2px #fff' : '0 0 0 1.5px var(--pl-sky)' }} />
      ))}
      <span style={{ position: 'absolute', left: x(played), top: 4, width: 2, height: 24, marginLeft: -1, borderRadius: 1, background: 'var(--pl-sky)', boxShadow: '0 0 0 1px #fff' }} />
    </div>
  );
}
// hollow, so the word you pressed still reads through it
const Contact = ({ x, y }) => <span style={{ position: 'absolute', left: x - 5, top: y - 5, width: 10, height: 10, borderRadius: '50%', boxShadow: '0 0 0 1.5px var(--pl-sky), 0 0 0 3px var(--pl-halo)' }} />;
const Ghost = ({ x, y, w, h, r = 10, off = true }) => <span style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: r, border: `1px dashed ${hue(off)}`, opacity: 0.6 }} />;

// a clock that ticks while `on`, for marks that grow while you hold
function useTicking(on) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!on) return;
    let id = requestAnimationFrame(function f() { tick((n) => n + 1); id = requestAnimationFrame(f); });
    return () => cancelAnimationFrame(id);
  }, [on]);
}

// ── #61 Menus open on pointerdown, with press-drag-release ─────────────────
// A shared folder's View menu. Broken: the menu a hand-rolled one is, opened by onClick, so it opens when the button
// comes back up. Fixed: opened on pointerdown, as Radix's DropdownMenu and Base UI's Menu do; held, the item under
// the pointer is chosen when you let go, so press, drag, release picks in one motion.
// plumber's probe (src/craft-probe.ts menuDown) presses and holds and reads whether the press alone opened it. The
// marks are that: where you pressed, and the ruler from the press to the moment it opened. The drag-release half
// isn't probed yet, so it gets no mark: the product shows it (the list re-sorts), the status says it in words.
const FILES = [
  ['Brand guidelines.pdf', '2 Mar', 4.8], ['Logo, final.svg', '28 Feb', 0.2], ['Launch film, cut 3.mov', '4 Mar', 812],
  ['Press release.doc', '1 Mar', 0.3], ['Photography', '26 Feb', 240],
];
const SORTS = [['name', 'Name'], ['date', 'Date modified'], ['size', 'Size']];
const dated = (d) => new Date(`${d} 2026`).getTime();
const sortBy = { name: (a, b) => a[0].localeCompare(b[0]), date: (a, b) => dated(b[1]) - dated(a[1]), size: (a, b) => b[2] - a[2] };
const sized = (mb) => (mb >= 1 ? `${mb >= 100 ? Math.round(mb) : mb} MB` : `${Math.round(mb * 1000)} KB`);
function MenuPress({ side = 'broken', onStatus }) {
  const root = useRef(null), sheet = useRef(null), trigger = useRef(null), menu = useRef(null);
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState('name');
  const [over, setOver] = useState(null);
  const [g, setG] = useState(null); // the press: { at, t0, held, opened, up, picked, missed }
  const [footprint, setFootprint] = useState(null); // where the menu sits when open, for the ghost
  const fixed = side === 'fixed';
  useTicking(!!g?.held);
  const now = () => performance.now();
  const at = () => (root.current ? local(root.current) : null);
  // where the menu sits (it keeps its box while closed, only invisible), for the ghost of a release that missed it
  useLayoutEffect(() => { if (menu.current && root.current) setFootprint(at()(menu.current)); }, []);

  const pick = (key) => { setSort(key); setOpen(false); setOver(null); };
  const opened = () => setG((p) => (p && p.opened === null ? { ...p, opened: now() - p.t0 } : p));
  useEffect(() => {
    const down = (e) => { if (open && !root.current?.querySelector('[data-menu-area]')?.contains(e.target)) { setOpen(false); setOver(null); } };
    const key = (e) => { if (e.key === 'Escape') { setOpen(false); setOver(null); } };
    window.addEventListener('pointerdown', down); window.addEventListener('keydown', key);
    return () => { window.removeEventListener('pointerdown', down); window.removeEventListener('keydown', key); };
  }, [open]);

  const onDown = (e) => {
    if (e.button !== 0) return;
    if (fixed) e.preventDefault(); // the press is the menu's: no focus ring, and the click after it is ignored
    // a press that closes it is no try: the broken menu closes on its click, the fixed one on this press
    if (open) { setG(null); if (fixed) { setOpen(false); setOver(null); } return; }
    const o = root.current.getBoundingClientRect(), k = o.width / root.current.offsetWidth || 1;
    setG({ at: { x: (e.clientX - o.left) / k, y: (e.clientY - o.top) / k }, t0: now(), held: true, opened: fixed ? 0 : null, up: null, picked: null, missed: null });
    if (fixed) setOpen(true);
  };
  // the release: where the hand let go, wherever that is
  useEffect(() => {
    if (!g?.held) return;
    const up = (e) => {
      const t = now() - g.t0;
      const item = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-sort]');
      const onTrigger = trigger.current?.contains(document.elementFromPoint(e.clientX, e.clientY));
      if (fixed && item && open) { pick(item.dataset.sort); setG((p) => ({ ...p, held: false, up: t, picked: item.dataset.sort })); return; }
      // broken: a release away from the button is no click, so nothing opens; over where an item would be is a miss
      const missed = !fixed && !onTrigger ? (footprint && (() => { const o = root.current.getBoundingClientRect(), k = o.width / root.current.offsetWidth || 1, p = { x: (e.clientX - o.left) / k, y: (e.clientY - o.top) / k }; return p.x >= footprint.x && p.x <= footprint.x + footprint.w && p.y >= footprint.y && p.y <= footprint.y + footprint.h; })()) : false;
      setG((p) => ({ ...p, held: false, up: t, missed }));
    };
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, [g?.held, open, fixed, footprint]);
  const onClick = (e) => {
    if (fixed && e.detail) return; // a pointer opened it already, on the press
    if (e.detail === 0) setG(null); // a keyboard click: no press to time
    else if (!open) opened();
    setOpen(!open); setOver(null);
  };

  useEffect(() => {
    const say = !g ? 'Press View and hold it. Then try it in one motion: press, drag down to Date modified, let go.'
      : g.held ? (g.opened === null ? 'Holding… the menu hasn’t opened.' : 'Open on the press. Still holding: drag to an item and let go.')
      : g.picked ? `Sorted by ${SORTS.find(([k]) => k === g.picked)[1].toLowerCase()}, in one press: down, drag, up.`
      : g.missed ? 'You let go where the menu would be, but it opens on the click, and a release away from the button is no click. Nothing was picked.'
      : g.opened !== null && !fixed ? `It opened only when you let go, ${Math.round(g.opened)}ms after the press.`
      : g.opened === 0 ? 'It opened on the press and stays open; pick an item.'
      : 'Nothing opened.';
    onStatus?.(say);
  }, [g, onStatus, fixed]);

  const files = [...FILES].sort(sortBy[sort]);
  const card = sheet.current ? { w: sheet.current.offsetWidth, h: sheet.current.offsetHeight } : null;
  const t = g ? (g.held ? now() - g.t0 : g.opened ?? g.up ?? 0) : 0;
  const late = g && g.opened !== null && g.opened > 0;
  const kind = !g ? '' : g.opened === 0 ? 'on' : late || (g.up !== null && g.opened === null) ? 'off' : '';
  return (
    // the component, and room under it for plumber's ruler
    <div ref={root} className="relative w-[30rem] max-w-full pb-14">
    <article ref={sheet} className="rounded-card bg-surface shadow-card">
      <header className="flex items-center gap-2 px-5 pt-4 pb-3">
        <FolderIcon size={16} texture="dither" className="text-ink-muted" />
        <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Brand</span>
        <span className="text-[13px] text-ink-subtle">· Shared drive</span>
        <div data-menu-area className="relative ml-auto">
          <button ref={trigger} type="button" aria-haspopup="menu" aria-expanded={open} onPointerDown={onDown} onClick={onClick}
            className={'inline-flex h-7 items-center gap-1.5 rounded-control pr-2.5 pl-2 text-[13px] font-medium ring-1 ring-line ring-inset select-none ' + (open ? 'bg-sunken text-ink' : 'text-ink-muted hover:bg-sunken hover:text-ink')}>
            <SlidersIcon size={14} texture="solid" />View
          </button>
          <div ref={menu} role="menu" aria-label="View" aria-hidden={!open} inert={!open} className={'absolute top-9 right-0 z-10 w-52 rounded-card bg-surface p-1 shadow-popover ring-1 ring-line ' + (open ? '' : 'invisible')}>
            <p className="px-2 pt-1.5 pb-1 text-[11px] font-medium tracking-[0.04em] text-ink-subtle uppercase">Sort by</p>
            {SORTS.map(([key, label]) => (
              <button key={key} type="button" role="menuitemradio" aria-checked={sort === key} data-sort={key}
                onPointerEnter={() => setOver(key)} onPointerLeave={() => setOver((o) => (o === key ? null : o))} onClick={() => pick(key)}
                className={'flex h-8 w-full items-center gap-2 rounded-control px-2 text-left text-[13px] ' + (over === key ? 'bg-sunken' : '')}>
                <span className="grid size-4 place-items-center text-accent">{sort === key ? <CheckIcon size={14} texture="solid" /> : null}</span>{label}
              </button>
            ))}
          </div>
        </div>
      </header>
      <div className="grid grid-cols-[1fr_5rem_4.5rem] gap-3 border-b-hairline border-line px-5 pb-2 text-[11px] font-medium tracking-[0.04em] text-ink-subtle uppercase">
        <span>Name</span><span>Modified</span><span className="text-right">Size</span>
      </div>
      <ul className="px-3 py-1.5">
        {files.map(([name, date, mb]) => (
          <li key={name} className="grid h-9 grid-cols-[1fr_5rem_4.5rem] items-center gap-3 px-2 text-[13px]">
            <span className="flex min-w-0 items-center gap-2.5">{mb >= 100 && !name.includes('.') ? <FolderIcon size={14} texture="solid" className="shrink-0 text-ink-subtle" /> : <FileIcon size={14} texture="solid" className="shrink-0 text-ink-subtle" />}<span className="truncate">{name}</span></span>
            <span className="text-ink-muted">{date}</span>
            <span className="text-right text-ink-muted tabular-nums">{sized(mb)}</span>
          </li>
        ))}
      </ul>
    </article>
      <MarksLayer>
        {g ? <Contact {...g.at} /> : null}
        {g?.missed && footprint ? <Ghost {...footprint} /> : null}
        {g && card ? (() => {
          const tr = at()?.(trigger.current);
          return late || kind === 'on' || (g.up !== null && g.opened === null) ? (
            <Tag end x={(tr?.x ?? 0) - 8} y={(tr?.y ?? 0) + (tr?.h ?? 0) / 2} off={kind !== 'on'}>
              {kind === 'on' ? '0ms · on the press' : g.opened === null ? 'never opened while held' : `${Math.round(g.opened)}ms · on release`}
            </Tag>
          ) : null;
        })() : null}
        {card ? <Ruler top={card.h + 14} width={card.w} span={1000} played={t} kind={kind}
          events={g ? [[0, ''], ...(g.opened !== null ? [[g.opened, g.opened === 0 ? 'on' : 'off']] : []), ...(g.up !== null && g.up !== g.opened ? [[g.up, '']] : [])] : []} /> : null}
      </MarksLayer>
    </div>
  );
}
MenuPress.names = ['Opens on click', 'Opens on press'];
MenuPress.lesson = {
  why: 'A menu that opens on click waits for the button to come back up, so a press only opens it on release. And it can’t do what desktop menus do: press, drag to an item, let go. A release away from the button is no click at all.',
  habit: 'Open menus on pointerdown, and pick the item under the pointer on pointerup. Radix’s DropdownMenu and Base UI’s Menu do both; a hand-rolled onClick menu does neither.',
};

// ── #77 Skeletons match the final layout exactly ───────────────────────────
// Quarry's activity feed and its refresh. Each refresh is a real request to the showcase's /api/activity, its reply
// held 0.9s as plumber holds a page's replies (said on the marks). Broken: a generic skeleton, a thin bar per row, so
// the rows land taller and everything under the feed jumps, the link you were reaching for included. Fixed: the
// skeleton is the rows' own shape (a mark, two lines), so nothing moves when they land.
// plumber's rule (craft-headless skeletonMatch) compares the skeleton's box while the page waited with the box of what
// landed. The marks are that: the box it promised (a dashed ghost), what it grew by (hatch, a tag), and what below
// moved, with your pointer if it was on it. No ruler: how long it took isn't the lesson.
const HOLD = 900;
const initials = (what) => what.split(' ')[0].slice(0, 2).toUpperCase();
function SkeletonLand({ side = 'broken', onStatus }) {
  const root = useRef(null), list = useRef(null), more = useRef(null), hand = useRef(null);
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rec, setRec] = useState(null); // { before: { box, n, link }, after: { box, n, link }, hand }
  const pending = useRef(null);
  const [held, setHeld] = useState(null); // the skeleton's box, as read while the reply is held
  const fixed = side === 'fixed';
  const at = () => local(root.current);
  const inside = (p, r) => p && r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  useEffect(() => { fetch('/api/activity').then((r) => r.json()).then(setItems); }, []);
  // the skeleton is read while it shows, as plumber reads it while the reply is held
  useLayoutEffect(() => {
    if (!loading) return;
    pending.current = { before: { box: at()(list.current), n: list.current.children.length, link: at()(more.current) } };
    setHeld(pending.current.before.box);
    let gone = false;
    Promise.all([fetch('/api/activity').then((r) => r.json()), new Promise((r) => setTimeout(r, HOLD))]).then(([body]) => {
      if (gone) return;
      // the pointer, the moment before the rows land: was it on the link?
      pending.current.hand = inside(hand.current, at()(more.current)) ? hand.current : null;
      setItems(body); setLoading(false);
    });
    return () => { gone = true; };
  }, [loading]);
  // and what landed, the frame it lands
  useLayoutEffect(() => {
    if (loading || !pending.current) return;
    const p = pending.current; pending.current = null;
    setRec({ ...p, after: { box: at()(list.current), n: list.current.children.length, link: at()(more.current) } });
  }, [loading, items]);
  const track = (e) => { const o = root.current.getBoundingClientRect(), k = o.width / root.current.offsetWidth || 1; hand.current = { x: (e.clientX - o.left) / k, y: (e.clientY - o.top) / k }; };

  const grew = rec ? rec.after.box.h - rec.before.box.h : 0, off = Math.abs(grew) > 4; // the rule's line (craft-spec: 4px)
  const moved = rec ? rec.after.link.y - rec.before.link.y : 0;
  useEffect(() => {
    onStatus?.(loading ? 'Loading. Now reach for View all activity, under the feed.'
      : !rec ? 'Press Refresh, then reach for View all activity while it loads.'
      : off ? `It landed ${Math.round(grew)}px taller than its skeleton, so View all activity dropped ${Math.round(moved)}px${rec.hand ? ', out from under your pointer' : ''}.`
      : `It landed in the skeleton’s own shape: the same ${rec.after.n} rows, the same height. Nothing under it moved${rec.hand ? ', and your pointer is still on the link' : ''}.`);
  }, [loading, rec, onStatus]);

  const row = 'flex items-center gap-3 px-5';
  return (
    <div ref={root} onPointerMove={track} className="relative w-[26rem] max-w-full">
      <article className="rounded-card bg-surface shadow-card">
        <header className="flex items-center gap-2 px-5 pt-4 pb-2">
          <HistoryIcon size={16} texture="dither" className="text-ink-muted" />
          <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Activity</span>
          <button type="button" onClick={() => !loading && (setRec(null), setLoading(true))}
            className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-control pr-2.5 pl-2 text-[13px] font-medium text-ink-muted ring-1 ring-line ring-inset hover:bg-sunken hover:text-ink">
            <RetryIcon size={14} texture="solid" />Refresh
          </button>
        </header>
        <ul ref={list} aria-busy={loading || !items} className="py-1">
          {loading || !items
            ? [0, 1, 2].map((i) => fixed ? (
              // the rows' own shape: the mark, the line, the time under it
              <li key={i} className={row + ' h-14'}><span className="size-8 shrink-0 animate-pulse rounded-full bg-sunken" /><span className="flex flex-1 flex-col gap-1.5"><span className="h-3 w-3/4 animate-pulse rounded-chip bg-sunken" /><span className="h-2.5 w-16 animate-pulse rounded-chip bg-sunken" /></span></li>
            ) : (
              // a generic skeleton: one thin bar a row
              <li key={i} className={row + ' h-8'}><span className="h-3 w-full animate-pulse rounded-chip bg-sunken" /></li>
            ))
            : items.map((a) => (
              <li key={a.id} className={row + ' h-14'}>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sunken text-[11px] font-medium text-ink-muted ring-1 ring-line ring-inset">{initials(a.what)}</span>
                <span className="min-w-0"><span className="block truncate text-[13px]">{a.what}</span><span className="block text-[12px] text-ink-subtle">{a.when}</span></span>
              </li>
            ))}
        </ul>
        <footer className="border-t-hairline border-line px-5 py-3">
          <a ref={more} href="#activity" onClick={(e) => e.preventDefault()} className="inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">View all activity</a>
        </footer>
      </article>
      <MarksLayer>
        {loading && held ? (
          // plumber measuring the skeleton while the reply is held
          <>
            <span style={{ position: 'absolute', left: held.x, top: held.y, width: held.w, height: held.h, border: '1px dashed var(--pl-sky)', borderRadius: 4, opacity: 0.8 }} />
            <span style={{ position: 'absolute', left: held.x + held.w + 10, top: held.y + 10, transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', height: 20, padding: '0 var(--pl-space-3)', borderRadius: 'var(--pl-radius-tag)', font: '500 11px/1 var(--pl-mono)', color: 'var(--pl-on-accent)', background: 'var(--pl-sky)', boxShadow: '0 0 0 1px var(--pl-halo)', whiteSpace: 'nowrap' }}>reply held 0.9s</span>
          </>
        ) : null}
        {rec ? (
          <>
            <Ghost {...rec.before.box} r={4} off={off} />
            {off ? <Hatch x={rec.before.box.x} y={rec.before.box.y + rec.before.box.h} w={rec.before.box.w} h={grew} /> : null}
            <Tag x={rec.after.box.x + rec.after.box.w + 10} y={rec.before.box.y + rec.before.box.h + grew / 2} off={off}>{off ? `+${Math.round(grew)}px · ${rec.before.n} → ${rec.after.n} rows` : `0px · ${rec.after.n} rows ✓`}</Tag>
            {off && moved ? <Outline {...rec.before.link} off r={4} /> : null}
            {rec.hand ? <Contact {...rec.hand} /> : null}
          </>
        ) : null}
      </MarksLayer>
    </div>
  );
}
SkeletonLand.names = ['A generic skeleton', 'The rows’ own shape'];
SkeletonLand.lesson = {
  why: 'A skeleton promises the shape of what’s coming. A generic one, a thin bar a row, promises less than lands: the rows arrive taller and everything under them jumps, often just as you reach for it.',
  habit: 'Draw the skeleton from the loaded row itself: the same height, the same number of rows, the same mark and lines. Then landing changes what’s in the boxes, not where they are.',
};

// ── #66 Spinners: wait ~150–300ms, then hold ≥ ~500ms ──────────────────────
// A bank feed's Sync now. Each press is a real request to the showcase's /api (about 120ms), or held 1.4s, as plumber
// holds a reply to see a slow one: the viewer picks which, and the control says it's held. Broken: the spinner shows
// on the press and goes with the reply, so a fast reply blinks it. Fixed: spin-delay's habit, shown only after 200ms
// and then kept at least 500ms, so a fast reply shows none and a slow one a steady one.
// plumber's rule (craft-headless spinnerTiming, craft-spec 'spinner-timing') reads when the spinner showed after the
// press and how long a fast reply kept it. Time is the lesson, so the marks are the ruler: the reply on one lane, the
// spinner on the other, the rule's 200ms line on it.
const SPIN = { delay: 200, min: 500 }, SLOW = 1400, PRESS = 150;
function SpinnerTiming({ side = 'broken', onStatus }) {
  const root = useRef(null), sheet = useRef(null), button = useRef(null);
  const [reply, setReply] = useState('fast');
  const [run, setRun] = useState(null); // { t0, replied, on, off }
  const [spinning, setSpinning] = useState(false);
  const [synced, setSynced] = useState('2 min ago');
  const fixed = side === 'fixed';
  useTicking(!!run && (run.replied === null || (run.on !== null && run.off === null)));
  const now = () => performance.now();
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (ms, fn) => timers.current.push(setTimeout(fn, ms));
  const cur = useRef(null); // this press: its start, and when its spinner showed
  const show = (t0) => { if (cur.current?.t0 !== t0) return; cur.current.on = now() - t0; setSpinning(true); setRun((r) => (r && r.t0 === t0 ? { ...r, on: cur.current.on } : r)); };
  const hide = (t0) => { setSpinning(false); setRun((r) => (r && r.t0 === t0 && r.on !== null ? { ...r, off: now() - t0 } : r)); };
  const sync = async () => {
    if (run && run.replied === null) return;
    timers.current.forEach(clearTimeout); timers.current = [];
    const t0 = now();
    cur.current = { t0, on: null };
    setRun({ t0, replied: null, on: null, off: null, reply });
    if (!fixed) show(t0); else later(SPIN.delay, () => show(t0));
    await Promise.all([fetch('/api/sync').then((r) => r.json()), new Promise((r) => setTimeout(r, reply === 'slow' ? SLOW : 0))]);
    const replied = now() - t0;
    setRun((r) => (r && r.t0 === t0 ? { ...r, replied } : r));
    setSynced('just now');
    if (!fixed) hide(t0);
    else {
      timers.current.forEach(clearTimeout); timers.current = [];
      // shown already: keep it its 500ms; never shown: it never will be
      const on = cur.current?.t0 === t0 ? cur.current.on : null;
      if (on !== null) later(Math.max(0, on + SPIN.min - replied), () => hide(t0));
    }
  };
  const flashed = run && run.on !== null && run.off !== null && run.off - run.on < SPIN.delay;
  const early = run && run.on !== null && run.on < PRESS;
  // the rule's two findings: shown under 150ms after the press (on any reply), or blinked off a fast one
  const off = !!(flashed || early);
  useEffect(() => {
    if (!run) return onStatus?.(`Press Sync now. The reply comes ${reply === 'fast' ? 'as fast as it does (about 120ms)' : 'held 1.4s'}: try both.`);
    if (run.replied === null) return onStatus?.(run.on === null ? 'Waiting for the reply…' : 'Syncing…');
    const ms = Math.round(run.replied);
    onStatus?.(fixed
      ? (run.on === null ? `The reply came in ${ms}ms, before the spinner was due: none showed, nothing blinked.` : `It waited 200ms, then stayed ${Math.round((run.off ?? now() - run.t0) - run.on)}ms: steady, not a blink.`)
      : (flashed ? `The spinner showed on the press and was gone ${Math.round(run.off - run.on)}ms later: a blink, for a reply that took ${ms}ms.` : `On a slow reply it spun the whole ${ms}ms; on a fast one the same spinner only blinks.`));
  }, [run, reply, onStatus, fixed]);

  const card = sheet.current ? { w: sheet.current.offsetWidth, h: sheet.current.offsetHeight } : null;
  const span = 1600, t = run ? Math.min(span, run.off !== null && run.replied !== null ? Math.max(run.off, run.replied) : run.replied !== null && run.on === null ? run.replied : now() - run.t0) : 0;
  const lane = (top, label, a, b, kind) => {
    const x = (ms) => (Math.min(span, ms) / span) * (card?.w ?? 0);
    return (
      <div style={{ position: 'absolute', left: 0, top, width: card?.w ?? 0, height: 14 }}>
        <span style={{ position: 'absolute', right: '100%', marginRight: 8, top: 0, font: '500 10.5px/14px var(--pl-sans)', color: 'var(--pl-ink-2)', whiteSpace: 'nowrap' }}>{label}</span>
        <span style={{ position: 'absolute', left: 0, right: 0, top: 6, borderTop: '1px dashed var(--pl-ink-3)' }} />
        {a !== null ? <span style={{ position: 'absolute', left: x(a), top: 4, height: 5, width: Math.max(2, x(b ?? t) - x(a)), borderRadius: 3, background: kind === 'off' ? 'var(--pl-off)' : kind === 'on' ? 'var(--pl-on)' : 'var(--pl-sky)' }} /> : null}
      </div>
    );
  };
  return (
    <div ref={root} className="relative w-[26rem] max-w-full pb-28">
      <article ref={sheet} className="rounded-card bg-surface shadow-card">
        <div className="flex items-center gap-3 px-5 py-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-control bg-accent-soft text-[12px] font-semibold text-accent-deep">NB</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-medium">Northfield Bank</span>
            <span className="block text-[12px] text-ink-subtle">Business current •••• 4821 · Synced {synced}</span>
          </span>
          <button ref={button} type="button" onClick={sync}
            className="inline-flex h-8 w-[7.5rem] items-center justify-center gap-1.5 rounded-control text-[13px] font-medium text-ink-muted ring-1 ring-line ring-inset hover:bg-sunken hover:text-ink">
            {spinning ? <span role="status" aria-label="Syncing" className="size-3.5 animate-spin rounded-full border-[1.5px] border-ink/20 border-t-ink-muted" /> : <RetryIcon size={14} texture="solid" />}
            {spinning ? 'Syncing' : 'Sync now'}
          </button>
        </div>
      </article>
      <div className="mt-3 flex items-center gap-2 text-[12px] text-ink-subtle">
        Reply
        <span role="group" aria-label="Reply" className="flex rounded-control bg-sunken p-0.5 ring-1 ring-line">
          {[['fast', 'as it comes'], ['slow', 'held 1.4s']].map(([k, label]) => (
            <button key={k} type="button" aria-pressed={reply === k} onClick={() => setReply(k)}
              className={'rounded-[5px] px-2 py-0.5 ' + (reply === k ? 'bg-surface text-ink shadow-raised' : 'hover:text-ink')}>{label}</button>
          ))}
        </span>
      </div>
      <MarksLayer>
        {card ? (
          <div style={{ position: 'absolute', left: 0, top: card.h + 62, width: card.w }}>
            <div style={{ position: 'relative', marginLeft: 0 }}>
              {lane(0, 'reply', run ? 0 : null, run?.replied ?? null, '')}
              {lane(18, 'spinner', run?.on ?? null, run?.off ?? null, run?.on !== null && run ? (off ? 'off' : run.off !== null || run.replied !== null ? 'on' : '') : '')}
              {/* the rule's line: a spinner is due no sooner than 200ms after the press */}
              <span style={{ position: 'absolute', left: (SPIN.delay / span) * card.w, top: -4, height: 40, borderLeft: '1px dashed var(--pl-sky)', opacity: 0.7 }} />
              <span style={{ position: 'absolute', left: (SPIN.delay / span) * card.w + 4, top: -6, font: '500 10px/12px var(--pl-mono)', color: 'var(--pl-sky)' }}>200</span>
              <div style={{ position: 'absolute', left: 0, top: 30 }}>
                <Ruler top={0} width={card.w} span={span} played={t} kind={!run || run.replied === null ? '' : off ? 'off' : 'on'}
                  events={run ? [[0, ''], ...(run.replied !== null ? [[run.replied, '']] : [])] : []} label={run?.reply === 'slow' ? 'reply held' : 'live'} />
              </div>
            </div>
          </div>
        ) : null}
        {run && run.replied !== null && button.current && root.current ? (() => {
          const b = local(root.current)(button.current), ms = (v) => Math.round(v);
          const text = flashed ? `flashed ${ms(run.off - run.on)}ms` : early ? `${ms(run.on)}ms after the press` : run.on === null ? `no spinner · ${ms(run.replied)}ms ✓` : fixed ? `after 200 · held ${ms((run.off ?? now() - run.t0) - run.on)}ms ✓` : `${ms(run.on)}ms after the press`;
          // above the button, clear of the account's words
          return <Tag end x={b.x + b.w} y={b.y - 26} off={off}>{text}</Tag>;
        })() : null}
      </MarksLayer>
    </div>
  );
}
SpinnerTiming.names = ['Spinner at once', 'After 200ms, for 500ms'];
SpinnerTiming.lesson = {
  why: 'A spinner shown on the press and hidden on the reply blinks whenever the reply is quick: a flash of “something’s wrong” for a wait nobody would have noticed. Most replies are quick, so most presses blink.',
  habit: 'Wait about 200ms before showing a spinner, and once it shows, keep it at least 500ms (spin-delay’s delay and minDuration). A fast reply shows none; a slow one shows a steady one.',
};

// ── #60 Tooltip warm-up and cool-down ────────────────────────────────────
// A writing app's formatting toolbar, every button with a tooltip. Broken: tooltips that show the moment the pointer
// arrives, the hand-rolled habit plumber's probe calls "quick": sweep along the toolbar and each one flashes up and
// vanishes. Fixed: plumber's numbers, a provider's (Radix's delayDuration 500, skipDelayDuration 300): the first waits
// half a second, and while you keep moving the next ones come at once.
// The marks are the waits, the numbers the rule reads (craft-headless.js tooltipKind): the wait filling under the button
// while it waits, a dashed ghost where a tooltip only flashed (on screen under 250ms), and one tag with the last wait.
// No trail: the route isn't the lesson.
const FIRST = 500, WARM = 300, QUICK = 200, FLASH = 250;
const TOOLS = [
  ['B', 'Bold', '⌘B', 'font-semibold'], ['I', 'Italic', '⌘I', 'italic font-serif'], ['U', 'Underline', '⌘U', 'underline underline-offset-2'], ['S', 'Strikethrough', '⇧⌘X', 'line-through'], null,
  [CodeIcon, 'Code', '⌘E'], [FileIcon, 'Attach a file', ''], [ChartIcon, 'Insert a chart', ''], [SparklesIcon, 'Ask AI', '⌘J'],
];
function TooltipWarm({ side = 'broken', onStatus }) {
  const root = useRef(null), tip = useRef(null);
  const tt = useRef({ timer: 0, lastClose: -Infinity });
  const [open, setOpen] = useState(null);      // { i, box } of the tooltip on screen
  const [visits, setVisits] = useState([]);   // { i, t, shown, gone, next, box }
  const fixed = side === 'fixed';
  const btns = () => [...(root.current?.querySelectorAll('[data-tool]') ?? [])];
  const now = () => performance.now();
  const waiting = visits.length > 0 && visits.at(-1).shown === null && visits.at(-1).gone === null;
  useTicking(waiting);
  useEffect(() => () => clearTimeout(tt.current.timer), []);

  const enter = (i) => {
    const t = now(), warm = t - tt.current.lastClose < WARM;
    setVisits((v) => [...v.slice(-24), { i, t, shown: null, gone: null, next: warm, box: null }]);
    clearTimeout(tt.current.timer);
    const wait = fixed ? (warm ? 0 : FIRST) : 0;
    const show = () => {
      const b = btns()[i], at = local(root.current)(b);
      setOpen({ i, at });
      setVisits((v) => v.map((x, j) => (j === v.length - 1 && x.i === i && x.shown === null ? { ...x, shown: now() } : x)));
    };
    if (wait) tt.current.timer = setTimeout(show, wait); else show();
  };
  const leave = () => {
    clearTimeout(tt.current.timer);
    setOpen((o) => { if (o) tt.current.lastClose = now(); return null; });
    setVisits((v) => v.map((x, j) => (j === v.length - 1 && x.gone === null ? { ...x, gone: now(), box: x.box ?? (tip.current && root.current ? local(root.current)(tip.current) : null) } : x)));
  };
  // the tooltip's own box, once it's on screen (the ghost of a flash is drawn there)
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
  const tagText = (v) => { const w = Math.round(v.shown - v.t); return !fixed ? `${w}ms · no warm-up` : v.next ? `${w}ms · warm ✓` : `${w}ms · warm-up`; };
  return (
    <article ref={root} onPointerLeave={leave} className="relative w-[30rem] max-w-full rounded-card bg-surface shadow-card">
      <div role="toolbar" aria-label="Formatting" className="flex items-center gap-0.5 border-b-hairline border-line px-3 py-2">
        {TOOLS.map((tool, i) => {
          if (!tool) return <span key={'sep' + i} className="mx-1.5 h-4 w-px bg-line" />;
          const [Glyph, label] = tool, at = TOOLS.slice(0, i).filter(Boolean).length;
          return (
            <button key={label} type="button" data-tool aria-label={label} onPointerEnter={() => enter(at)} onPointerLeave={leave}
              className="grid size-8 place-items-center rounded-control text-[15px] text-ink-muted hover:bg-sunken hover:text-ink">
              {typeof Glyph === 'string' ? <span className={tool[3]}>{Glyph}</span> : <Glyph size={16} texture="dither" />}
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-2 px-5 pt-4 pb-6 text-sm leading-6">
        <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Launch notes</span>
        <p className="text-ink-muted text-pretty">The film goes out on Thursday at nine. Press gets the link an hour before; the pricing page flips at the same time.</p>
      </div>
      {open ? (() => {
        const tool = TOOLS.filter(Boolean)[open.i];
        return (
          <span ref={tip} role="tooltip" style={{ left: open.at.x + open.at.w / 2, top: open.at.y + open.at.h + 6 }}
            className="pointer-events-none absolute z-10 flex -translate-x-1/2 items-center gap-2 rounded-control bg-ink px-2 py-1 text-xs whitespace-nowrap text-surface">
            {tool[1]}{tool[2] ? <kbd className="font-sans text-surface/60">{tool[2]}</kbd> : null}
          </span>
        );
      })() : null}
      <MarksLayer>
        {!fixed ? flashed.slice(-6).map((v, j) => <Ghost key={j} {...v.box} r={6} />) : null}
        {cur && waiting && fixed ? (() => {
          const b = local(root.current)(btns()[cur.i]), k = Math.min(1, (t - cur.t) / FIRST);
          return <span style={{ position: 'absolute', left: b.x + 4, top: b.y + b.h + 1, width: (b.w - 8) * k, height: 2, borderRadius: 1, background: 'var(--pl-sky)' }} />;
        })() : null}
        {last && last.box ? <Tag x={last.box.x + last.box.w + 8} y={last.box.y + last.box.h / 2} off={kind(last) === 'off'}>{tagText(last)}</Tag> : null}
      </MarksLayer>
    </article>
  );
}
TooltipWarm.names = ['At once', 'Warm-up'];
TooltipWarm.lesson = {
  why: 'A tooltip that shows the moment the pointer arrives fires for everything you cross on the way somewhere else: sweep along a toolbar and they flash up and vanish, each one gone before you could read it.',
  habit: 'Wait about half a second for the first, the pause that means someone stopped to look; then, while they keep moving, show the next ones at once (Radix: delayDuration 500, skipDelayDuration 300).',
};

// ── #64 Interruptible motion ────────────────────────────────────────────
// A shared folder with a Details panel that slides in from the right. Broken: the entrance and the exit are two
// keyframe animations (tailwindcss-animate's slide-in / slide-out): close it on the way in and the exit starts from its
// own first frame, fully open, so the panel snaps out to the edge before it leaves. Fixed: one transition on the
// panel's position, which the browser turns around from wherever it is.
// plumber's toggle probe (src/craft-probe.ts) does what you do: opens, closes at 40%, and reads the panel every frame.
// The marks are that reading: where the edge was when you changed your mind, the ground it snapped across (hatch, a
// dashed ghost of the edge), and the openness over time as a trace, where a snap is a cliff. Slowed to ¼ so a hand
// can catch it.
const PANEL_W = 224, BASE_MS = 320;
const FOLDER = [
  ['Launch plan.pdf', 'Ama Owusu', 'Today'], ['Pricing, v4.sheet', 'Jonas Berg', 'Yesterday'], ['Press kit.zip', 'Lena Ruiz', 'Mon'],
  ['Keynote draft.deck', 'Ama Owusu', 'Mon'], ['FAQ.doc', 'Sam Patel', '12 Sep'],
];
function InterruptPanel({ side = 'broken', onStatus }) {
  const root = useRef(null), card = useRef(null), panel = useRef(null);
  const keyframes = side === 'broken';
  const [slow, setSlow] = useState(true);
  const [run, setRun] = useState(null); // { samples: [{ t, v }], presses: [{ t, v }], done }
  const open = useRef(false), live = useRef(null);
  const dur = BASE_MS * (slow ? 4 : 1);
  useTicking(!!run && !run.done);
  // the panel's openness, read from where it is on screen: 0 tucked away, 1 all the way in
  const openness = () => {
    const p = panel.current, c = card.current;
    if (!p || !c || p.hidden) return 0;
    const at = local(c);
    return Math.max(0, Math.min(1, (c.offsetWidth - at(p).x) / PANEL_W));
  };
  const reset = () => {
    open.current = false; live.current = null; setRun(null);
    const p = panel.current; if (p) { p.hidden = true; p.classList.remove('ho-in', 'ho-out', 'ho-open'); }
  };
  useEffect(reset, [side, slow]);
  const toggle = () => {
    const p = panel.current, t0 = performance.now(), v = openness();
    if (!live.current || live.current.done) live.current = { t0, samples: [{ t: 0, v }], presses: [], done: false, quiet: t0 };
    live.current.presses.push({ t: t0 - live.current.t0, v });
    open.current = !open.current;
    if (keyframes) {
      // two animations: the exit replaces the entrance and starts from its own first frame
      if (open.current) { p.hidden = false; p.classList.remove('ho-out'); p.classList.add('ho-in'); }
      else { p.classList.remove('ho-in'); p.classList.add('ho-out'); }
    } else {
      // one transition: a new target, from wherever it is
      p.hidden = false; p.getBoundingClientRect();
      p.classList.toggle('ho-open', open.current);
    }
  };
  // plumber's reading: every frame, until the panel has rested for 400ms
  useEffect(() => {
    let id;
    const tick = () => {
      const r = live.current;
      if (r && !r.done) {
        const now = performance.now(), v = openness(), last = r.samples.at(-1);
        r.samples.push({ t: now - r.t0, v });
        if (Math.abs(v - last.v) > 0.001) r.quiet = now;
        if (now - r.quiet > 400 || now - r.t0 > dur * 3) r.done = true;
        setRun({ samples: [...r.samples], presses: [...r.presses], done: r.done });
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [dur]);
  const ended = (e) => { if (!open.current && (e.animationName === 'ho-panel-out' || e.type === 'transitionend')) { panel.current.hidden = true; panel.current.classList.remove('ho-out'); } };

  // a step of over 20% within a frame or two of a press mid-motion is a snap; a press mid-motion without one, a turn
  const snaps = [], turns = [];
  if (run) {
    const s = run.samples;
    for (let i = 1; i < s.length; i++) if (Math.abs(s[i].v - s[i - 1].v) > 0.2 && run.presses.some((q, k) => k > 0 && s[i].t - q.t >= 0 && s[i].t - q.t < 60)) snaps.push({ from: s[i - 1], to: s[i] });
    run.presses.forEach((q, k) => { if (k > 0 && q.v > 0.02 && q.v < 0.98 && !snaps.some((j) => Math.abs(j.from.t - q.t) < 60)) turns.push(q); });
  }
  const snap = snaps.at(-1), turn = turns.at(-1), pct = (v) => `${Math.round(v * 100)}%`;
  useEffect(() => {
    onStatus?.(!run ? `Open Details, then click it again while the panel is still sliding in${slow ? '' : ' (¼× gives you time)'}.`
      : snap ? `You closed it at ${pct(snap.from.v)}; the exit started from its own first frame, so the panel snapped to ${pct(snap.to.v)} before leaving.`
      : turn ? `It turned around at ${pct(turn.v)}, from where it was. Nothing snapped.`
      : run.presses.length === 1 && !run.done ? 'Now click again before it settles.' : 'Click again while it’s moving.');
  }, [run?.presses.length, !!snap, !!turn, run?.done, slow, onStatus]);

  // the marks, in the card's pixels: the edge at a given openness
  const W = card.current?.offsetWidth ?? 576, H = card.current?.offsetHeight ?? 288, edge = (v) => W - PANEL_W * v, top = 48;
  const TW = W, TH = 52, span = dur * 3, tx = (t) => (Math.min(span, t) / span) * TW, ty = (v) => 8 + TH - v * TH;
  return (
    <div ref={root} className="relative w-[36rem] max-w-full pb-28">
      <style>{`@keyframes ho-panel-in { from { translate: 100% 0 } to { translate: 0 0 } } @keyframes ho-panel-out { from { translate: 0 0 } to { translate: 100% 0 } }
        .ho-panel { translate: 100% 0; } .ho-panel.ho-in { animation: ho-panel-in ${dur}ms var(--ease-arrive) both; } .ho-panel.ho-out { animation: ho-panel-out ${dur}ms var(--ease-arrive) both; }
        .ho-t .ho-panel { transition: translate ${dur}ms var(--ease-arrive); } .ho-t .ho-panel.ho-open { translate: 0 0; }`}</style>
      <article ref={card} className={'relative h-72 overflow-hidden rounded-card bg-surface shadow-card ' + (keyframes ? '' : 'ho-t')}>
        <header className="flex h-12 items-center gap-2 border-b-hairline border-line px-4">
          <FolderIcon size={16} texture="dither" className="text-ink-muted" />
          <span className="text-[15px] font-medium">Q3 launch</span><span className="text-[13px] text-ink-subtle">· 5 files</span>
          <button type="button" aria-expanded={open.current} onClick={toggle} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-control px-2.5 text-[13px] font-medium ring-1 ring-line ring-inset hover:bg-sunken">
            <SlidersIcon size={14} texture="dither" className="text-ink-muted" />Details
          </button>
        </header>
        <ul className="px-2 py-1.5">
          {FOLDER.map(([name, who, when], i) => (
            <li key={name} className={'flex h-9 items-center gap-3 rounded-control px-2.5 text-[13px] ' + (i === 0 ? 'bg-accent-soft' : '')}>
              <FileIcon size={14} texture="dither" className="shrink-0 text-ink-muted" /><span className="min-w-0 flex-1 truncate">{name}</span>
              <span className="w-24 truncate text-ink-muted">{who}</span><span className="w-16 text-right text-ink-subtle">{when}</span>
            </li>
          ))}
        </ul>
        <aside ref={panel} hidden onAnimationEnd={ended} onTransitionEnd={ended} className="ho-panel absolute top-12 right-0 bottom-0 flex w-56 flex-col gap-3 border-l-hairline border-line bg-surface p-4">
          <span className="grid h-20 place-items-center rounded-control bg-sunken ring-1 ring-line ring-inset"><FileIcon size={28} texture="dither" className="text-ink-muted" /></span>
          <span className="text-[13px] font-medium">Launch plan.pdf</span>
          <dl className="grid grid-cols-[4.5rem_1fr] gap-x-2 gap-y-1.5 text-xs"><dt className="text-ink-subtle">Kind</dt><dd className="text-ink-muted">PDF, 18 pages</dd><dt className="text-ink-subtle">Size</dt><dd className="text-ink-muted">4.8 MB</dd><dt className="text-ink-subtle">Owner</dt><dd className="text-ink-muted">Ama Owusu</dd><dt className="text-ink-subtle">Modified</dt><dd className="text-ink-muted">Today, 9:41</dd></dl>
        </aside>
      </article>
      <div className="absolute right-0 bottom-0 flex items-center gap-2 text-[12px] text-ink-muted">
        Speed
        <span role="group" aria-label="Speed" className="flex gap-0.5 rounded-control bg-sunken p-0.5 ring-1 ring-line">
          {[[true, '¼×'], [false, '1×']].map(([v, l]) => <button key={l} type="button" aria-pressed={slow === v} onClick={() => setSlow(v)} className={'h-6 rounded-[5px] px-2 ' + (slow === v ? 'bg-surface text-ink shadow-raised' : 'hover:text-ink')}>{l}</button>)}
        </span>
      </div>
      <MarksLayer>
        {snaps.map((j, i) => {
          const a = edge(j.from.v), b = edge(j.to.v);
          return (
            <span key={i}>
              <Hatch x={Math.min(a, b)} y={top + 6} w={Math.abs(a - b)} h={H - top - 12} />
              <Line x={a} y={top} h={H - top} off dashed />
            </span>
          );
        })}
        {turns.map((q, i) => <Line key={'t' + i} x={edge(q.v)} y={top} h={H - top} off={false} />)}
        {snap ? <Tag x={Math.min(edge(snap.from.v), edge(snap.to.v)) - 8} y={top + 30} off end>jumped {pct(snap.from.v)} → {pct(snap.to.v)}</Tag>
          : turn ? <Tag x={edge(turn.v) - 8} y={top + 30} off={false} end>turned back at {pct(turn.v)} ✓</Tag> : null}
        {/* openness over time, as plumber samples it: a snap is a cliff */}
        <svg width={TW} height={TH + 26} style={{ position: 'absolute', left: 0, top: H + 14, overflow: 'visible' }}>
          <line x1="0" y1={ty(1)} x2={TW} y2={ty(1)} style={{ stroke: 'var(--pl-ink-3)', strokeDasharray: '2 3' }} />
          <text x="0" y={ty(1) - 4} style={{ font: '600 10.5px var(--pl-sans)', fill: 'var(--pl-ink-2)' }}>open</text>
          <text x={TW} y={ty(1) - 4} textAnchor="end" style={{ font: '600 10.5px var(--pl-sans)', fill: 'var(--pl-ink-2)' }}>{slow ? '¼ speed' : 'live'}</text>
          <line x1="0" y1={ty(0)} x2={TW} y2={ty(0)} style={{ stroke: 'var(--pl-ink-3)' }} />
          {run ? <polyline points={run.samples.map((q) => `${tx(q.t).toFixed(1)},${ty(q.v).toFixed(1)}`).join(' ')} style={{ fill: 'none', stroke: 'var(--pl-sky)', strokeWidth: 1.5, strokeLinejoin: 'round' }} /> : null}
          {snaps.map((j, i) => <line key={i} x1={tx(j.from.t)} y1={ty(j.from.v)} x2={tx(j.to.t)} y2={ty(j.to.v)} style={{ stroke: 'var(--pl-off)', strokeWidth: 2.5 }} />)}
          {run?.presses.map((q, i) => <circle key={i} cx={tx(q.t)} cy={ty(q.v)} r={i && turns.includes(q) ? 4 : 3} style={{ fill: i && turns.includes(q) ? 'var(--pl-on)' : '#fff', stroke: i && turns.includes(q) ? '#fff' : 'var(--pl-sky)', strokeWidth: 1.5 }} />)}
        </svg>
      </MarksLayer>
    </div>
  );
}
InterruptPanel.names = ['Keyframes', 'Transition'];
InterruptPanel.lesson = {
  why: 'An entrance and an exit written as two keyframe animations don’t know about each other. Change your mind halfway in and the exit starts from its own first frame, fully open: the panel snaps to the edge, then leaves.',
  habit: 'Drive open and closed with one transition on the state (or a spring), so a close midway turns around from where it is.',
};

// ── #65 Rubber-band at the limits ───────────────────────────────────────
// A maps app's place sheet, fully open. Pull it up past its top edge. Broken: its offset clamped at the limit, so the
// sheet stops dead under a hand that keeps going. Fixed: past the limit it follows less and less (the classic
// (1 − 1 / (x·0.55 / d + 1))·d), and springs back when you let go.
// plumber's drag probe (src/craft-probe.ts, opt-in) pulls 40, 80, 120px past and reads how far the thing came:
// 'dead' under 3px more. The marks are that reading: the limit, where you pressed, how far your hand went past, and what
// the sheet gave (mint) or didn't (a coral wall). No trail and no ruler: the pull is the lesson, not the route or the time.
const SHEET_D = 190, BAND_C = 0.55;
const rubber = (x) => (1 - 1 / ((x * BAND_C) / SHEET_D + 1)) * SHEET_D;
function PlaceSheet({ side = 'broken', onStatus }) {
  const phone = useRef(null), sheet = useRef(null);
  const elastic = side === 'fixed';
  const [g, setG] = useState(null); // { contact, pull, gave, peak, live, hand }
  const off = useRef(0), spring = useRef(null);
  const place = () => { if (sheet.current) sheet.current.style.translate = `0 ${off.current}px`; };
  useEffect(() => { setG(null); off.current = 0; spring.current = null; place(); }, [side]);
  const at = (e) => { const r = phone.current.getBoundingClientRect(), k = r.width / phone.current.offsetWidth || 1; return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k }; };
  const down = (e) => {
    try { sheet.current.setPointerCapture(e.pointerId); } catch {}
    spring.current = null; off.current = 0; place();
    const p = at(e);
    setG({ contact: p, hand: p, pull: 0, gave: 0, peak: { pull: 0, gave: 0, hand: p }, live: true });
  };
  const move = (e) => {
    setG((s) => {
      if (!s?.live) return s;
      const p = at(e), dy = p.y - s.contact.y;
      off.current = dy >= 0 ? dy : elastic ? -rubber(-dy) : 0; place();
      const pull = Math.max(0, -dy), gave = Math.max(0, -off.current);
      return { ...s, hand: p, pull, gave, peak: pull > s.peak.pull ? { pull, gave, hand: p } : s.peak };
    });
  };
  const up = () => {
    setG((s) => (s?.live ? { ...s, live: false } : s));
    if (off.current !== 0) spring.current = { v: 0 };
  };
  // the spring back: stiffness 400, damping 32, per frame
  useEffect(() => {
    let id, last = performance.now();
    const step = (now) => {
      const dt = Math.min(0.032, (now - last) / 1000); last = now;
      const sp = spring.current;
      if (sp) { sp.v += (-400 * off.current - 32 * sp.v) * dt; off.current += sp.v * dt; if (Math.abs(off.current) < 0.3 && Math.abs(sp.v) < 4) { off.current = 0; spring.current = null; } place(); }
      id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, []);
  const m = g ? (g.live ? g : g.peak) : null;
  useEffect(() => {
    onStatus?.(!m ? 'Grab the sheet and pull it up, past its top edge.'
      : m.pull === 0 ? (g.live ? 'Keep going up, past the dashed line: that’s as open as it gets.' : 'You let go before the line. Pull it up past it.')
      : !elastic ? `Your hand went ${Math.round(m.pull)}px past the end and the sheet didn’t move at all: a wall under your finger.`
      : `It gave ${Math.round(m.gave)}px for your ${Math.round(m.pull)}px, less the further you pulled${g.live ? '' : ', then sprang back'}.`);
  }, [m?.pull, m?.gave, g?.live, elastic, onStatus]);

  const REST = 128, limit = REST, L = 10, R = 290;
  const reach = m ? Math.max(2, limit - m.pull) : limit, top = m ? limit - m.gave : limit, hand = g ? (g.live ? g.hand : g.peak.hand) : null;
  return (
    <div className="relative w-[38rem] max-w-full">
      <div ref={phone} className="relative mx-auto h-[22rem] w-[300px] touch-none overflow-hidden rounded-[28px] bg-ink shadow-card select-none" onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up}>
        <img src={valley} alt="" draggable="false" className="absolute inset-0 size-full object-cover" />
        <span className="absolute top-14 left-1/2 grid size-8 -translate-x-1/2 place-items-center rounded-full bg-accent text-[11px] font-medium text-accent-ink shadow-raised ring-2 ring-white">M</span>
        <div ref={sheet} onPointerDown={down} className="absolute inset-x-0 h-[20rem] cursor-grab rounded-t-[18px] bg-surface px-4 pt-2 active:cursor-grabbing" style={{ top: REST }}>
          <span className="mx-auto mb-3 block h-1 w-9 rounded-full bg-line" />
          <span className="block text-[15px] font-medium tracking-[-0.01em]">Café Mona</span>
          <span className="block text-[13px] text-ink-muted">Coffee · 6 min walk · Open until 18:00</span>
          <span className="mt-3 flex gap-2">
            <span className="inline-flex h-8 items-center rounded-control bg-accent px-3 text-[13px] font-medium text-accent-ink">Directions</span>
            <span className="inline-flex h-8 items-center rounded-control px-3 text-[13px] font-medium ring-1 ring-line ring-inset">Save</span>
          </span>
          <span className="mt-4 block text-[13px] text-ink-muted text-pretty">Small, bright, by the river. Busiest before nine; quiet after two.</span>
        </div>
      </div>
      <MarksLayer>
        <div style={{ position: 'absolute', left: '50%', top: 0, width: 300, height: '100%', transform: 'translateX(-50%)' }}>
          <span style={{ position: 'absolute', left: -12, right: -12, top: limit, borderTop: '1px dashed var(--pl-ink-3)' }} />
          {m && m.pull > 0 ? (!elastic ? (
            <span style={{ position: 'absolute', left: L, width: R - L, top: reach, height: limit - reach }}><Hatch x={0} y={0} w={R - L} h={limit - reach} /><Outline x={0} y={0} w={R - L} h={limit - reach} off r={8} /></span>
          ) : (
            <>
              <Ghost x={L} y={reach} w={R - L} h={top - reach} r={8} off={false} />
              {/* what it gave, measured at the sheet's edge (a bracket, so it doesn't cover the words) */}
              <span style={{ position: 'absolute', left: R + 6, top, width: 0, height: limit - top, borderLeft: '2px solid var(--pl-on)' }} />
              <span style={{ position: 'absolute', left: R + 2, top, width: 10, height: 0, borderTop: '2px solid var(--pl-on)' }} />
              <span style={{ position: 'absolute', left: R + 2, top: limit - 1, width: 10, height: 0, borderTop: '2px solid var(--pl-on)' }} />
            </>
          )) : null}
          {g ? <Contact x={g.contact.x} y={g.contact.y} /> : null}
          {hand && m && m.pull > 0 ? <span style={{ position: 'absolute', left: hand.x - 5, top: hand.y - 5, width: 10, height: 10, borderRadius: '50%', background: hue(!elastic), boxShadow: '0 0 0 1.5px #fff' }} /> : null}
          {m && m.pull > 0 ? <Tag x={R + 22} y={(reach + limit) / 2} off={!elastic}>{!elastic ? `0 of ${Math.round(m.pull)}px · dead` : `gave ${Math.round(m.gave)} of ${Math.round(m.pull)}px`}</Tag> : null}
        </div>
      </MarksLayer>
    </div>
  );
}
PlaceSheet.names = ['Clamped', 'Rubber-band'];
PlaceSheet.lesson = {
  why: 'A sheet clamped at its limit stops dead under a finger that keeps going: the hand moves, the thing doesn’t, and it feels broken or stuck rather than finished.',
  habit: 'Past a limit, follow the pointer less and less (x = limit + over × a falling factor), then spring back on release. Vaul and Motion’s dragElastic do it for you.',
};

// ── #68 Exits faster than entrances ─────────────────────────────────────
// A calendar's event preview. Broken: one transition both ways, 300ms in and 300ms out (the same duration-300 for both
// states). Fixed: plumber's fix, data-[state=closed]:duration-200: the close takes its own, shorter time.
// The marks are the two durations as the browser ran them (transitionrun → transitionend on the popover): two bars to
// one scale, the exit's coral when it's no quicker than the entrance. Slowed to ¼ so the difference can be felt.
function ExitFaster({ side = 'broken', onStatus }) {
  const pop = useRef(null);
  const [open, setOpen] = useState(false), [slow, setSlow] = useState(true);
  const [ran, setRan] = useState({ in: null, out: null }); // measured ms, at 1×
  const started = useRef(null);
  const k = slow ? 4 : 1, enter = 300 * k, exit = (side === 'fixed' ? 200 : 300) * k;
  useEffect(() => { setOpen(false); setRan({ in: null, out: null }); }, [side, slow]);
  // timed from the browser's own transition events on the popover (not from our state: what ran, not what we asked)
  const openNow = useRef(open); openNow.current = open;
  useEffect(() => {
    const el = pop.current;
    const run = (e) => { if (e.target === el && e.propertyName === 'opacity') started.current = { t: performance.now(), open: openNow.current }; };
    const end = (e) => {
      if (e.target !== el || e.propertyName !== 'opacity' || !started.current) return;
      const ms = (performance.now() - started.current.t) / k, which = started.current.open ? 'in' : 'out';
      started.current = null;
      setRan((r) => ({ ...r, [which]: ms }));
    };
    el.addEventListener('transitionrun', run); el.addEventListener('transitionend', end);
    return () => { el.removeEventListener('transitionrun', run); el.removeEventListener('transitionend', end); };
  }, [k]);
  useEffect(() => {
    onStatus?.(ran.in === null ? 'Open the event, then close it: click it, or Close.'
      : ran.out === null ? `It came in over ${Math.round(ran.in)}ms. Now close it, and feel how long it stays.`
      : side === 'broken' ? `${Math.round(ran.in)}ms in, ${Math.round(ran.out)}ms out: you’d already decided to close it, and it lingered just as long.`
      : `${Math.round(ran.in)}ms in, ${Math.round(ran.out)}ms out: it leaves as quickly as you moved on.`);
  }, [ran.in, ran.out, side, onStatus]);
  const x = (ms) => (ms / 300) * 220, off = ran.out !== null && ran.in !== null && ran.out > ran.in * 0.8;
  return (
    <div className="relative w-[30rem] max-w-full pb-24">
      <article className="relative h-[19rem] rounded-card bg-surface shadow-card">
        <header className="flex items-baseline justify-between px-5 pt-4 pb-3">
          <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Thursday</span>
          <span className="text-[13px] text-ink-muted">6 November</span>
        </header>
        <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="mx-5 flex w-[calc(100%-2.5rem)] items-baseline gap-3 rounded-control bg-accent-soft px-3 py-2 text-left hover:bg-accent/15">
          <span className="text-[13px] text-accent-deep tabular-nums">9:00</span><span className="text-sm font-medium text-accent-deep">Design crit</span>
        </button>
        <div ref={pop} role="dialog" aria-label="Design crit" data-state={open ? 'open' : 'closed'}
          style={{ transitionDuration: `${open ? enter : exit}ms` }}
          className="absolute top-[6.5rem] left-10 flex w-64 origin-top-left flex-col gap-3 rounded-card bg-surface p-4 shadow-popover transition-[opacity,scale] ease-arrive data-[state=closed]:pointer-events-none data-[state=closed]:scale-95 data-[state=closed]:opacity-0">
          <span className="flex flex-col gap-1"><span className="text-[15px] font-medium">Design crit</span><span className="text-[13px] text-ink-muted tabular-nums">9:00 – 9:30 · Studio 2</span></span>
          <span className="text-[13px] text-pretty text-ink-muted">Bring the onboarding flows. We’ll go through the empty states first.</span>
          <span className="flex gap-2">
            <span className="inline-flex h-8 items-center rounded-control bg-accent px-3 text-[13px] font-medium text-accent-ink">Join</span>
            <button type="button" onClick={() => setOpen(false)} className="h-8 rounded-control px-3 text-[13px] font-medium ring-1 ring-line ring-inset hover:bg-sunken">Close</button>
          </span>
        </div>
      </article>
      <div className="absolute right-0 bottom-0 flex items-center gap-2 text-[12px] text-ink-muted">
        Speed
        <span role="group" aria-label="Speed" className="flex gap-0.5 rounded-control bg-sunken p-0.5 ring-1 ring-line">
          {[[true, '¼×'], [false, '1×']].map(([v, l]) => <button key={l} type="button" aria-pressed={slow === v} onClick={() => setSlow(v)} className={'h-6 rounded-[5px] px-2 ' + (slow === v ? 'bg-surface text-ink shadow-raised' : 'hover:text-ink')}>{l}</button>)}
        </span>
      </div>
      <MarksLayer>
        {/* the two durations, measured, to one scale */}
        <div style={{ position: 'absolute', left: 0, top: 'calc(19rem + 14px)', width: '100%' }}>
          {[['in', ran.in, 'var(--pl-sky)'], ['out', ran.out, off ? 'var(--pl-off)' : 'var(--pl-on)']].map(([label, ms, col], i) => (
            <span key={label} style={{ position: 'absolute', left: 0, top: i * 18, display: 'flex', alignItems: 'center', gap: 8, font: '600 10.5px/14px var(--pl-sans)', color: 'var(--pl-ink-2)' }}>
              <span style={{ width: 22 }}>{label}</span>
              <span style={{ height: 6, width: ms === null ? 0 : x(ms), borderRadius: 3, background: col, transition: 'width 200ms var(--pl-ease-out)' }} />
              {ms !== null ? <span style={{ font: '500 11px var(--pl-mono)', color: 'var(--pl-ink-2)' }}>{Math.round(ms)}ms</span> : null}
            </span>
          ))}
          {ran.out !== null && ran.in !== null ? <Tag x={30 + x(Math.max(ran.in, ran.out)) + 64} y={25} off={off}>{off ? 'no quicker out' : 'out ⅔ of in ✓'}</Tag> : null}
        </div>
      </MarksLayer>
    </div>
  );
}
ExitFaster.names = ['Same both ways', 'Faster out'];
ExitFaster.lesson = {
  why: 'Opening and closing aren’t the same moment. Coming in, 300ms reads as the popover arriving. Going out, you’ve already decided, and the same 300ms keeps it in front of what you want to do next: it feels slow to leave.',
  habit: 'Give the exit its own, shorter duration: about 70% of the entrance (data-[state=closed]:duration-200 against a 300 in).',
};

// ── #63 Never scale from 0 ──────────────────────────────────────────────
// A docs editor's Insert menu, opened from the + beside an empty line, with its entrance written as a transition from
// its starting style. Broken: starting:scale-0, so it grows out of a point. Fixed: plumber's fix, starting:scale-95.
// The marks are the menu's real outline as it came in, sampled from the page every frame and drawn as onion skins at
// moments of the entrance (its first painted frame, a quarter, half): from 0 the first is a speck; from 95% it's nearly
// the menu from the first frame. Slowed to ¼ so a hand can follow it.
const INSERTS = [['Heading', FileIcon], ['Table', LayersIcon], ['Chart', ChartIcon], ['Code block', CodeIcon]];
function ScaleFromZero({ side = 'broken', onStatus }) {
  const root = useRef(null), menu = useRef(null);
  const [open, setOpen] = useState(false), [slow, setSlow] = useState(true);
  const [skins, setSkins] = useState([]); // { p, box } at fixed fractions of the entrance
  const k = slow ? 4 : 1, dur = 200 * k, from = side === 'fixed' ? 0.95 : 0;
  useEffect(() => { setOpen(false); setSkins([]); }, [side, slow]);
  // sample the real menu every frame of its entrance, keep the frames nearest each fraction
  useEffect(() => {
    if (!open) return;
    let id; const t0 = performance.now(), at = local(root.current), seen = [];
    const tick = (now) => {
      if (menu.current) seen.push({ p: (now - t0) / dur, box: at(menu.current) });
      if (now - t0 < dur + 50) id = requestAnimationFrame(tick);
      // the first frame it was painted at all, then a quarter and half way in
      else { const near = (f) => seen.reduce((a, b) => (Math.abs(b.p - f) < Math.abs(a.p - f) ? b : a), seen[0]); setSkins([seen.find((q) => q.box.w > 1), near(0.25), near(0.5)].filter(Boolean)); }
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [open, dur]);
  const full = menu.current && root.current && open ? local(root.current)(menu.current) : null;
  const first = skins[0], share = first && full ? Math.round((first.box.w / full.w) * 100) : null;
  useEffect(() => {
    onStatus?.(!skins.length ? 'Click + to open the Insert menu, and watch the first frames.'
      : side === 'broken' ? `Its first frame was ${share}% of its size: a speck by the +, growing out of nowhere, not a menu opening.`
      : `Its first frame was already ${share}% of its size: it opens from the +, it doesn’t inflate.`);
  }, [skins.length, share, side, onStatus]);
  const off = side === 'broken';
  return (
    <div ref={root} className="relative w-[30rem] max-w-full pb-10">
      <style>{`.ho-insert { transition: scale ${dur}ms var(--ease-arrive), opacity ${dur}ms var(--ease-arrive); } @starting-style { .ho-insert { scale: ${from}; opacity: 0; } }`}</style>
      <article className="relative h-[19rem] rounded-card bg-surface px-6 pt-5 shadow-card">
        <span className="text-[22px] leading-7 font-medium tracking-[-0.015em]">Offsite plan</span>
        <p className="pt-2 text-sm leading-relaxed text-ink-muted">Two days in Lisbon, the second week of March. The budget covers travel, rooms and one team dinner.</p>
        <span className="flex items-center gap-2 pt-3">
          <button type="button" aria-label="Insert" aria-expanded={open} onClick={() => { setSkins([]); setOpen((o) => !o); }} className="grid size-6 place-items-center rounded-chip text-ink-muted ring-1 ring-line ring-inset hover:bg-sunken"><PlusIcon size={14} texture="solid" /></button>
          <span className="text-sm text-ink-subtle">Type / for blocks</span>
        </span>
        {open ? (
          <div ref={menu} role="menu" className="ho-insert absolute top-[10.25rem] left-6 flex w-48 origin-top-left flex-col rounded-card bg-surface p-1 shadow-popover">
            {INSERTS.map(([label, Icon]) => <span key={label} role="menuitem" className="flex h-8 items-center gap-2.5 rounded-control px-2 text-[13px] hover:bg-sunken"><Icon size={14} texture="dither" className="text-ink-muted" />{label}</span>)}
          </div>
        ) : null}
      </article>
      <div className="absolute right-0 bottom-0 flex items-center gap-2 text-[12px] text-ink-muted">
        Speed
        <span role="group" aria-label="Speed" className="flex gap-0.5 rounded-control bg-sunken p-0.5 ring-1 ring-line">
          {[[true, '¼×'], [false, '1×']].map(([v, l]) => <button key={l} type="button" aria-pressed={slow === v} onClick={() => setSlow(v)} className={'h-6 rounded-[5px] px-2 ' + (slow === v ? 'bg-surface text-ink shadow-raised' : 'hover:text-ink')}>{l}</button>)}
        </span>
      </div>
      <MarksLayer>
        {skins.map((sk, i) => <Ghost key={i} {...sk.box} r={10} off={off} />)}
        {skins.map((sk, i) => <span key={'l' + i} style={{ position: 'absolute', left: sk.box.x + sk.box.w + 4, top: sk.box.y + sk.box.h - 6, font: '500 10px var(--pl-mono)', color: 'var(--pl-ink-2)' }}>{['1st', '¼', '½'][i]}</span>)}
        {full && first ? <Tag x={full.x + full.w + 14} y={full.y + 14} off={off}>{off ? `1st frame ${share}% · from 0` : `1st frame ${share}% ✓`}</Tag> : null}
      </MarksLayer>
    </div>
  );
}
ScaleFromZero.names = ['From 0', 'From 95%'];
ScaleFromZero.lesson = {
  why: 'Something that grows from scale 0 starts as a point: for its first frames it’s a speck, then a smear of tiny words. Nothing real grows out of nothing, so it reads as appearing from nowhere instead of opening from the button that asked for it.',
  habit: 'Start entrances at 0.9–0.97 with opacity 0, with transform-origin at the trigger. It opens; it doesn’t inflate.',
};

export const HANDS_ON = { 42: BoldHover, 60: TooltipWarm, 63: ScaleFromZero, 61: MenuPress, 64: InterruptPanel, 65: PlaceSheet, 68: ExitFaster, 77: SkeletonLand, 66: SpinnerTiming };
